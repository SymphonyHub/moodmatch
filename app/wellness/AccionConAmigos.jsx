import { useEffect, useState } from 'react';
import { View, Text, Modal, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import AccionSocialCard from '../components/wellness/AccionSocialCard';
import SelectorAmigoModal from '../components/friends/SelectorAmigoModal';
import { apiGetFriendships, apiSendMessage } from '../services/api';
import { MOOD_INFO } from '../constants/moods';
import { useTheme, makeThemedStyles } from '../theme/ThemeContext';
import Tappable from '../components/Tappable';
import {
  tipoDeActividadSocial,
  elegirSugerencia,
  MENSAJES_PRECARGA,
} from '../friends/accionesConAmigos';
import { crearInvitacion } from '../friends/invitacionSalida';
import {
  claveCompletadaSocial,
  estaCompletada,
  marcarCompletada,
} from '../features/wellness/completadas';

/**
 * AccionConAmigos — SLOT del Agente C en la pestaña "Con amigos" (Fase 10).
 *
 * ConAmigosPanel monta una instancia por cada acción fija y por la sugerencia
 * dinámica. Las acciones conocidas conservan su interacción; una sugerencia
 * nueva queda como tarjeta informativa que igualmente puede marcarse hecha.
 * Cada acción se identifica por `actividad.nombre` (mapeo en [accionesConAmigos]);
 * un nombre desconocido cae en tarjeta informativa (sin onPress), como antes.
 *
 *   - "Salida con amigos"          → elegir amigo → enviar invitación al chat
 *                                     (Aceptar/Rechazar los pinta el chat).
 *   - "Escribe a alguien que aprecias" → elegir amigo → abrir su chat con un
 *                                     mensaje cálido precargado (editable).
 *   - "Comparte tu energía positiva"   → sugerir al amigo con ánimo difícil ya
 *                                     visible → abrir su chat con mensaje cálido.
 *
 * GUARDRAIL DE PRIVACIDAD (no negociable): la sugerencia solo usa `moodReciente`,
 * el chip de ánimo que cada amigo YA comparte y que hoy se ve en la lista de
 * amigos. No infiere ni expone ningún dato nuevo. (Ver elegirSugerencia.)
 *
 * @param {{ id, nombre, descripcion, categoria }} actividad
 */
export default function AccionConAmigos({ actividad }) {
  const styles = useStyles();
  const tipo = tipoDeActividadSocial(actividad);

  // Estado del selector de amigo (salida / aprecias / "elegir otro" de energía)
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  // Estado de la sugerencia de energía positiva
  const [energia, setEnergia] = useState(null); // null | 'cargando' | { amigos, sugerido }
  const [completada, setCompletada] = useState(false);
  const claveActividad = claveCompletadaSocial(actividad?.id);

  useEffect(() => {
    let activo = true;
    setCompletada(false);
    if (!claveActividad) {
      return () => {
        activo = false;
      };
    }
    estaCompletada(claveActividad).then((valor) => {
      // Si se tocó "La hice" mientras AsyncStorage respondía, nunca revertir
      // el estado optimista de true a un valor viejo false.
      if (activo) setCompletada((actual) => actual || valor);
    });
    return () => {
      activo = false;
    };
  }, [claveActividad]);

  const completar = async () => {
    if (!claveActividad) return;
    setCompletada(true);
    await marcarCompletada(claveActividad);
  };

  const abrirChat = (amigo, draft) => {
    const params = { friendId: String(amigo.id), nombre: amigo.nombre };
    if (amigo.moodReciente) params.mood = amigo.moodReciente;
    if (draft) params.draft = draft;
    router.push({ pathname: '/chat/[friendId]', params });
  };

  // --- Salida con amigos -------------------------------------------------
  const enviarInvitacion = async (amigo) => {
    setSelectorAbierto(false);
    try {
      const data = await apiSendMessage(amigo.id, crearInvitacion());
      if (!data.mensaje) throw new Error(data.error || 'No se pudo enviar');
      abrirChat(amigo);
    } catch {
      Alert.alert(
        'No se pudo enviar la invitación',
        'Revisa tu conexión e intenta de nuevo.',
      );
    }
  };

  // --- Escribe a alguien que aprecias ------------------------------------
  const escribirAprecio = (amigo) => {
    setSelectorAbierto(false);
    abrirChat(amigo, MENSAJES_PRECARGA.aprecias);
  };

  // --- Comparte tu energía positiva --------------------------------------
  const abrirEnergia = async () => {
    setEnergia('cargando');
    try {
      const data = await apiGetFriendships();
      const amigos = data.amigos ?? [];
      setEnergia({ amigos, sugerido: elegirSugerencia(amigos) });
    } catch {
      setEnergia({ amigos: [], sugerido: null });
    }
  };

  const escribirEnergia = (amigo) => {
    setEnergia(null);
    abrirChat(amigo, MENSAJES_PRECARGA.energia(amigo.nombre));
  };

  // Fallback informativo para nombres desconocidos (sin interacción)
  if (!tipo) {
    return (
      <AccionSocialCard
        actividad={actividad}
        completada={completada}
        onCompletar={completar}
      />
    );
  }

  const onPress =
    tipo === 'energia' ? abrirEnergia : () => setSelectorAbierto(true);

  const seleccionar = tipo === 'salida' ? enviarInvitacion : escribirAprecio;

  return (
    <>
      <AccionSocialCard
        actividad={actividad}
        onPress={onPress}
        completada={completada}
        onCompletar={completar}
      />

      {tipo !== 'energia' && (
        <SelectorAmigoModal
          visible={selectorAbierto}
          titulo={actividad.nombre}
          onSelect={seleccionar}
          onClose={() => setSelectorAbierto(false)}
        />
      )}

      {tipo === 'energia' && (
        <ModalEnergia
          estado={energia}
          styles={styles}
          onCerrar={() => setEnergia(null)}
          onEscribir={escribirEnergia}
        />
      )}
    </>
  );
}

// Modal de "Comparte tu energía positiva": muestra al amigo sugerido (ánimo
// difícil ya visible) con opción de escribirle o elegir otro; el selector
// reusa la lista ya cargada.
function ModalEnergia({ estado, styles, onCerrar, onEscribir }) {
  const { theme } = useTheme();
  const [selectorAbierto, setSelectorAbierto] = useState(false);

  const cargando = estado === 'cargando';
  const abierto = estado !== null;
  const sugerido = estado && estado !== 'cargando' ? estado.sugerido : null;
  const amigos = estado && estado !== 'cargando' ? estado.amigos : null;
  const mood = sugerido?.moodReciente ? MOOD_INFO[sugerido.moodReciente] : null;

  const cerrarTodo = () => {
    setSelectorAbierto(false);
    onCerrar();
  };

  return (
    <Modal visible={abierto} animationType="fade" transparent onRequestClose={cerrarTodo}>
      <View style={styles.backdrop}>
        {cargando ? (
          <View style={styles.tarjeta}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : selectorAbierto ? null : (
          <View style={styles.tarjeta}>
            {sugerido ? (
              <>
                <Text style={styles.emoji}>🌤️</Text>
                <Text style={styles.titulo}>Alégrale el día a {sugerido.nombre}</Text>
                <Text style={styles.cuerpo}>
                  {sugerido.nombre} registró que se siente{' '}
                  <Text style={styles.moodTxt}>{mood ? mood.label.toLowerCase() : 'bajo'}</Text>.
                  Un mensaje tuyo puede cambiarle el día.
                </Text>
                <Tappable style={styles.btnPrimario} onPress={() => onEscribir(sugerido)}>
                  <Text style={styles.btnPrimarioTxt}>Escribirle a {sugerido.nombre}</Text>
                </Tappable>
                <Tappable style={styles.btnSecundario} onPress={() => setSelectorAbierto(true)} haptic={false}>
                  <Text style={styles.btnSecundarioTxt}>Elegir a otra persona</Text>
                </Tappable>
              </>
            ) : (
              <>
                <Text style={styles.emoji}>💛</Text>
                <Text style={styles.titulo}>Comparte tu energía</Text>
                <Text style={styles.cuerpo}>
                  Tus amigos parecen estar bien. De todas formas, ¿a quién te gustaría
                  escribirle algo lindo hoy?
                </Text>
                <Tappable style={styles.btnPrimario} onPress={() => setSelectorAbierto(true)}>
                  <Text style={styles.btnPrimarioTxt}>Elegir un amigo</Text>
                </Tappable>
              </>
            )}
            <Tappable style={styles.btnTexto} onPress={cerrarTodo} haptic={false}>
              <Text style={styles.btnTextoTxt}>Ahora no</Text>
            </Tappable>
          </View>
        )}

        <SelectorAmigoModal
          visible={selectorAbierto}
          titulo="Comparte tu energía positiva"
          amigos={amigos ?? undefined}
          onSelect={onEscribir}
          onClose={cerrarTodo}
        />
      </View>
    </Modal>
  );
}

const useStyles = makeThemedStyles((t) => ({
  backdrop: {
    flex: 1,
    backgroundColor: t.colors.scrim ?? 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 28,
  },
  tarjeta: {
    backgroundColor: t.colors.background,
    borderRadius: t.shape.radiusXl,
    padding: 24,
    alignItems: 'center',
  },
  emoji: { fontSize: 42, marginBottom: 10 },
  titulo: {
    ...t.typography.type.section,
    color: t.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  cuerpo: {
    fontSize: t.fontSize(14),
    color: t.colors.textMuted,
    textAlign: 'center',
    lineHeight: Math.round(t.fontSize(14) * 1.5),
    marginBottom: 20,
  },
  moodTxt: { ...t.typography.fonts.semibold, color: t.colors.text },
  btnPrimario: {
    alignSelf: 'stretch',
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnPrimarioTxt: {
    color: t.colors.onPrimary,
    fontSize: t.fontSize(15),
    ...t.typography.fonts.semibold,
  },
  btnSecundario: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  btnSecundarioTxt: {
    color: t.colors.primary,
    fontSize: t.fontSize(14),
    ...t.typography.fonts.medium,
  },
  btnTexto: { paddingVertical: 10, marginTop: 2 },
  btnTextoTxt: { color: t.colors.textFaint, fontSize: t.fontSize(13) },
}));
