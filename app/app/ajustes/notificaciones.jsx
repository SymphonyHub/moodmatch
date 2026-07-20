import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../../components/Tappable';
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

  const selectMode = async (nextMode) => {
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

      <ScrollView contentContainerStyle={styles.content}>
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
            <View
              key={option.key}
              style={[styles.toggleRow, index < NOTIFICATION_OPTIONS.length - 1 && styles.rowDivider]}
            >
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleLabel}>{option.label}</Text>
                <Text style={styles.toggleHint}>{option.hint}</Text>
              </View>
              <Switch
                value={preferences[option.key]}
                onValueChange={(value) => persist({ [option.key]: value })}
                disabled={saving}
                trackColor={{ false: theme.colors.border, true: theme.colors.primarySoftBorder }}
                thumbColor={preferences[option.key] ? theme.colors.primary : theme.colors.textFaint}
                accessibilityLabel={`Notificaciones de ${option.label}`}
              />
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>No molestar</Text>
          <Text style={styles.sectionHint}>
            Durante este periodo el backend no enviará ningún tipo de aviso.
          </Text>
          <View style={styles.modeRow}>
            {MODES.map((option) => (
              <Tappable
                key={option.id}
                style={[styles.modeChip, mode === option.id && styles.modeChipActive]}
                wrapperStyle={styles.modeWrapper}
                onPress={() => selectMode(option.id)}
                disabled={saving}
                haptic={false}
                accessibilityState={{ selected: mode === option.id }}
              >
                <Text style={[styles.modeText, mode === option.id && styles.modeTextActive]}>
                  {option.label}
                </Text>
              </Tappable>
            ))}
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
      </ScrollView>
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
  content: { padding: 18, paddingBottom: 42 },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusLg,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    padding: 14,
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
  section: {
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusLg,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    padding: 16,
    marginTop: 18,
  },
  sectionTitle: { ...t.typography.type.section, color: t.colors.text },
  sectionHint: { ...t.typography.type.caption, color: t.colors.textMuted, marginTop: 5, marginBottom: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  rowDivider: { borderBottomWidth: t.shape.borderThin, borderBottomColor: t.colors.border },
  toggleCopy: { flex: 1, paddingRight: 14 },
  toggleLabel: { fontSize: t.fontSize(15), ...t.typography.fonts.semibold, color: t.colors.text },
  toggleHint: { fontSize: t.fontSize(12), lineHeight: t.fontSize(17), color: t.colors.textMuted, marginTop: 3 },
  modeRow: { flexDirection: 'row', gap: 7, marginTop: 14 },
  modeWrapper: { flex: 1 },
  modeChip: {
    borderRadius: t.shape.radiusMd,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    backgroundColor: t.colors.background,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeChipActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft },
  modeText: { fontSize: t.fontSize(12), color: t.colors.textMuted, ...t.typography.fonts.semibold },
  modeTextActive: { color: t.colors.primary },
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
