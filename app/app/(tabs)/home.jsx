import { useEffect, useReducer, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { apiCreateMoodEntry, apiChatRespond } from '../../services/api';
import { MOODS } from '../../constants/moods';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import {
  crearConversacion,
  reducer,
  quickRepliesDe,
} from '../../features/emociones/conversacion';
import { ETIQUETAS } from '../../features/emociones/guiones';
import { useCrisisShield } from '../../features/emociones/useCrisisShield';
import { useRetry } from '../../features/emociones/useRetry';
import { RUTA_WELLNESS } from '../../features/wellness/paraMi';
import ChatBubble from '../../components/chat/ChatBubble';
import QuickReplies from '../../components/chat/QuickReplies';
import TypingIndicator from '../../components/chat/TypingIndicator';
import ChatInputBar from '../../components/chat/ChatInputBar';
import FallbackMessage from '../../components/chat/FallbackMessage';
import useAutoScroll from '../../components/chat/useAutoScroll';

// Pausa de "escribiendo" antes de cada burbuja del bot: apenas por encima de
// durations.gentle (380 ms) — presencia sin latencia fingida.
const TYPING_MS = 450;

export default function HomeScreen() {
  const { theme } = useTheme();
  const styles = useStyles();

  const [conv, dispatch] = useReducer(reducer, undefined, () => crearConversacion());
  // Revelado escalonado: cuántos mensajes del stream ya se muestran.
  const [visibles, setVisibles] = useState(0);
  const [escribiendo, setEscribiendo] = useState(false);
  const { ref, onScroll, onContentSizeChange, scrollToEnd } = useAutoScroll();
  const escudo = useCrisisShield();
  const { ejecutar, reset: resetRetry } = useRetry();
  const tabBarHeight = useBottomTabBarHeight();

  // Revela los mensajes de a uno: los del usuario al instante, los del bot
  // tras una pausa breve de "escribiendo".
  useEffect(() => {
    if (visibles > conv.mensajes.length) {
      // La conversación se reinició: parte de cero.
      setVisibles(0);
      return undefined;
    }
    if (visibles === conv.mensajes.length) {
      setEscribiendo(false);
      return undefined;
    }
    const siguiente = conv.mensajes[visibles];
    if (siguiente.autor === 'usuario') {
      setVisibles((v) => v + 1);
      return undefined;
    }
    setEscribiendo(true);
    const timer = setTimeout(() => {
      setEscribiendo(false);
      setVisibles((v) => v + 1);
    }, TYPING_MS);
    return () => clearTimeout(timer);
  }, [visibles, conv.mensajes.length]);

  // Turno en vuelo hacia la IA. El escudo de crisis ya corrió en onEnviar:
  // a esta fase solo llegan textos sin señales de crisis. useRetry reintenta
  // con backoff y NUNCA lanza; un 200 con fuente:"plantilla" es éxito.
  useEffect(() => {
    if (conv.fase !== 'esperandoIA') return undefined;
    let cancelado = false;
    const { texto, historial } = conv.pendienteIA;
    // En charla extendida (registro ya creado) viaja continuar: true — el
    // backend no fuerza el cierre por conteo (CONTRATO-GEMINI.md §1).
    ejecutar(() => apiChatRespond(conv.mood, texto, historial, conv.registrada)).then((r) => {
      if (cancelado) return;
      if (r.ok) {
        dispatch({
          tipo: 'IA_RESPONDIO',
          respuesta: r.valor.respuesta,
          terminar: r.valor.terminar === true,
        });
      } else {
        dispatch({ tipo: 'IA_FALLO' });
      }
    });
    return () => {
      cancelado = true;
    };
  }, [conv.fase]);

  // Al terminar la conversación se crea el (único) MoodEntry, con el texto
  // libre acumulado como nota. Si el usuario abandona antes, no se registra.
  useEffect(() => {
    if (conv.fase !== 'creandoEntrada') return undefined;
    let cancelado = false;
    apiCreateMoodEntry(conv.mood, conv.notas.join('\n') || null)
      .then((data) => {
        if (cancelado) return;
        if (data.moodEntry && data.actividadSugerida) {
          dispatch({
            tipo: 'ENTRADA_CREADA',
            moodEntryId: data.moodEntry.id,
            actividad: data.actividadSugerida,
          });
        } else {
          dispatch({ tipo: 'ENTRADA_FALLO' });
        }
      })
      .catch(() => {
        if (!cancelado) dispatch({ tipo: 'ENTRADA_FALLO' });
      });
    return () => {
      cancelado = true;
    };
  }, [conv.fase]);

  // El turno es del usuario solo cuando el bot terminó de "hablar".
  const turnoUsuario = visibles === conv.mensajes.length && !escribiendo;

  const qr = quickRepliesDe(conv);
  let chips = null;
  if (turnoUsuario && qr) {
    if (qr.tipo === 'moods') {
      chips = MOODS.map((m) => ({
        id: m.value,
        label: m.label,
        emoji: m.emoji,
        tint: theme.colors.moods[m.value],
      }));
    } else if (qr.tipo === 'iaFallo') {
      chips = [{ id: 'seguirSinIA', label: ETIQUETAS.seguirSinConexion }];
    } else if (qr.tipo === 'reintentar') {
      chips = [{ id: 'reintentar', label: ETIQUETAS.reintentar }];
    } else if (qr.tipo === 'charla') {
      // Disponibles pero no obligatorios: el usuario también puede seguir
      // escribiendo en la barra (charla extendida, Fase 9).
      chips = [
        { id: 'verSugerencia', label: ETIQUETAS.verSugerencia },
        { id: 'reiniciar', label: ETIQUETAS.reiniciar },
      ];
    }
  }

  const onChip = (id) => {
    scrollToEnd();
    if (qr.tipo === 'moods') dispatch({ tipo: 'ELEGIR_MOOD', mood: id });
    else if (id === 'seguirSinIA') dispatch({ tipo: 'SEGUIR_SIN_IA' });
    else if (qr.tipo === 'reintentar') dispatch({ tipo: 'REINTENTAR_ENTRADA' });
    else if (id === 'verSugerencia') {
      // Solo navega: la conversación queda abierta y sigue al volver del Hub.
      router.push(RUTA_WELLNESS);
    } else if (id === 'reiniciar') {
      escudo.reset();
      resetRetry();
      dispatch({ tipo: 'REINICIAR' });
    }
  };

  // El escudo corre SIEMPRE antes de la API (CONTRATO-GEMINI.md §2.1): con
  // omitirIA el reducer responde por plantilla local sin pasar por
  // 'esperandoIA', y el texto nunca sale del dispositivo.
  const onEnviar = (texto) => {
    const { omitirIA, mensajeCrisis } = escudo.evaluar(texto);
    dispatch({ tipo: 'ENVIAR_TEXTO_IA', texto, omitirIA, mensajeCrisis });
    scrollToEnd();
  };

  // La barra vive fija desde que hay emoción elegida (continuidad visual del
  // chat) y se apaga cuando el turno no es del usuario o la fase no acepta
  // texto (esperandoIA, iaFallo, creandoEntrada, errorEntrada).
  const mostrarInput = conv.fase !== 'saludo';
  const inputHabilitado =
    turnoUsuario && (conv.fase === 'conversando' || conv.fase === 'charla');

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={ref}
        contentContainerStyle={styles.chat}
        onScroll={onScroll}
        scrollEventThrottle={32}
        onContentSizeChange={onContentSizeChange}
        keyboardShouldPersistTaps="handled"
      >
        {conv.mensajes.slice(0, visibles).map((mensaje) => (
          <ChatBubble
            key={mensaje.id}
            autor={mensaje.autor}
            tipo={mensaje.tipo}
            texto={mensaje.texto}
            mood={conv.mood}
          />
        ))}

        {(escribiendo || conv.fase === 'esperandoIA') && <TypingIndicator />}
        {turnoUsuario && conv.fase === 'iaFallo' && (
          <FallbackMessage onReintentar={() => dispatch({ tipo: 'IA_REINTENTAR' })} />
        )}
        {chips && <QuickReplies items={chips} onSelect={onChip} />}
      </ScrollView>

      {mostrarInput && (
        <ChatInputBar
          onSend={onEnviar}
          placeholder={ETIQUETAS.placeholderTextoLibre}
          disabled={!inputHabilitado}
          bottomOffset={tabBarHeight}
        />
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  chat: {
    padding: 16,
    paddingTop: 18,
    paddingBottom: 28,
    flexGrow: 1,
  },
}));
