import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { makeThemedStyles, useTheme } from '../theme/ThemeContext';
import Entrance from '../components/Entrance';

const useStyles = makeThemedStyles((t) => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: t.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  titulo: {
    ...t.typography.type.section,
    color: t.colors.text,
    textAlign: 'center',
  },
  copy: {
    ...t.typography.type.body,
    color: t.colors.textMuted,
    textAlign: 'center',
  },
}));

// Pestaña "Para mí" del Wellness Hub — DOMINIO DEL AGENTE B (Emociones):
// aquí van las sugerencias individuales conectadas al último ánimo registrado
// en el chat. Este placeholder solo define el marco visual; reemplazar el
// contenido sin tocar la pantalla contenedora (actividades.jsx).
export default function ParaMiPanel() {
  const { theme } = useTheme();
  const styles = useStyles();

  return (
    <Entrance style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="sparkles-outline" size={32} color={theme.colors.accent} />
      </View>
      <Text style={styles.titulo}>Tus actividades, según tu ánimo</Text>
      <Text style={styles.copy}>
        Aquí van a aparecer sugerencias pensadas para ti, a partir del último ánimo que
        registraste en el chat.
      </Text>
    </Entrance>
  );
}
