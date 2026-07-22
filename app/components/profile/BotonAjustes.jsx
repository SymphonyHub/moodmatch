import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { makeThemedStyles, useTheme } from '../../theme/ThemeContext';
import Tappable from '../Tappable';

// Engranaje del header del Perfil: única entrada a Ajustes desde que dejó de
// ser tab. Va como headerRight en app/(tabs)/_layout.jsx.
export default function BotonAjustes({ tintColor }) {
  const { theme } = useTheme();
  const styles = useStyles();

  return (
    <Tappable
      style={styles.boton}
      onPress={() => router.push('/ajustes')}
      haptic={false}
      accessibilityLabel="Abrir ajustes"
    >
      <Ionicons name="settings-outline" size={22} color={tintColor ?? theme.colors.onHeader} />
    </Tappable>
  );
}

const useStyles = makeThemedStyles(() => ({
  boton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
}));
