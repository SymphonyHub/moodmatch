import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { apiGetFriendships } from '../../services/api';

const GREEN = '#2e7d32';

const MOOD_INFO = {
  FELIZ:   { emoji: '😊', label: 'Feliz',   color: '#2e7d32' },
  TRISTE:  { emoji: '😢', label: 'Triste',  color: '#1565c0' },
  ANSIOSO: { emoji: '😰', label: 'Ansioso', color: '#e65100' },
  CALMADO: { emoji: '😌', label: 'Calmado', color: '#00695c' },
  ENOJADO: { emoji: '😠', label: 'Enojado', color: '#c62828' },
  NEUTRO:  { emoji: '😐', label: 'Neutro',  color: '#616161' },
};

export default function AmigosScreen() {
  const [amigos, setAmigos] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGetFriendships();
      if (data.amigos) setAmigos(data.amigos);
    } finally {
      setLoading(false);
    }
  }, []);

  // Recarga cada vez que el usuario vuelve a esta pestaña
  useFocusEffect(cargar);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Mis amigos</Text>
      <Text style={styles.subtitulo}>
        El estado de ánimo más reciente de cada amigo
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={GREEN} style={styles.spinner} />
      ) : amigos.length === 0 ? (
        <View style={styles.vacioCont}>
          <Text style={styles.vacioEmoji}>👥</Text>
          <Text style={styles.vacioTxt}>Aún no tienes amigos agregados.</Text>
          <Text style={styles.vacioHint}>
            Ve a la pestaña "Mi QR" y escanea el código de alguien para empezar.
          </Text>
        </View>
      ) : (
        amigos.map((amigo) => {
          const mood = amigo.moodReciente ? MOOD_INFO[amigo.moodReciente] : null;
          return (
            <View key={amigo.id} style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>
                  {amigo.nombre.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.nombre}>{amigo.nombre}</Text>
                {mood ? (
                  <Text style={[styles.mood, { color: mood.color }]}>
                    {mood.emoji}{'  '}{mood.label}
                  </Text>
                ) : (
                  <Text style={styles.moodNulo}>Sin registrar aún</Text>
                )}
              </View>
            </View>
          );
        })
      )}

      {!loading && amigos.length > 0 && (
        <TouchableOpacity style={styles.btnRecargar} onPress={cargar}>
          <Text style={styles.btnRecargarTxt}>Actualizar</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    marginTop: 4,
  },
  subtitulo: {
    fontSize: 13,
    color: '#999',
    marginBottom: 22,
  },
  spinner: { marginTop: 40 },
  vacioCont: { alignItems: 'center', marginTop: 48, paddingHorizontal: 24 },
  vacioEmoji: { fontSize: 52, marginBottom: 16 },
  vacioTxt: { fontSize: 16, fontWeight: '600', color: '#555', textAlign: 'center', marginBottom: 8 },
  vacioHint: { fontSize: 13, color: '#aaa', textAlign: 'center', lineHeight: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarTxt: { fontSize: 20, fontWeight: 'bold', color: GREEN },
  info: { flex: 1 },
  nombre: { fontSize: 16, fontWeight: '600', color: '#222', marginBottom: 4 },
  mood: { fontSize: 14, fontWeight: '500' },
  moodNulo: { fontSize: 14, color: '#ccc' },
  btnRecargar: {
    marginTop: 8,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ccc',
  },
  btnRecargarTxt: { color: '#888', fontSize: 14, fontWeight: '600' },
});
