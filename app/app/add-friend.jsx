import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiAddFriend } from '../services/api';
import { setPendingInvite } from '../utils/pendingInvite';
import { useTheme, makeThemedStyles } from '../theme/ThemeContext';
import Tappable from '../components/Tappable';
import Entrance from '../components/Entrance';

// Destino del deep link moodmatch://add-friend?code=... (y del link https
// de invitación vía la página /invite del backend).
export default function AddFriendScreen() {
  const { code } = useLocalSearchParams();
  const { theme } = useTheme();
  const styles = useStyles();

  // 'checking' | 'confirm' | 'adding' | 'done' | 'error'
  const [fase, setFase] = useState('checking');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (!code) {
      setFase('error');
      setMensaje('Este link de invitación no tiene un código válido.');
      return;
    }
    AsyncStorage.getItem('token').then((token) => {
      if (!token) {
        // Sin sesión: guardar el código y retomar después del login
        setPendingInvite(String(code))
          .catch(() => {})
          .finally(() => router.replace('/login'));
      } else {
        setFase('confirm');
      }
    });
  }, [code]);

  const agregar = async () => {
    setFase('adding');
    try {
      const data = await apiAddFriend(String(code));
      if (data.error) {
        setFase('error');
        setMensaje(data.error);
      } else {
        setFase('done');
        setMensaje(`¡${data.friend.nombre} y tú ahora son amigos! 🎉`);
      }
    } catch {
      setFase('error');
      setMensaje('No pudimos conectar. Revisa tu conexión e intenta de nuevo.');
    }
  };

  const irAAmigos = () => router.replace('/(tabs)/amigos');

  return (
    <View style={styles.pantalla}>
      {fase === 'checking' || fase === 'adding' ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      ) : (
        <Entrance style={styles.card}>
          <Text style={styles.emoji}>
            {fase === 'done' ? '🎉' : fase === 'error' ? '😕' : '🤝'}
          </Text>

          {fase === 'confirm' && (
            <>
              <Text style={styles.titulo}>Invitación de amistad</Text>
              <Text style={styles.texto}>
                Recibiste una invitación para agregar a un amigo en MoodMatch.
                Podrán ver cómo se sienten y enviarse mensajes de ánimo.
              </Text>
              <Tappable style={styles.btn} onPress={agregar}>
                <Text style={styles.btnTxt}>Agregar amigo</Text>
              </Tappable>
              <Tappable style={styles.btnSec} onPress={irAAmigos} haptic={false}>
                <Text style={styles.btnSecTxt}>Ahora no</Text>
              </Tappable>
            </>
          )}

          {fase === 'done' && (
            <>
              <Text style={styles.titulo}>¡Listo!</Text>
              <Text style={styles.texto}>{mensaje}</Text>
              <Tappable style={styles.btn} onPress={irAAmigos}>
                <Text style={styles.btnTxt}>Ir a Amigos</Text>
              </Tappable>
            </>
          )}

          {fase === 'error' && (
            <>
              <Text style={styles.titulo}>No se pudo agregar</Text>
              <Text style={styles.texto}>{mensaje}</Text>
              <Tappable style={styles.btn} onPress={irAAmigos}>
                <Text style={styles.btnTxt}>Ir a Amigos</Text>
              </Tappable>
            </>
          )}
        </Entrance>
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  pantalla: {
    flex: 1,
    backgroundColor: t.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusXl,
    padding: 28,
    alignItems: 'center',
    ...t.shadows.cardStrong,
  },
  emoji: { fontSize: 48, marginBottom: 14 },
  titulo: {
    ...t.typography.type.section,
    color: t.colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  texto: {
    fontSize: t.fontSize(14),
    color: t.colors.textMuted,
    textAlign: 'center',
    lineHeight: Math.round(t.fontSize(14) * 1.6),
    marginBottom: 22,
  },
  btn: {
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 14,
    paddingHorizontal: 36,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  btnTxt: {
    color: t.colors.onPrimary,
    fontSize: t.fontSize(15),
    ...t.typography.fonts.bold,
  },
  btnSec: { marginTop: 12, paddingVertical: 10 },
  btnSecTxt: { color: t.colors.textFaint, fontSize: t.fontSize(14) },
}));
