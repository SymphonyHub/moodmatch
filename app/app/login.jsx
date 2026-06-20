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

export default function LoginScreen() {
  const [modo, setModo] = useState('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Email y contraseña son requeridos');
      return;
    }
    if (modo === 'register' && !nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setLoading(true);
    try {
      const data =
        modo === 'login'
          ? await apiLogin(email.trim(), password)
          : await apiRegister(nombre.trim(), email.trim(), password);

      if (data.error) {
        setError(data.error);
        return;
      }

      await AsyncStorage.setItem('token', data.token);
      router.replace('/(tabs)/home');
    } catch {
      setError('Error de conexión. Verifica la IP en config.js');
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
          <TextInput
            style={styles.input}
            placeholder="Nombre"
            placeholderTextColor="#aaa"
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

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
  container: {
    flexGrow: 1,
    padding: 28,
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 34,
    fontWeight: 'bold',
    textAlign: 'center',
    color: GREEN,
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 36,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleActive: { backgroundColor: '#fff' },
  toggleText: { color: '#888', fontWeight: '600', fontSize: 15 },
  toggleTextActive: { color: GREEN },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#222',
  },
  error: {
    color: '#c62828',
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 14,
  },
  btn: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { backgroundColor: '#a5d6a7' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
