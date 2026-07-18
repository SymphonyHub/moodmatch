import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiGetFriendships } from '../../services/api';
import { MOOD_INFO } from '../../constants/moods';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../Tappable';

/**
 * SelectorAmigoModal — hoja para elegir un amigo antes de una acción social
 * ("Salida con amigos", "Escribe a alguien que aprecias"). Reusa el look de la
 * lista de amigos (avatar + chip de ánimo). Carga la lista al abrirse.
 *
 * @param {boolean} visible
 * @param {string}  titulo
 * @param {(amigo) => void} onSelect  recibe { id, nombre, moodReciente, ... }
 * @param {() => void} onClose
 * @param {Array}   [amigos]  lista precargada (evita re-fetch cuando el que
 *                            abre el modal ya la tenía, p. ej. "energía positiva")
 */
export default function SelectorAmigoModal({ visible, titulo, onSelect, onClose, amigos: preload }) {
  const { theme } = useTheme();
  const styles = useStyles();

  const [amigos, setAmigos] = useState(preload ?? null);

  useEffect(() => {
    if (!visible) return undefined;
    if (preload) {
      setAmigos(preload);
      return undefined;
    }
    let activo = true;
    setAmigos(null);
    apiGetFriendships()
      .then((data) => {
        if (activo) setAmigos(data.amigos ?? []);
      })
      .catch(() => {
        if (activo) setAmigos([]);
      });
    return () => {
      activo = false;
    };
  }, [visible, preload]);

  const irAQr = () => {
    onClose();
    router.push('/(tabs)/mi-qr');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.hoja}>
          <View style={styles.barra}>
            <Text style={styles.titulo} numberOfLines={1}>{titulo}</Text>
            <Tappable style={styles.cerrar} onPress={onClose} accessibilityLabel="Cerrar" haptic={false}>
              <Ionicons name="close" size={22} color={theme.colors.textMuted} />
            </Tappable>
          </View>

          {amigos === null ? (
            <View style={styles.centro}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : amigos.length === 0 ? (
            <View style={styles.vacio}>
              <Text style={styles.vacioEmoji}>👥</Text>
              <Text style={styles.vacioTxt}>Aún no tienes amigos agregados</Text>
              <Tappable style={styles.btnQr} onPress={irAQr}>
                <Ionicons name="qr-code-outline" size={18} color={theme.colors.onPrimary} />
                <Text style={styles.btnQrTxt}>Ir a Mi QR</Text>
              </Tappable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.lista}>
              {amigos.map((amigo) => {
                const mood = amigo.moodReciente ? MOOD_INFO[amigo.moodReciente] : null;
                const moodColor = amigo.moodReciente
                  ? theme.colors.moods[amigo.moodReciente]?.color ?? theme.colors.textMuted
                  : null;
                return (
                  <Tappable
                    key={amigo.id}
                    style={styles.card}
                    onPress={() => onSelect(amigo)}
                    haptic={false}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarTxt}>{amigo.nombre.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.nombre}>{amigo.nombre}</Text>
                      {mood ? (
                        <Text style={[styles.mood, { color: moodColor }]}>
                          {mood.emoji}{'  '}{mood.label}
                        </Text>
                      ) : (
                        <Text style={styles.moodNulo}>Sin registrar aún</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textFaint} />
                  </Tappable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeThemedStyles((t) => ({
  backdrop: {
    flex: 1,
    backgroundColor: t.colors.scrim ?? 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  hoja: {
    backgroundColor: t.colors.background,
    borderTopLeftRadius: t.shape.radiusXl,
    borderTopRightRadius: t.shape.radiusXl,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: '80%',
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  titulo: {
    flex: 1,
    ...t.typography.type.section,
    color: t.colors.text,
  },
  cerrar: { padding: 4 },
  centro: { paddingVertical: 48, alignItems: 'center' },
  vacio: { paddingVertical: 36, alignItems: 'center', paddingHorizontal: 24 },
  vacioEmoji: { fontSize: 48, marginBottom: 14 },
  vacioTxt: {
    fontSize: t.fontSize(15),
    ...t.typography.fonts.semibold,
    color: t.colors.textMuted,
    textAlign: 'center',
    marginBottom: 18,
  },
  btnQr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  btnQrTxt: {
    color: t.colors.onPrimary,
    fontSize: t.fontSize(15),
    ...t.typography.fonts.semibold,
  },
  lista: { paddingBottom: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusLg,
    padding: 14,
    marginBottom: 10,
    ...t.shadows.card,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarTxt: {
    fontSize: t.fontSize(19),
    ...t.typography.fonts.bold,
    color: t.colors.primary,
  },
  info: { flex: 1 },
  nombre: {
    fontSize: t.fontSize(15),
    ...t.typography.fonts.semibold,
    color: t.colors.text,
    marginBottom: 3,
  },
  mood: { fontSize: t.fontSize(13), ...t.typography.fonts.medium },
  moodNulo: { fontSize: t.fontSize(13), color: t.colors.textFaint },
}));
