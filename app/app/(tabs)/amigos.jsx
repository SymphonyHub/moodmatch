import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiGetFriendships } from '../../services/api';
import { MOOD_INFO } from '../../constants/moods';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../../components/Tappable';
import Entrance from '../../components/Entrance';
import Avatar from '../../components/profile/Avatar';
import EmptyFriendsIllustration from '../../components/friends/EmptyFriendsIllustration';

function FriendCard({ amigo, index }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const mood = amigo.moodReciente ? MOOD_INFO[amigo.moodReciente] : null;
  const moodColor = amigo.moodReciente
    ? theme.colors.moods[amigo.moodReciente]?.color ?? theme.colors.textMuted
    : null;

  const abrirChat = () => {
    const params = {
      friendId: String(amigo.id),
      amistadId: String(amigo.amistadId),
      nombre: amigo.nombre,
    };
    if (amigo.moodReciente) params.mood = amigo.moodReciente;
    router.push({ pathname: '/chat/[friendId]', params });
  };

  return (
    <Entrance index={index}>
      <Tappable style={styles.card} onPress={abrirChat} haptic={false}>
        <Avatar
          avatarUrl={amigo.avatarUrl}
          nombre={amigo.nombre}
          size={46}
          style={styles.avatar}
        />
        <View style={styles.info}>
          <Text style={styles.nombre} numberOfLines={1}>{amigo.nombre}</Text>
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

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const dataAmigos = await apiGetFriendships();
      if (dataAmigos.amigos) setAmigos(dataAmigos.amigos);
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
          <EmptyFriendsIllustration />
          <Text style={styles.vacioTxt}>Aún no tienes amigos agregados</Text>
          <Text style={styles.vacioHint}>
            En la pestaña "Mi QR" puedes compartir tu link de invitación o escanear el código de alguien.
          </Text>
          <Tappable style={styles.btnIrQr} onPress={() => router.push('/(tabs)/mi-qr')}>
            <Ionicons name="qr-code-outline" size={18} color={theme.colors.onPrimary} />
            <Text style={styles.btnIrQrTxt}>Ir a Mi QR</Text>
          </Tappable>
        </Entrance>
      ) : (
        <View style={styles.listaCont}>
          {amigos.map((amigo, i) => (
            <FriendCard key={amigo.id} amigo={amigo} index={i} />
          ))}
        </View>
      )}

    </ScrollView>
  );
}

const useStyles = makeThemedStyles((t) => ({
  container: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: 20,
    paddingBottom: 40,
  },
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
  vacioCont: { alignItems: 'center', marginTop: 32, marginBottom: 36, paddingHorizontal: 24 },
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
    marginRight: 14,
  },
  info: { flex: 1, minWidth: 0 },
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
  btnIrQr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    minHeight: 44,
    paddingHorizontal: 24,
  },
  btnIrQrTxt: {
    color: t.colors.onPrimary,
    fontSize: t.fontSize(15),
    ...t.typography.fonts.semibold,
  },
  listaCont: { marginBottom: 14 },
}));
