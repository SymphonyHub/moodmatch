// PROVISIONAL — la reemplaza el contenedor del Wellness Hub del Agente A
// (feature/wellness-hub-layout). Al integrar: borrar este archivo y montar
// ParaMiTab en la pestaña "Para mí" del Hub; repuntar RUTA_WELLNESS en
// features/wellness/paraMi.js. Conflicto de merge esperado y documentado.
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, makeThemedStyles } from '../theme/ThemeContext';
import Tappable from '../components/Tappable';
import ParaMiTab from '../components/wellness/ParaMiTab';

export default function WellnessScreen() {
  const { theme } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.pantalla, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Tappable style={styles.btnVolver} onPress={() => router.back()} haptic={false}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.onHeader} />
        </Tappable>
        <Text style={styles.titulo}>Para mí</Text>
      </View>
      <ParaMiTab />
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  pantalla: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: t.colors.headerBackground,
  },
  btnVolver: { padding: 8 },
  titulo: {
    ...t.typography.type.title,
    color: t.colors.onHeader,
    marginLeft: 4,
  },
}));
