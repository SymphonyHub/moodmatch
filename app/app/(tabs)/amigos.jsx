import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, Share,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiGetFriendships, apiGetMe, apiGetSocialActivities } from '../../services/api';
import { MOOD_INFO } from '../../constants/moods';
import { buildInviteMessage } from '../../utils/invite';
import { API_URL } from '../../config';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../../components/Tappable';
import Entrance from '../../components/Entrance';

function FriendCard({ amigo, index }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const mood = amigo.moodReciente ? MOOD_INFO[amigo.moodReciente] : null;
  const moodColor = amigo.moodReciente
    ? theme.colors.moods[amigo.moodReciente]?.color ?? theme.colors.textMuted
    : null;

  const abrirChat = () => {
    const params = { friendId: String(amigo.id), nombre: amigo.nombre };
    if (amigo.moodReciente) params.mood = amigo.moodReciente;
    router.push({ pathname: '/chat/[friendId]', params });
  };

  return (
    <Entrance index={index}>
      <Tappable style={styles.card} onPress={abrirChat} haptic={false}>
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
        {amigo.unread > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeTxt}>{amigo.unread > 99 ? '99+' : amigo.unread}</Text>
          </View>
        ) : (
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.textFaint} />
        )}
      </Tappable>
    </Entrance>
  );
}

export default function AmigosScreen() {
  const { theme } = useTheme();
  const styles = useStyles();

  const [amigos, setAmigos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actividades, setActividades] = useState([]);
  const [me, setMe] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [dataAmigos, dataActs, dataMe] = await Promise.all([
        apiGetFriendships(),
        apiGetSocialActivities(),
        apiGetMe(),
      ]);
      if (dataAmigos.amigos) setAmigos(dataAmigos.amigos);
      if (dataActs.activities) setActividades(dataActs.activities.slice(0, 3));
      if (dataMe.user) setMe(dataMe.user);
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

  const invitar = async () => {
    if (!me) return;
    try {
      await Share.share({
        message: buildInviteMessage(me.nombre, API_URL, me.qrCode),
      });
    } catch {
      // el usuario cerró el share sheet: no es un error
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Mis amigos</Text>
      <Text style={styles.subtitulo}>
        Toca a un amigo para abrir el chat
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
      ) : amigos.length === 0 ? (
        <Entrance style={styles.vacioCont}>
          <Text style={styles.vacioEmoji}>👥</Text>
          <Text style={styles.vacioTxt}>Aún no tienes amigos agregados</Text>
          <Text style={styles.vacioHint}>
            Comparte tu link de invitación o escanea el QR de alguien desde la pestaña "Mi QR".
          </Text>
          <Tappable style={styles.btnInvitar} onPress={invitar} disabled={!me}>
            <Ionicons name="share-social-outline" size={18} color={theme.colors.onPrimary} />
            <Text style={styles.btnInvitarTxt}>Invitar a un amigo</Text>
          </Tappable>
        </Entrance>
      ) : (
        <>
          {amigos.map((amigo, i) => (
            <FriendCard key={amigo.id} amigo={amigo} index={i} />
          ))}

          <Tappable
            wrapperStyle={{ marginTop: 10, marginBottom: 24 }}
            style={styles.btnInvitar}
            onPress={invitar}
            disabled={!me}
          >
            <Ionicons name="share-social-outline" size={18} color={theme.colors.onPrimary} />
            <Text style={styles.btnInvitarTxt}>Invitar a un amigo</Text>
          </Tappable>

          {actividades.length > 0 && (
            <View style={styles.socialSection}>
              <Text style={styles.socialTitulo}>Para hacer con amigos</Text>
              {actividades.map((act, i) => (
                <Entrance key={act.id} index={i} style={styles.actCard}>
                  <Text style={styles.actNombre}>{act.nombre}</Text>
                  <Text style={styles.actDesc}>{act.descripcion}</Text>
                </Entrance>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const useStyles = makeThemedStyles((t) => ({
  container: { padding: 20, paddingBottom: 40 },
  titulo: {
    ...t.typography.type.title,
    color: t.colors.text,
    marginBottom: 4,
    marginTop: 4,
  },
  subtitulo: {
    ...t.typography.type.caption,
    color: t.colors.textMuted,
    marginBottom: 22,
  },
  spinner: { marginTop: 40 },
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
    marginBottom: 20,
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
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 7,
  },
  badgeTxt: {
    fontSize: t.fontSize(12),
    ...t.typography.fonts.bold,
    color: t.colors.onPrimary,
  },
  btnInvitar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 13,
    paddingHorizontal: 24,
  },
  btnInvitarTxt: {
    color: t.colors.onPrimary,
    fontSize: t.fontSize(15),
    ...t.typography.fonts.semibold,
  },
  socialSection: { marginTop: 4 },
  socialTitulo: {
    ...t.typography.type.section,
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
}));
