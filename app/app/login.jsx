import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { apiLogin, apiRegister } from '../services/api';

const GREEN = '#2e7d32';

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export default function LoginScreen() {
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
      router.replace('/(tabs)/home');
    } catch {
      setErrGeneral('Error de conexión. Verifica la IP en config.js');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
              placeholderTextColor="#aaa"
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
          placeholderTextColor="#aaa"
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
          placeholderTextColor="#aaa"
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
            <ActivityIndicator color="#fff" />
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flexGrow: 1, padding: 28, justifyContent: 'center' },
  titulo: { fontSize: 34, fontWeight: 'bold', textAlign: 'center', color: GREEN, marginBottom: 6 },
  subtitulo: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 36 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  toggleActive: { backgroundColor: '#fff' },
  toggleText: { color: '#888', fontWeight: '600', fontSize: 15 },
  toggleTextActive: { color: GREEN },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#222',
  },
  inputError: { borderColor: '#c62828' },
  fieldError: { color: '#c62828', fontSize: 12, marginBottom: 10, marginLeft: 4 },
  errorGeneral: { color: '#c62828', marginBottom: 12, textAlign: 'center', fontSize: 14, marginTop: 4 },
  btn: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { backgroundColor: '#a5d6a7' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
