import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { apiLogin, apiRegister, apiUpdateThemePreference } from '../services/api';
import { useTheme, makeThemedStyles } from '../theme/ThemeContext';
import { VALID_THEME_CHOICES } from '../theme/themes';

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export default function LoginScreen() {
  const { theme, themeChoice, setThemeChoice } = useTheme();
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

      // Reconciliar tema con el perfil: si el servidor tiene una preferencia
      // guardada (otro dispositivo o reinstalación), se adopta; si no, se sube
      // la elección local para que quede respaldada.
      const serverPref = data.user?.themePreference;
      if (serverPref && VALID_THEME_CHOICES.includes(serverPref)) {
        if (serverPref !== themeChoice) setThemeChoice(serverPref, { sync: false });
      } else {
        apiUpdateThemePreference(themeChoice).catch(() => {});
      }

      router.replace('/(tabs)/home');
    } catch {
      setErrGeneral('No pudimos conectar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style={theme.statusBar.onBackground} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>MoodMatch 🌿</Text>
        <Text style={styles.subtitulo}>Tu bienestar, un ánimo a la vez</Text>

        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, modo === 'login' && styles.toggleActive]}
            onPress={() => cambiarModo('login')}
          >
            <Text style={[styles.toggleText, modo === 'login' && styles.toggleTextActive]}>
              Ingresar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, modo === 'register' && styles.toggleActive]}
            onPress={() => cambiarModo('register')}
          >
            <Text style={[styles.toggleText, modo === 'register' && styles.toggleTextActive]}>
              Registrarse
            </Text>
          </TouchableOpacity>
        </View>

        {modo === 'register' && (
          <>
            <TextInput
              style={[styles.input, !!errNombre && styles.inputError]}
              placeholder="Nombre"
              placeholderTextColor={theme.colors.textFaint}
              value={nombre}
              onChangeText={(v) => { setNombre(v); setErrNombre(''); }}
              autoCapitalize="words"
            />
            {!!errNombre && <Text style={styles.fieldError}>{errNombre}</Text>}
          </>
        )}

        <TextInput
          style={[styles.input, !!errEmail && styles.inputError]}
          placeholder="Email"
          placeholderTextColor={theme.colors.textFaint}
          value={email}
          onChangeText={(v) => { setEmail(v); setErrEmail(''); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!!errEmail && <Text style={styles.fieldError}>{errEmail}</Text>}

        <TextInput
          style={[styles.input, !!errPassword && styles.inputError]}
          placeholder="Contraseña"
          placeholderTextColor={theme.colors.textFaint}
          value={password}
          onChangeText={(v) => { setPassword(v); setErrPassword(''); }}
          secureTextEntry
        />
        {!!errPassword && <Text style={styles.fieldError}>{errPassword}</Text>}

        {!!errGeneral && <Text style={styles.errorGeneral}>{errGeneral}</Text>}

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <Text style={styles.btnText}>
              {modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeThemedStyles((t) => ({
  flex: { flex: 1, backgroundColor: t.colors.background },
  container: { flexGrow: 1, padding: 28, justifyContent: 'center' },
  titulo: {
    fontSize: t.fontSize(34),
    ...t.typography.fonts.bold,
    textAlign: 'center',
    color: t.colors.primary,
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: t.fontSize(14),
    color: t.colors.textMuted,
    textAlign: 'center',
    marginBottom: 36,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: t.colors.border,
    borderRadius: t.shape.radiusMd,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: t.shape.radiusSm,
    alignItems: 'center',
  },
  toggleActive: { backgroundColor: t.colors.surface },
  toggleText: {
    color: t.colors.textMuted,
    ...t.typography.fonts.semibold,
    fontSize: t.fontSize(15),
  },
  toggleTextActive: { color: t.colors.primary },
  input: {
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusMd,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: t.fontSize(16),
    marginBottom: 4,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    color: t.colors.text,
  },
  inputError: { borderColor: t.colors.danger },
  fieldError: {
    color: t.colors.danger,
    fontSize: t.fontSize(12),
    marginBottom: 10,
    marginLeft: 4,
  },
  errorGeneral: {
    color: t.colors.danger,
    marginBottom: 12,
    textAlign: 'center',
    fontSize: t.fontSize(14),
    marginTop: 4,
  },
  btn: {
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { backgroundColor: t.colors.primaryDisabled },
  btnText: {
    color: t.colors.onPrimary,
    fontSize: t.fontSize(16),
    ...t.typography.fonts.bold,
  },
}));
