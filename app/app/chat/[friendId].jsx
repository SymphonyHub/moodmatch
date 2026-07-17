import { useCallback, useRef, useState } from 'react';
import {
  View, Text, FlatList, ScrollView, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGetMessages, apiSendMessage } from '../../services/api';
import { CHEERS } from '../../constants/cheers';
import { MOOD_INFO } from '../../constants/moods';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../../components/Tappable';
import ChatInputBar from '../../components/chat/ChatInputBar';
import {
  crearOptimista, confirmar, marcarFallido, prepararReintento, reconciliar,
} from '../../friends/mensajesChat';

const POLL_MS = 8000;
const MAX_LENGTH = 500;

const formatHora = (iso) => {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

function Burbuja({ mensaje, onReintentar }) {
  const styles = useStyles();
  // Un mensaje fallido pierde el fondo primario: pasa a superficie con borde
  // de peligro, y toda la burbuja es tocable para reintentar (el texto solo
  // vive acá — ChatInputBar ya limpió su input al enviar).
  const cuerpo = (
    <View
      style={[
        styles.burbuja,
        mensaje.mine ? styles.burbujaMia : styles.burbujaAjena,
        mensaje.failed && styles.burbujaFallida,
      ]}
    >
      <Text style={mensaje.mine && !mensaje.failed ? styles.textoMio : styles.textoAjeno}>
        {mensaje.message}
      </Text>
      {mensaje.failed ? (
        <Text style={styles.fallo}>No se envió — toca para reintentar</Text>
      ) : (
        <Text style={[styles.hora, mensaje.mine ? styles.horaMia : styles.horaAjena]}>
          {mensaje.pending ? 'enviando…' : formatHora(mensaje.createdAt)}
        </Text>
      )}
    </View>
  );
  return (
    <View style={[styles.burbujaFila, mensaje.mine ? styles.filaMia : styles.filaAjena]}>
      {mensaje.failed ? (
        <Tappable
          style={styles.burbujaMax}
          onPress={() => onReintentar(mensaje)}
          accessibilityLabel="Reintentar envío del mensaje"
        >
          {cuerpo}
        </Tappable>
      ) : cuerpo}
    </View>
  );
}

export default function ChatScreen() {
  const { friendId, nombre, mood } = useLocalSearchParams();
  const { theme } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef(null);

  const moodInfo = mood ? MOOD_INFO[mood] : null;

  const cargar = useCallback(async () => {
    try {
      const data = await apiGetMessages(friendId);
      if (data.mensajes) {
        // La verdad del servidor sin pisar los locales en vuelo o fallidos
        setMensajes((prev) => reconciliar(data.mensajes, prev));
      }
    } catch {
      // el próximo poll reintenta
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  // Carga al enfocar + polling mientras la pantalla está enfocada.
  // Callback síncrono con cleanup: ver nota en amigos.jsx sobre useFocusEffect.
  useFocusEffect(
    useCallback(() => {
      cargar();
      const timer = setInterval(cargar, POLL_MS);
      return () => clearInterval(timer);
    }, [cargar]),
  );

  const transmitir = async (temp) => {
    try {
      const data = await apiSendMessage(friendId, temp.message);
      if (!data.mensaje) throw new Error(data.error || 'No se pudo enviar');
      setMensajes((prev) => confirmar(prev, temp.id, data.mensaje));
    } catch {
      setMensajes((prev) => marcarFallido(prev, temp.id));
    }
  };

  const enviar = (textoAEnviar) => {
    const message = textoAEnviar.trim();
    if (!message) return;
    const temp = crearOptimista(message);
    setMensajes((prev) => [...prev, temp]);
    transmitir(temp);
  };

  const reintentar = (mensaje) => {
    if (!mensaje.failed) return;
    setMensajes((prev) => prepararReintento(prev, mensaje.id));
    transmitir(mensaje);
  };

  return (
    <View style={[styles.pantalla, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Tappable style={styles.btnVolver} onPress={() => router.back()} haptic={false}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.onHeader} />
        </Tappable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerNombre} numberOfLines={1}>{nombre ?? 'Chat'}</Text>
          {moodInfo && (
            <Text style={styles.headerMood}>{moodInfo.emoji}  {moodInfo.label}</Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={mensajes}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => <Burbuja mensaje={item} onReintentar={reintentar} />}
          contentContainerStyle={styles.lista}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={(
            <View style={styles.vacio}>
              <Text style={styles.vacioEmoji}>💬</Text>
              <Text style={styles.vacioTxt}>
                Todavía no hay mensajes.{'\n'}Escribe algo o envía un ánimo rápido.
              </Text>
            </View>
          )}
        />
      )}

      <ChatInputBar
        onSend={enviar}
        placeholder="Escribe un mensaje…"
        maxLength={MAX_LENGTH}
        bottomOffset={0}
        accessory={(
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            keyboardShouldPersistTaps="handled"
          >
            {CHEERS.map((msg) => (
              <Tappable key={msg} style={styles.chip} onPress={() => enviar(msg)}>
                <Text style={styles.chipTxt}>{msg}</Text>
              </Tappable>
            ))}
          </ScrollView>
        )}
      />
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  pantalla: { flex: 1, backgroundColor: t.colors.background },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.headerBackground,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  btnVolver: { padding: 6 },
  headerInfo: { flex: 1, marginLeft: 4 },
  headerNombre: {
    ...t.typography.type.section,
    color: t.colors.onHeader,
  },
  headerMood: {
    fontSize: t.fontSize(12),
    color: t.colors.onHeader,
    opacity: 0.8,
    marginTop: 2,
  },
  lista: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  burbujaFila: { flexDirection: 'row', marginBottom: 8 },
  filaMia: { justifyContent: 'flex-end' },
  filaAjena: { justifyContent: 'flex-start' },
  burbujaMax: { maxWidth: '78%' },
  burbuja: {
    maxWidth: '78%',
    borderRadius: t.shape.radiusLg,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  burbujaMia: {
    backgroundColor: t.colors.primary,
    borderBottomRightRadius: t.shape.radiusSm ?? 6,
  },
  burbujaAjena: {
    backgroundColor: t.colors.surface,
    borderBottomLeftRadius: t.shape.radiusSm ?? 6,
    ...t.shadows.card,
  },
  burbujaFallida: {
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.danger,
    maxWidth: '100%',
  },
  textoMio: {
    fontSize: t.fontSize(15),
    color: t.colors.onPrimary,
    lineHeight: Math.round(t.fontSize(15) * 1.4),
  },
  textoAjeno: {
    fontSize: t.fontSize(15),
    color: t.colors.text,
    lineHeight: Math.round(t.fontSize(15) * 1.4),
  },
  hora: { fontSize: t.fontSize(10), marginTop: 4, alignSelf: 'flex-end' },
  horaMia: { color: t.colors.onPrimary, opacity: 0.7 },
  horaAjena: { color: t.colors.textFaint },
  fallo: {
    fontSize: t.fontSize(11),
    color: t.colors.danger,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  vacioEmoji: { fontSize: 44, marginBottom: 12 },
  vacioTxt: {
    fontSize: t.fontSize(14),
    color: t.colors.textMuted,
    textAlign: 'center',
    lineHeight: Math.round(t.fontSize(14) * 1.6),
  },
  chips: { paddingBottom: 10, gap: 8 },
  chip: {
    backgroundColor: t.colors.primarySoft,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
  },
  chipTxt: {
    fontSize: t.fontSize(13),
    ...t.typography.fonts.medium,
    color: t.colors.primary,
  },
}));
