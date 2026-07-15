import { useCallback, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGetMessages, apiSendMessage } from '../../services/api';
import { CHEERS } from '../../constants/cheers';
import { MOOD_INFO } from '../../constants/moods';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../../components/Tappable';

const POLL_MS = 8000;
const MAX_LENGTH = 500;

const formatHora = (iso) => {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

function Burbuja({ mensaje }) {
  const styles = useStyles();
  return (
    <View style={[styles.burbujaFila, mensaje.mine ? styles.filaMia : styles.filaAjena]}>
      <View style={[styles.burbuja, mensaje.mine ? styles.burbujaMia : styles.burbujaAjena]}>
        <Text style={mensaje.mine ? styles.textoMio : styles.textoAjeno}>{mensaje.message}</Text>
        <Text style={[styles.hora, mensaje.mine ? styles.horaMia : styles.horaAjena]}>
          {mensaje.pending ? 'enviando…' : formatHora(mensaje.createdAt)}
        </Text>
      </View>
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
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const listRef = useRef(null);

  const moodInfo = mood ? MOOD_INFO[mood] : null;

  const cargar = useCallback(async () => {
    try {
      const data = await apiGetMessages(friendId);
      if (data.mensajes) {
        // No pisar los mensajes optimistas que aún están en vuelo
        setMensajes((prev) => {
          const pendientes = prev.filter((m) => m.pending);
          return [...data.mensajes, ...pendientes];
        });
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

  const enviar = async (textoAEnviar) => {
    const message = textoAEnviar.trim();
    if (!message) return;

    setError('');
    setTexto('');
    const temp = {
      id: `tmp-${Date.now()}`,
      message,
      mine: true,
      pending: true,
      createdAt: new Date().toISOString(),
    };
    setMensajes((prev) => [...prev, temp]);

    try {
      const data = await apiSendMessage(friendId, message);
      if (data.mensaje) {
        setMensajes((prev) => prev.map((m) => (m.id === temp.id ? data.mensaje : m)));
      } else {
        throw new Error(data.error || 'No se pudo enviar');
      }
    } catch {
      setMensajes((prev) => prev.filter((m) => m.id !== temp.id));
      setTexto(message);
      setError('No se pudo enviar el mensaje. Revisa tu conexión e intenta de nuevo.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.pantalla, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
          renderItem={({ item }) => <Burbuja mensaje={item} />}
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

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={[styles.pie, { paddingBottom: Math.max(insets.bottom, 10) }]}>
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

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={texto}
            onChangeText={setTexto}
            placeholder="Escribe un mensaje…"
            placeholderTextColor={theme.colors.textFaint}
            multiline
            maxLength={MAX_LENGTH}
          />
          <Tappable
            style={[styles.btnEnviar, !texto.trim() && styles.btnEnviarOff]}
            onPress={() => enviar(texto)}
            disabled={!texto.trim()}
          >
            <Ionicons name="arrow-up" size={22} color={theme.colors.onPrimary} />
          </Tappable>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  vacioEmoji: { fontSize: 44, marginBottom: 12 },
  vacioTxt: {
    fontSize: t.fontSize(14),
    color: t.colors.textMuted,
    textAlign: 'center',
    lineHeight: Math.round(t.fontSize(14) * 1.6),
  },
  error: {
    color: t.colors.danger,
    fontSize: t.fontSize(13),
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  pie: {
    backgroundColor: t.colors.surfaceElevated,
    borderTopWidth: t.shape.borderThin,
    borderTopColor: t.colors.border,
    paddingTop: 10,
  },
  chips: { paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
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
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: t.colors.background,
    borderRadius: t.shape.radiusMd,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 110,
    fontSize: t.fontSize(15),
    color: t.colors.text,
  },
  btnEnviar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnEnviarOff: { opacity: 0.4 },
}));
