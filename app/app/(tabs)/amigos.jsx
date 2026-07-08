import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  ScrollView, ActivityIndicator, Modal, Animated,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { apiGetFriendships, apiSendCheer, apiGetSocialActivities } from '../../services/api';
import { MOOD_INFO } from '../../constants/moods';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';

const CHEERS = [
  '💚 Pensando en ti',
  '✨ Espero que tengas un buen día',
  '🤗 Aquí estoy si me necesitas',
  '🌟 Eres más fuerte de lo que crees',
  '☕ ¿Una pausa te vendría bien?',
  '🙌 ¡Vas muy bien, sigue así!',
];

function ScaleBtn({ wrapperStyle, style, onPress, children, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[wrapperStyle, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={style}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        disabled={disabled}
        activeOpacity={0.9}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

function FriendCard({ amigo, onAnimo, index }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const mood = amigo.moodReciente ? MOOD_INFO[amigo.moodReciente] : null;
  const moodColor = amigo.moodReciente
    ? theme.colors.moods[amigo.moodReciente]?.color ?? theme.colors.textMuted
    : null;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarTxt}>{amigo.nombre.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.nombre}>{amigo.nombre}</Text>
        {mood ? (
          <Text style={[styles.mood, { color: moodColor }]}>{mood.emoji}{'  '}{mood.label}</Text>
        ) : (
          <Text style={styles.moodNulo}>Sin registrar aún</Text>
        )}
      </View>
      <ScaleBtn style={styles.btnAnimo} onPress={() => onAnimo(amigo)}>
        <Text style={styles.btnAnimoText}>💚 Ánimo</Text>
      </ScaleBtn>
    </Animated.View>
  );
}

export default function AmigosScreen() {
  const { theme } = useTheme();
  const styles = useStyles();

  const [amigos, setAmigos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actividades, setActividades] = useState([]);

  const [cheerTarget, setCheerTarget] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [cheerOk, setCheerOk] = useState('');

  const modalFade = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (cheerTarget) {
      modalFade.setValue(0);
      modalSlide.setValue(50);
      Animated.parallel([
        Animated.timing(modalFade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(modalSlide, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [cheerTarget]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [dataAmigos, dataActs] = await Promise.all([
        apiGetFriendships(),
        apiGetSocialActivities(),
      ]);
      if (dataAmigos.amigos) setAmigos(dataAmigos.amigos);
      if (dataActs.activities) setActividades(dataActs.activities.slice(0, 3));
    } finally {
      setLoading(false);
    }
  }, []);

  // useFocusEffect espera un callback síncrono (con cleanup opcional).
  // cargar es async: pasarla directo devuelve una Promise y React lanza
  // "An effect function must not return anything besides a cleanup function".
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const enviarCheer = async (message) => {
    if (!cheerTarget) return;
    setEnviando(true);
    try {
      const data = await apiSendCheer(cheerTarget.id, message);
      if (!data.error) {
        setCheerOk(`¡Mensaje enviado a ${cheerTarget.nombre}! 💚`);
      }
    } catch {
      // falla silenciosamente
    } finally {
      setEnviando(false);
      setCheerTarget(null);
    }
  };

  return (
    <>
      <Modal
        visible={!!cheerTarget}
        transparent
        animationType="none"
        onRequestClose={() => setCheerTarget(null)}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: modalFade }]}>
          <Animated.View style={[styles.modalBox, { transform: [{ translateY: modalSlide }] }]}>
            <Text style={styles.modalTitle}>
              Envía un ánimo a {cheerTarget?.nombre}
            </Text>
            {CHEERS.map((msg) => (
              <ScaleBtn
                key={msg}
                style={[styles.cheerOption, enviando && styles.cheerOptionDisabled]}
                onPress={() => enviarCheer(msg)}
                disabled={enviando}
              >
                <Text style={styles.cheerOptionText}>{msg}</Text>
              </ScaleBtn>
            ))}
            <ScaleBtn style={styles.modalCancelar} onPress={() => setCheerTarget(null)}>
              <Text style={styles.modalCancelarText}>Cancelar</Text>
            </ScaleBtn>
          </Animated.View>
        </Animated.View>
      </Modal>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.titulo}>Mis amigos</Text>
        <Text style={styles.subtitulo}>
          El estado de ánimo más reciente de cada amigo
        </Text>

        {!!cheerOk && (
          <View style={styles.bannerOk}>
            <Text style={styles.bannerOkText}>{cheerOk}</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
        ) : amigos.length === 0 ? (
          <View style={styles.vacioCont}>
            <Text style={styles.vacioEmoji}>👥</Text>
            <Text style={styles.vacioTxt}>Aún no tienes amigos agregados</Text>
            <Text style={styles.vacioHint}>
              Ve a la pestaña "Mi QR" y escanea el código de alguien para empezar.
            </Text>
          </View>
        ) : (
          <>
            {amigos.map((amigo, i) => (
              <FriendCard
                key={amigo.id}
                amigo={amigo}
                index={i}
                onAnimo={(a) => { setCheerOk(''); setCheerTarget(a); }}
              />
            ))}

            <ScaleBtn
              wrapperStyle={{ alignSelf: 'center', marginTop: 8, marginBottom: 24 }}
              style={styles.btnRecargar}
              onPress={cargar}
            >
              <Text style={styles.btnRecargarTxt}>Actualizar</Text>
            </ScaleBtn>

            {actividades.length > 0 && (
              <View style={styles.socialSection}>
                <Text style={styles.socialTitulo}>Para hacer con amigos</Text>
                {actividades.map((act) => (
                  <View key={act.id} style={styles.actCard}>
                    <Text style={styles.actNombre}>{act.nombre}</Text>
                    <Text style={styles.actDesc}>{act.descripcion}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

const useStyles = makeThemedStyles((t) => ({
  container: { padding: 20, paddingBottom: 40 },
  titulo: {
    fontSize: t.fontSize(22),
    ...t.typography.fonts.bold,
    color: t.colors.text,
    marginBottom: 4,
    marginTop: 4,
  },
  subtitulo: {
    fontSize: t.fontSize(13),
    color: t.colors.textMuted,
    marginBottom: 22,
  },
  spinner: { marginTop: 40 },
  bannerOk: {
    backgroundColor: t.colors.primarySoft,
    borderRadius: t.shape.radiusMd,
    padding: 12,
    marginBottom: 16,
  },
  bannerOkText: {
    color: t.colors.primary,
    ...t.typography.fonts.semibold,
    textAlign: 'center',
    fontSize: t.fontSize(14),
  },
  vacioCont: { alignItems: 'center', marginTop: 48, paddingHorizontal: 24 },
  vacioEmoji: { fontSize: 52, marginBottom: 16 },
  vacioTxt: {
    fontSize: t.fontSize(16),
    ...t.typography.fonts.semibold,
    color: t.colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  vacioHint: {
    fontSize: t.fontSize(13),
    color: t.colors.textFaint,
    textAlign: 'center',
    lineHeight: Math.round(t.fontSize(13) * 1.55),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusLg,
    padding: 16,
    marginBottom: 12,
    ...t.shadows.card,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: t.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarTxt: {
    fontSize: t.fontSize(20),
    ...t.typography.fonts.bold,
    color: t.colors.primary,
  },
  info: { flex: 1 },
  nombre: {
    fontSize: t.fontSize(16),
    ...t.typography.fonts.semibold,
    color: t.colors.text,
    marginBottom: 4,
  },
  mood: { fontSize: t.fontSize(14), ...t.typography.fonts.medium },
  moodNulo: { fontSize: t.fontSize(14), color: t.colors.textFaint },
  btnAnimo: {
    backgroundColor: t.colors.primarySoft,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
  },
  btnAnimoText: {
    fontSize: t.fontSize(13),
    ...t.typography.fonts.semibold,
    color: t.colors.primary,
  },
  btnRecargar: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: t.shape.radiusMd,
    borderWidth: t.shape.borderMedium,
    borderColor: t.colors.border,
  },
  btnRecargarTxt: {
    color: t.colors.textMuted,
    fontSize: t.fontSize(14),
    ...t.typography.fonts.semibold,
  },
  socialSection: { marginTop: 4 },
  socialTitulo: {
    fontSize: t.fontSize(16),
    ...t.typography.fonts.bold,
    color: t.colors.text,
    marginBottom: 12,
  },
  actCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusLg,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: t.colors.categories.social,
    ...t.shadows.card,
  },
  actNombre: {
    fontSize: t.fontSize(15),
    ...t.typography.fonts.bold,
    color: t.colors.text,
    marginBottom: 4,
  },
  actDesc: {
    fontSize: t.fontSize(13),
    color: t.colors.textMuted,
    lineHeight: Math.round(t.fontSize(13) * 1.5),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: t.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: t.colors.surfaceElevated,
    borderTopLeftRadius: t.shape.radiusXl,
    borderTopRightRadius: t.shape.radiusXl,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: t.fontSize(16),
    ...t.typography.fonts.bold,
    color: t.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  cheerOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: t.shape.radiusMd,
    backgroundColor: t.colors.background,
    marginBottom: 8,
  },
  cheerOptionDisabled: { opacity: 0.5 },
  cheerOptionText: { fontSize: t.fontSize(15), color: t.colors.text },
  modalCancelar: { marginTop: 8, alignItems: 'center', paddingVertical: 12 },
  modalCancelarText: { color: t.colors.textFaint, fontSize: t.fontSize(15) },
}));
