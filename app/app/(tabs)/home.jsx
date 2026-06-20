import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated,
} from 'react-native';
import { apiCreateMoodEntry, apiGetRandomActivity } from '../../services/api';

const GREEN = '#2e7d32';

const MOODS = [
  { value: 'FELIZ',   label: 'Feliz',   emoji: '😊' },
  { value: 'TRISTE',  label: 'Triste',  emoji: '😢' },
  { value: 'ANSIOSO', label: 'Ansioso', emoji: '😰' },
  { value: 'CALMADO', label: 'Calmado', emoji: '😌' },
  { value: 'ENOJADO', label: 'Enojado', emoji: '😠' },
  { value: 'NEUTRO',  label: 'Neutro',  emoji: '😐' },
];

const CATEGORIA = {
  social:          { color: '#1565c0', icon: '👥' },
  físico:          { color: '#e65100', icon: '🏃' },
  creativo:        { color: '#6a1b9a', icon: '🎨' },
  relajación:      { color: '#00838f', icon: '🌊' },
  reflexión:       { color: '#2e7d32', icon: '📝' },
  entretenimiento: { color: '#c62828', icon: '🎬' },
  productividad:   { color: '#f57f17', icon: '⚡' },
  mindfulness:     { color: '#00695c', icon: '🧘' },
};

export default function HomeScreen() {
  const [selectedMood, setSelectedMood] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingOtra, setLoadingOtra] = useState(false);
  const [actividad, setActividad] = useState(null);
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const mostrarConFade = (nuevaActividad) => {
    fadeAnim.setValue(0);
    setActividad(nuevaActividad);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  };

  const seleccionarMood = (value) => {
    setSelectedMood(value);
    setActividad(null);
    setError('');
  };

  const handleRegistrar = async () => {
    if (!selectedMood) { setError('Selecciona cómo te sientes primero'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await apiCreateMoodEntry(selectedMood);
      if (data.error) { setError(data.error); return; }
      mostrarConFade(data.actividadSugerida);
    } catch {
      setError('Error de conexión. Verifica la IP en config.js');
    } finally {
      setLoading(false);
    }
  };

  const handleOtraIdea = async () => {
    setLoadingOtra(true);
    try {
      const data = await apiGetRandomActivity(selectedMood, actividad?.id);
      if (data.activity) mostrarConFade(data.activity);
    } catch {
      // falla silenciosamente — la tarjeta actual se mantiene
    } finally {
      setLoadingOtra(false);
    }
  };

  const handleNuevo = () => {
    setSelectedMood(null);
    setActividad(null);
    setError('');
  };

  const cat = actividad ? (CATEGORIA[actividad.categoria] ?? { color: '#555', icon: '✨' }) : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pregunta}>¿Cómo te sientes hoy?</Text>

      <View style={styles.grid}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.value}
            style={[styles.moodBtn, selectedMood === mood.value && styles.moodBtnActive]}
            onPress={() => seleccionarMood(mood.value)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{mood.emoji}</Text>
            <Text style={[styles.moodLabel, selectedMood === mood.value && styles.moodLabelActive]}>
              {mood.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {!actividad ? (
        <TouchableOpacity
          style={[styles.btn, (!selectedMood || loading) && styles.btnDisabled]}
          onPress={handleRegistrar}
          disabled={loading || !selectedMood}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Ver actividad sugerida</Text>}
        </TouchableOpacity>
      ) : (
        <Animated.View style={[styles.card, { opacity: fadeAnim, borderLeftColor: cat.color }]}>
          <Text style={[styles.cardTag, { color: cat.color }]}>
            {cat.icon}{'  '}{actividad.categoria.toUpperCase()}
          </Text>
          <Text style={styles.cardNombre}>{actividad.nombre}</Text>
          <Text style={styles.cardDesc}>{actividad.descripcion}</Text>

          <TouchableOpacity
            style={[styles.btnOtra, { borderColor: cat.color }, loadingOtra && styles.btnDisabled]}
            onPress={handleOtraIdea}
            disabled={loadingOtra}
          >
            <Text style={[styles.btnOtraText, { color: loadingOtra ? '#999' : cat.color }]}>
              {loadingOtra ? 'Buscando...' : '💡 Quiero otra idea'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnOutline} onPress={handleNuevo}>
            <Text style={styles.btnOutlineText}>Registrar otro estado</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  pregunta: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 24,
  },
  moodBtn: {
    width: '44%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e8e8e8',
  },
  moodBtnActive: { borderColor: GREEN, backgroundColor: '#e8f5e9' },
  emoji: { fontSize: 38, marginBottom: 6 },
  moodLabel: { fontSize: 14, fontWeight: '600', color: '#666' },
  moodLabelActive: { color: GREEN },
  error: { color: '#c62828', textAlign: 'center', marginBottom: 12, fontSize: 14 },
  btn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#a5d6a7' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 22,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTag: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  cardNombre: { fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 10 },
  cardDesc: { fontSize: 15, color: '#555', lineHeight: 23, marginBottom: 18 },
  btnOtra: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnOtraText: { fontWeight: '600', fontSize: 15 },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnOutlineText: { color: '#888', fontWeight: '600', fontSize: 15 },
});
