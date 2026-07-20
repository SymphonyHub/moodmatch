import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { apiLogin, apiRegister, apiUpdateThemePreference, apiUpdateMe } from '../services/api';
import { getPendingInvite, clearPendingInvite } from '../utils/pendingInvite';
import { useTheme, makeThemedStyles } from '../theme/ThemeContext';
import { VALID_THEME_CHOICES } from '../theme/themes';
import { normalizeCustomTheme } from '../theme/customTheme';
import Tappable from '../components/Tappable';
import { syncPushToken } from '../notifications/pushRegistration';

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export default function LoginScreen() {
  const { theme, themeChoice, setThemeChoice, customConfig, setCustomContainer } = useTheme();
  const styles = useStyles();

  const [modo, setModo] = useState('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [errNombre, setErrNombre] = useState('');
  const [errEmail, setErrEmail] = useState('');
  const [errPassword, setErrPassword] = useState('');
  const [errGeneral, setErrGeneral] = useState('');

  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    setErrNombre('');
    setErrEmail('');
    setErrPassword('');
    setErrGeneral('');
  };

  const validar = () => {
    let ok = true;
    setErrNombre('');
    setErrEmail('');
    setErrPassword('');
    setErrGeneral('');

    if (modo === 'register' && !nombre.trim()) {
      setErrNombre('El nombre es requerido');
      ok = false;
    }
    if (!email.trim()) {
      setErrEmail('El email es requerido');
      ok = false;
    } else if (!isValidEmail(email)) {
      setErrEmail('Ingresa un email válido');
      ok = false;
    }
    if (!password) {
      setErrPassword('La contraseña es requerida');
      ok = false;
    } else if (password.length < 6) {
      setErrPassword('Mínimo 6 caracteres');
      ok = false;
    }
    return ok;
  };

  const handleSubmit = async () => {
    if (!validar()) return;

    setLoading(true);
    try {
      const data =
        modo === 'login'
          ? await apiLogin(email.trim(), password)
          : await apiRegister(nombre.trim(), email.trim(), password);

      if (data.error) {
        setErrGeneral(data.error);
        return;
      }

      await AsyncStorage.setItem('token', data.token);
      syncPushToken({ requestPermission: true });

      // Reconciliar tema con el perfil: si el servidor tiene una preferencia
      // guardada (otro dispositivo o reinstalación), se adopta; si no, se sube
      // la elección local para que quede respaldada.
      const serverPref = data.user?.themePreference;
      if (serverPref && VALID_THEME_CHOICES.includes(serverPref)) {
        if (serverPref !== themeChoice) setThemeChoice(serverPref, { sync: false });
      } else {
        apiUpdateThemePreference(themeChoice).catch(() => {});
      }

      // Lo mismo con las paletas personalizadas: se normaliza SIEMPRE lo que
      // venga del servidor (migra un objeto legacy y descarta datos corruptos)
      // antes de derivar un tema.
      const serverCustom = normalizeCustomTheme(data.user?.customTheme);
      if (serverCustom) {
        setCustomContainer(serverCustom, { sync: false });
      } else if (customConfig) {
        apiUpdateMe({ customTheme: customConfig }).catch(() => {});
      }

      if (modo === 'register') {
        router.replace('/onboarding/bienvenida');
        return;
      }

      // Usuarios existentes que aún no tienen perfil completan el cuestionario,
      // pero no repiten la animación reservada al registro exitoso.
      if (!data.user?.perfilPersonalidad) {
        router.replace('/onboarding/cuestionario');
        return;
      }

      // Si se llegó acá desde un link de invitación, retomarlo ahora que hay sesión.
      const pendingCode = await getPendingInvite().catch(() => null);
      if (pendingCode) {
        await clearPendingInvite().catch(() => {});
        router.replace({ pathname: '/add-friend', params: { code: pendingCode } });
      } else {
        router.replace('/(tabs)/home');
      }
    } catch {
      setErrGeneral('No pudimos conectar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <StatusBar style={theme.statusBar.onBackground} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        <View style={styles.orbe} />
        <View style={styles.shell}>
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <Ionicons name="heart" size={27} color={theme.colors.onPrimary} />
            </View>
            <Text style={styles.marca}>MoodMatch</Text>
            <Text style={styles.titulo}>
              {modo === 'login' ? 'Qué bueno verte de nuevo' : 'Tu espacio empieza aquí'}
            </Text>
            <Text style={styles.subtitulo}>
              {modo === 'login'
                ? 'Vuelve a conectar con cómo te sientes.'
                : 'Crea una cuenta y personaliza tu experiencia.'}
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, modo === 'login' && styles.toggleActive]}
                onPress={() => cambiarModo('login')}
                accessibilityState={{ selected: modo === 'login' }}
              >
                <Text style={[styles.toggleText, modo === 'login' && styles.toggleTextActive]}>
                  Ingresar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, modo === 'register' && styles.toggleActive]}
                onPress={() => cambiarModo('register')}
                accessibilityState={{ selected: modo === 'register' }}
              >
                <Text style={[styles.toggleText, modo === 'register' && styles.toggleTextActive]}>
                  Registrarse
                </Text>
              </TouchableOpacity>
            </View>

            {modo === 'register' && (
              <View style={styles.campo}>
                <Text style={styles.label}>Nombre</Text>
                <View style={[styles.inputShell, !!errNombre && styles.inputError]}>
                  <Ionicons name="person-outline" size={20} color={theme.colors.textFaint} />
                  <TextInput
                    style={styles.input}
                    placeholder="Cómo quieres que te llamemos"
                    placeholderTextColor={theme.colors.textFaint}
                    value={nombre}
                    onChangeText={(v) => { setNombre(v); setErrNombre(''); }}
                    autoCapitalize="words"
                  />
                </View>
                {!!errNombre && <Text style={styles.fieldError}>{errNombre}</Text>}
              </View>
            )}

            <View style={styles.campo}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputShell, !!errEmail && styles.inputError]}>
                <Ionicons name="mail-outline" size={20} color={theme.colors.textFaint} />
                <TextInput
                  style={styles.input}
                  placeholder="tu@email.com"
                  placeholderTextColor={theme.colors.textFaint}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setErrEmail(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
              </View>
              {!!errEmail && <Text style={styles.fieldError}>{errEmail}</Text>}
            </View>

            <View style={styles.campo}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={[styles.inputShell, !!errPassword && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textFaint} />
                <TextInput
                  style={styles.input}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={theme.colors.textFaint}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setErrPassword(''); }}
                  secureTextEntry
                  autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                />
              </View>
              {!!errPassword && <Text style={styles.fieldError}>{errPassword}</Text>}
            </View>

            {!!errGeneral && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color={theme.colors.danger} />
                <Text style={styles.errorGeneral}>{errGeneral}</Text>
              </View>
            )}

            <Tappable
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.onPrimary} />
              ) : (
                <>
                  <Text style={styles.btnText}>
                    {modo === 'login' ? 'Ingresar' : 'Registrarse'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color={theme.colors.onPrimary} />
                </>
              )}
            </Tappable>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeThemedStyles((t) => ({
  flex: { flex: 1, backgroundColor: t.colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 58,
    paddingBottom: 32,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orbe: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: t.colors.primarySoft,
    top: -125,
    right: -95,
  },
  shell: { width: '100%', maxWidth: 460, alignSelf: 'center' },
  brand: { alignItems: 'center', marginBottom: 28 },
  brandIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primary,
    marginBottom: 14,
    ...t.shadows.cardStrong,
  },
  marca: {
    ...t.typography.fonts.bold,
    color: t.colors.accent,
    fontSize: t.fontSize(12),
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  titulo: {
    ...t.typography.type.display,
    fontSize: t.fontSize(29),
    lineHeight: Math.round(t.fontSize(29) * 1.2),
    textAlign: 'center',
    color: t.colors.text,
    marginBottom: 9,
  },
  subtitulo: {
    ...t.typography.type.body,
    color: t.colors.textMuted,
    textAlign: 'center',
    maxWidth: 310,
  },
  formCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusXl,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    padding: 18,
    ...t.shadows.cardStrong,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: t.colors.background,
    borderRadius: t.shape.radiusMd,
    padding: 4,
    marginBottom: 22,
  },
  toggleBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: t.shape.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
    ...t.shadows.card,
  },
  toggleText: {
    color: t.colors.textMuted,
    ...t.typography.fonts.semibold,
    fontSize: t.fontSize(15),
  },
  toggleTextActive: { color: t.colors.primary },
  campo: { marginBottom: 15 },
  label: {
    ...t.typography.fonts.semibold,
    color: t.colors.text,
    fontSize: t.fontSize(13),
    marginBottom: 7,
    marginLeft: 2,
  },
  inputShell: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: t.colors.background,
    borderRadius: t.shape.radiusMd,
    paddingHorizontal: 14,
    borderWidth: t.shape.borderMedium,
    borderColor: t.colors.border,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: t.fontSize(16),
    color: t.colors.text,
    ...t.typography.fonts.medium,
  },
  inputError: { borderColor: t.colors.danger },
  fieldError: {
    color: t.colors.danger,
    fontSize: t.fontSize(12),
    marginTop: 5,
    marginLeft: 3,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: t.colors.dangerSoft,
    borderRadius: t.shape.radiusSm,
    padding: 11,
    marginBottom: 12,
  },
  errorGeneral: {
    flex: 1,
    color: t.colors.danger,
    fontSize: t.fontSize(14),
  },
  btn: {
    minHeight: 54,
    flexDirection: 'row',
    gap: 9,
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  btnDisabled: { backgroundColor: t.colors.primaryDisabled },
  btnText: {
    color: t.colors.onPrimary,
    fontSize: t.fontSize(16),
    ...t.typography.fonts.bold,
  },
}));
