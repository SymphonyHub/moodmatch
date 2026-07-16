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
    backgroundColor: t.colors.primarySoft,
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

// Pestaña "Con amigos" del Wellness Hub — DOMINIO DEL AGENTE C (Amigos/QR):
// aquí migra el contenido de "Para hacer con amigos". Este panel es SOLO el
// contenido desbloqueado: la regla de bloqueo (lockStateFor) y el LockedState
// viven en la pantalla contenedora (actividades.jsx), no aquí.
export default function ConAmigosPanel() {
  const { theme } = useTheme();
  const styles = useStyles();

  return (
    <Entrance style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="people-outline" size={32} color={theme.colors.primary} />
      </View>
      <Text style={styles.titulo}>Actividades en compañía</Text>
      <Text style={styles.copy}>
        Aquí van a aparecer ideas para hacer con tus amigos.
      </Text>
    </Entrance>
  );
}
