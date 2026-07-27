import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../../components/Tappable';
import SegmentedTabs from '../../components/SegmentedTabs';
import FilaSwitch from '../../components/ajustes/FilaSwitch';
import {
  apiGetNotificationPreferences,
  apiUpdateNotificationPreferences,
} from '../../services/api';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_OPTIONS,
  isValidTime,
  normalizePublicPreferences,
  quietHoursFor,
  quietMode,
} from '../../notifications/preferences';
import {
  getPushPermissionStatus,
  syncPushToken,
} from '../../notifications/pushRegistration';

const MODES = [
  { id: 'off', label: 'Desactivado' },
  { id: 'all-day', label: 'Todo el día' },
  { id: 'schedule', label: 'Horario' },
];

export default function NotificationSettingsScreen() {
  const { theme } = useTheme();
  const styles = useStyles();
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [mode, setMode] = useState('off');
  const [from, setFrom] = useState('22:00');
  const [until, setUntil] = useState('08:00');
  const [permission, setPermission] = useState('undetermined');
  const [tokenRegistered, setTokenRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [data, permissionStatus] = await Promise.all([
        apiGetNotificationPreferences(),
        getPushPermissionStatus(),
      ]);
      const next = normalizePublicPreferences(data.preferences);
      setPreferences(next);
      setMode(quietMode(next));
      if (next.noMolestar && next.noMolestar.desde !== next.noMolestar.hasta) {
        setFrom(next.noMolestar.desde);
        setUntil(next.noMolestar.hasta);
      }
      setPermission(permissionStatus);
      setTokenRegistered(Boolean(data.tokenRegistered));
    } catch {
      setError('No pudimos cargar tus preferencias. Revisa tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const persist = async (patch) => {
    const previous = preferences;
    const next = { ...preferences, ...patch };
    setPreferences(next);
    setSaving(true);
    setError('');
    try {
      const data = await apiUpdateNotificationPreferences(patch);
      setPreferences(normalizePublicPreferences(data.preferences));
      return true;
    } catch {
      setPreferences(previous);
      setError('No pudimos guardar el cambio. Intenta nuevamente.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const activateNotifications = async () => {
    setSaving(true);
    setError('');
    const result = await syncPushToken({ requestPermission: true });
    const status = await getPushPermissionStatus();
    setPermission(status);
    setTokenRegistered(result.status === 'registered');
    if (result.status === 'error' || result.status === 'configuration-error') {
      setError('No pudimos activar las notificaciones en este momento.');
    }
    setSaving(false);
  };

  // SegmentedTabs no tiene estado deshabilitado, así que el guardado en curso se
  // corta acá (antes lo cubría el `disabled` de cada chip).
  const selectMode = async (nextMode) => {
    if (saving) return;
    const quietHours = quietHoursFor(nextMode, from, until);
    if (quietHours === undefined) return;
    const previousMode = mode;
    setMode(nextMode);
    const saved = await persist({ noMolestar: quietHours });
    if (!saved) setMode(previousMode);
  };

  const saveSchedule = async () => {
    if (!isValidTime(from) || !isValidTime(until)) {
      setError('Usa horas válidas en formato HH:mm, por ejemplo 22:00.');
      return;
    }
    await persist({ noMolestar: quietHoursFor('schedule', from, until) });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator style={styles.loader} size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  const permissionReady = permission === 'granted' && tokenRegistered;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Tappable
          style={styles.back}
          onPress={() => router.back()}
          haptic={false}
          accessibilityLabel="Volver a Ajustes"
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.onHeader} />
        </Tappable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Notificaciones</Text>
          <Text style={styles.subtitle}>Avisos útiles, a tu ritmo</Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        <View style={[styles.permissionCard, permissionReady && styles.permissionCardReady]}>
          <View style={styles.permissionIcon}>
            <Ionicons
              name={permissionReady ? 'notifications' : 'notifications-outline'}
              size={22}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.permissionCopy}>
            <Text style={styles.cardTitle}>
              {permissionReady ? 'Notificaciones activas' : 'Activa los avisos en este dispositivo'}
            </Text>
            <Text style={styles.cardHint}>
              {permissionReady
                ? 'Puedes cambiar cada categoría cuando quieras.'
                : 'La app pedirá permiso una sola vez y seguirá funcionando si dices que no.'}
            </Text>
          </View>
          {!permissionReady && permission !== 'denied' ? (
            <Tappable style={styles.compactButton} onPress={activateNotifications} disabled={saving}>
              <Text style={styles.compactButtonText}>Activar</Text>
            </Tappable>
          ) : null}
        </View>

        {permission === 'denied' ? (
          <Tappable style={styles.systemSettings} onPress={() => Linking.openSettings()} haptic={false}>
            <Text style={styles.systemSettingsText}>Abrir ajustes del sistema para dar permiso</Text>
          </Tappable>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Qué quieres recibir</Text>
          {NOTIFICATION_OPTIONS.map((option, index) => (
            <FilaSwitch
              key={option.key}
              title={option.label}
              hint={option.hint}
              value={preferences[option.key]}
              onValueChange={(value) => persist({ [option.key]: value })}
              disabled={saving}
              divider={index < NOTIFICATION_OPTIONS.length - 1}
              accessibilityLabel={`Notificaciones de ${option.label}`}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>No molestar</Text>
          <Text style={styles.sectionHint}>
            Durante este periodo el backend no enviará ningún tipo de aviso.
          </Text>
          <View style={styles.modeRow}>
            <SegmentedTabs tabs={MODES} activeId={mode} onChange={selectMode} />
          </View>

          {mode === 'schedule' ? (
            <View style={styles.scheduleBox}>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>Desde</Text>
                <TextInput
                  value={from}
                  onChangeText={setFrom}
                  style={styles.timeInput}
                  placeholder="22:00"
                  placeholderTextColor={theme.colors.textFaint}
                  maxLength={5}
                  accessibilityLabel="Hora de inicio de no molestar"
                />
              </View>
              <Text style={styles.timeArrow}>→</Text>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>Hasta</Text>
                <TextInput
                  value={until}
                  onChangeText={setUntil}
                  style={styles.timeInput}
                  placeholder="08:00"
                  placeholderTextColor={theme.colors.textFaint}
                  maxLength={5}
                  accessibilityLabel="Hora de fin de no molestar"
                />
              </View>
              <Tappable style={styles.saveSchedule} onPress={saveSchedule} disabled={saving}>
                <Text style={styles.saveScheduleText}>Guardar</Text>
              </Tappable>
            </View>
          ) : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {saving ? <Text style={styles.saving}>Guardando cambios…</Text> : null}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeThemedStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  loader: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.headerBackground,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { marginLeft: 6 },
  title: { ...t.typography.type.title, color: t.colors.onHeader },
  subtitle: { ...t.typography.type.caption, color: t.colors.onHeader, opacity: 0.78, marginTop: 1 },
  // Mismo contenedor que Ajustes: ancho máximo legible y centrado (antes esta
  // pantalla se estiraba de borde a borde en tablet mientras la otra no).
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusLg,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    padding: 14,
    marginBottom: 20,
    ...t.shadows.card,
  },
  permissionCardReady: { borderColor: t.colors.primarySoftBorder },
  permissionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primarySoft,
    marginRight: 12,
  },
  permissionCopy: { flex: 1 },
  cardTitle: { fontSize: t.fontSize(14), ...t.typography.fonts.semibold, color: t.colors.text },
  cardHint: { fontSize: t.fontSize(12), color: t.colors.textMuted, lineHeight: t.fontSize(17), marginTop: 3 },
  compactButton: {
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginLeft: 10,
  },
  compactButtonText: { color: t.colors.onPrimary, ...t.typography.fonts.bold, fontSize: t.fontSize(12) },
  systemSettings: { paddingVertical: 12, alignItems: 'center' },
  systemSettingsText: { color: t.colors.primary, ...t.typography.fonts.semibold, fontSize: t.fontSize(13) },
  // La tarjeta de sección ahora lleva sombra, como las de Ajustes: sin ella esta
  // pantalla se veía plana al lado de la otra.
  section: {
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusLg,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    padding: 16,
    marginBottom: 20,
    ...t.shadows.card,
  },
  sectionTitle: { ...t.typography.type.section, color: t.colors.text },
  sectionHint: { ...t.typography.type.caption, color: t.colors.textMuted, marginTop: 5, marginBottom: 14 },
  modeRow: { marginTop: 14 },
  scheduleBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: t.shape.borderThin,
    borderTopColor: t.colors.border,
  },
  timeField: { flex: 1 },
  timeLabel: { fontSize: t.fontSize(11), color: t.colors.textMuted, marginBottom: 5 },
  timeInput: {
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    borderRadius: t.shape.radiusMd,
    backgroundColor: t.colors.background,
    color: t.colors.text,
    textAlign: 'center',
    paddingVertical: 9,
    fontSize: t.fontSize(14),
  },
  timeArrow: { color: t.colors.textMuted, fontSize: t.fontSize(18), paddingHorizontal: 8, paddingBottom: 8 },
  saveSchedule: {
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginLeft: 9,
  },
  saveScheduleText: { color: t.colors.onPrimary, ...t.typography.fonts.bold, fontSize: t.fontSize(12) },
  error: { color: t.colors.danger, ...t.typography.type.caption, textAlign: 'center', marginTop: 16 },
  saving: { color: t.colors.textMuted, ...t.typography.type.caption, textAlign: 'center', marginTop: 12 },
}));
