import { useEffect, useReducer, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { apiCreateMoodEntry, apiNextSuggestion, apiGetCheers } from '../../services/api';
import { MOODS } from '../../constants/moods';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import {
  crearConversacion,
  reducer,
  pasoActual,
  quickRepliesDe,
} from '../../features/emociones/conversacion';
import { ETIQUETAS } from '../../features/emociones/guiones';
import Tappable from '../../components/Tappable';
import Entrance from '../../components/Entrance';
import ChatBubble from '../../components/chat/ChatBubble';
import QuickReplies from '../../components/chat/QuickReplies';
import TypingIndicator from '../../components/chat/TypingIndicator';
import ChatInput from '../../components/chat/ChatInput';
import ActivitySuggestionCard from '../../components/chat/ActivitySuggestionCard';

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
  const [loadingOtra, setLoadingOtra] = useState(false);
  const scrollRef = useRef(null);

  const [cheers, setCheers] = useState([]);
  const [cheerIdx, setCheerIdx] = useState(0);
  const [showCheerModal, setShowCheerModal] = useState(false);

  useEffect(() => {
    apiGetCheers()
      .then((data) => {
        if (data.cheers && data.cheers.length > 0) {
          setCheers(data.cheers);
          setCheerIdx(0);
          setShowCheerModal(true);
        }
      })
      .catch(() => {});
  }, []);

  const cerrarCheerModal = () => {
    if (cheerIdx < cheers.length - 1) {
      setCheerIdx((i) => i + 1);
    } else {
      setShowCheerModal(false);
    }
  };

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

  const handleOtraIdea = async () => {
    if (!conv.moodEntryId) return;
    setLoadingOtra(true);
    try {
      const data = await apiNextSuggestion(conv.moodEntryId);
      if (data.activity) dispatch({ tipo: 'NUEVA_ACTIVIDAD', actividad: data.activity });
    } catch {
      // falla silenciosamente: se conserva la actividad actual
    } finally {
      setLoadingOtra(false);
    }
  };

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
    } else if (qr.tipo === 'guion') {
      chips = qr.replies.map((r) => ({ id: r.id, label: r.label }));
    } else if (qr.tipo === 'reintentar') {
      chips = [{ id: 'reintentar', label: ETIQUETAS.reintentar }];
    } else if (qr.tipo === 'reiniciar') {
      chips = [{ id: 'reiniciar', label: ETIQUETAS.reiniciar }];
    }
  }

  const onChip = (id) => {
    if (qr.tipo === 'moods') dispatch({ tipo: 'ELEGIR_MOOD', mood: id });
    else if (qr.tipo === 'guion') dispatch({ tipo: 'QUICK_REPLY', replyId: id });
    else if (qr.tipo === 'reintentar') dispatch({ tipo: 'REINTENTAR_ENTRADA' });
    else if (qr.tipo === 'reiniciar') dispatch({ tipo: 'REINICIAR' });
  };

  const paso = pasoActual(conv);
  const mostrarInput = turnoUsuario && !!paso?.textoLibre;
  const cheerActual = cheers[cheerIdx];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Modal visible={showCheerModal} transparent animationType="none">
        <Entrance distance={0} style={styles.cheerOverlay}>
          <Entrance distance={20} style={styles.cheerBox}>
            <Text style={styles.cheerTitle}>Tienes un mensaje</Text>
            {cheerActual && (
              <View>
                <Text style={styles.cheerFrom}>{cheerActual.fromNombre} te envio:</Text>
                <Text style={styles.cheerMsg}>{cheerActual.message}</Text>
              </View>
            )}
            {cheers.length > 1 && (
              <Text style={styles.cheerCount}>{cheerIdx + 1} / {cheers.length}</Text>
            )}
            <Tappable style={styles.cheerBtn} onPress={cerrarCheerModal}>
              <Text style={styles.cheerBtnText}>
                {cheerIdx < cheers.length - 1 ? 'Siguiente' : 'Gracias'}
              </Text>
            </Tappable>
          </Entrance>
        </Entrance>
      </Modal>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.chat}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {conv.mensajes.slice(0, visibles).map((mensaje) => {
          if (mensaje.tipo === 'actividad') {
            if (!conv.actividad) return null;
            return (
              <ActivitySuggestionCard
                key={mensaje.id}
                actividad={conv.actividad}
                onOtraIdea={handleOtraIdea}
                onAceptar={() => dispatch({ tipo: 'ACEPTAR_ACTIVIDAD' })}
                loadingOtra={loadingOtra}
              />
            );
          }
          return (
            <ChatBubble
              key={mensaje.id}
              autor={mensaje.autor}
              tipo={mensaje.tipo}
              texto={mensaje.texto}
              mood={conv.mood}
            />
          );
        })}

        {escribiendo && <TypingIndicator />}
        {chips && <QuickReplies items={chips} onSelect={onChip} />}
      </ScrollView>

      {mostrarInput && (
        <ChatInput
          onSend={(texto) => dispatch({ tipo: 'TEXTO_LIBRE', texto })}
          placeholder={ETIQUETAS.placeholderTextoLibre}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const useStyles = makeThemedStyles((t) => ({
  chat: {
    padding: 16,
    paddingTop: 18,
    paddingBottom: 28,
    flexGrow: 1,
  },
  cheerOverlay: {
    flex: 1,
    backgroundColor: t.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  cheerBox: {
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.shape.radiusXl,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    ...t.shadows.modal,
  },
  cheerTitle: {
    ...t.typography.type.title,
    color: t.colors.text,
    marginBottom: 16,
  },
  cheerFrom: {
    fontSize: t.fontSize(13),
    color: t.colors.textMuted,
    marginBottom: 10,
    textAlign: 'center',
  },
  cheerMsg: {
    fontSize: t.fontSize(22),
    textAlign: 'center',
    color: t.colors.text,
    marginBottom: 20,
    lineHeight: Math.round(t.fontSize(22) * 1.45),
  },
  cheerCount: {
    ...t.typography.type.caption,
    color: t.colors.textFaint,
    marginBottom: 12,
  },
  cheerBtn: {
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 13,
    paddingHorizontal: 32,
  },
  cheerBtnText: {
    color: t.colors.onPrimary,
    ...t.typography.fonts.bold,
    fontSize: t.fontSize(15),
  },
}));
