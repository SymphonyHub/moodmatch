import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MinijuegoScreen from '../../mascota/minijuegos/MinijuegoScreen';
import { useTheme } from '../../theme/ThemeContext';

const primerValor = (valor) => (Array.isArray(valor) ? valor[0] : valor);

export default function MinijuegoRoute() {
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'bottom']}>
      <MinijuegoScreen
        amistadId={primerValor(params.amistadId)}
        slug={primerValor(params.tipo)}
      />
    </SafeAreaView>
  );
}
