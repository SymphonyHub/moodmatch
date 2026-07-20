import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { makeThemedStyles, useTheme } from '../../theme/ThemeContext';

// Ilustración construida con la misma familia vectorial de la app: una pequeña
// constelación de vínculos, sin depender de emojis ni de assets por plataforma.
export default function EmptyFriendsIllustration() {
  const { theme } = useTheme();
  const styles = useStyles();

  return (
    <View accessible={false} style={styles.canvas}>
      <View style={[styles.orbita, { borderColor: theme.colors.primarySoftBorder }]} />
      <View style={[styles.luna, { backgroundColor: theme.colors.primarySoft }]}>
        <Ionicons name="moon" size={30} color={theme.colors.primary} />
      </View>
      <View style={[styles.amigo, styles.amigoUno, { backgroundColor: theme.colors.accentSoft }]}>
        <Ionicons name="person" size={19} color={theme.colors.accent} />
      </View>
      <View style={[styles.amigo, styles.amigoDos, { backgroundColor: theme.colors.primarySoft }]}>
        <Ionicons name="person" size={17} color={theme.colors.primary} />
      </View>
      <View style={[styles.estrella, styles.estrellaUno, { backgroundColor: theme.colors.accent }]} />
      <View style={[styles.estrella, styles.estrellaDos, { backgroundColor: theme.colors.primary }]} />
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  canvas: {
    width: 156,
    height: 118,
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbita: {
    position: 'absolute',
    width: 126,
    height: 76,
    borderRadius: 63,
    borderWidth: t.shape.borderMedium,
    transform: [{ rotate: '-14deg' }],
  },
  luna: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amigo: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  amigoUno: { width: 44, height: 44, left: 10, bottom: 7 },
  amigoDos: { width: 38, height: 38, right: 10, top: 4 },
  estrella: { position: 'absolute', width: 7, height: 7, borderRadius: 4 },
  estrellaUno: { top: 20, left: 45 },
  estrellaDos: { right: 42, bottom: 14 },
}));
