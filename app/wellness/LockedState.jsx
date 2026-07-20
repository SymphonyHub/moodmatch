import { ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { makeThemedStyles, useTheme } from '../theme/ThemeContext';
import Entrance from '../components/Entrance';
import Tappable from '../components/Tappable';

const useStyles = makeThemedStyles((t) => ({
  entrada: { flex: 1 },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
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
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
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
  cta: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  ctaTxt: {
    ...t.typography.type.body,
    ...t.typography.fonts.semibold,
    color: t.colors.onPrimary,
  },
}));

// Patrón visual de bloqueo de la pestaña "Con amigos" (Fase 6): estado claro,
// sin regla de negocio — la decisión de mostrarlo vive en la pantalla del Hub
// (lockStateFor). El CTA lleva a Mi QR, la pantalla de agregar amigos.
export default function LockedState() {
  const { theme } = useTheme();
  const styles = useStyles();

  return (
    <Entrance style={styles.entrada}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed-outline" size={32} color={theme.colors.primary} />
        </View>
        <Text style={styles.titulo}>Agrega un amigo para desbloquear</Text>
        <Text style={styles.copy}>
          Estas actividades son para hacer en compañía. En cuanto agregues a tu primer
          amigo, se desbloquean solas.
        </Text>
        <Tappable style={styles.cta} onPress={() => router.push('/(tabs)/mi-qr')}>
          <Ionicons name="qr-code-outline" size={18} color={theme.colors.onPrimary} />
          <Text style={styles.ctaTxt}>Ir a Mi QR</Text>
        </Tappable>
      </ScrollView>
    </Entrance>
  );
}
