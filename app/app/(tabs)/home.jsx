import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated, Modal,
} from 'react-native';
import { apiCreateMoodEntry, apiGetCheers } from '../../services/api';

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
  const slideAnim = useRef(new Animated.Value(20)).current;
  const cheerFadeAnim = useRef(new Animated.Value(0)).current;
  const cheerSlideAnim = useRef(new Animated.Value(20)).current;
  const scaleVer = useRef(new Animated.Value(1)).current;
  const scaleOtra = useRef(new Animated.Value(1)).current;

  const [cheers, setCheers] = useState([]);
  const [cheerIdx, setCheerIdx] = useState(0);
  const [showCheerModal, setShowCheerModal] = useState(false);

  useEffect(() => {
    apiGetCheers()
      .then((data) => {
        if (data.cheers && data.cheers.length > 0) {
          setCheers(data.cheers);
          setCheerIdx(0);
          setShowCheerModal(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (showCheerModal) {
      cheerFadeAnim.setValue(0);
      cheerSlideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(cheerFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(cheerSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [showCheerModal]);

  const cerrarCheerModal = () => {
    if (cheerIdx < cheers.length - 1) {
      setCheerIdx((i) => i + 1);
    } else {
      setShowCheerModal(false);
    }
  };

  const mostrarConFade = (nuevaActividad) => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    setActividad(nuevaActividad);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
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
    if (!selectedMood) return;
    setLoadingOtra(true);
    try {
      const data = await apiCreateMoodEntry(selectedMood);
      if (data.actividadSugerida) mostrarConFade(data.actividadSugerida);
    } catch {
      // falla silenciosamente
    } finally {
      setLoadingOtra(false);
    }
  };

  const cat = actividad ? (CATEGORIA[actividad.categoria] ?? { color: '#555', icon: '✨' }) : null;
  const cheerActual = cheers[cheerIdx];

  return (
    <View style={{ flex: 1 }}>
      <Modal visible={showCheerModal} transparent animationType="none">
        <Animated.View style={[styles.cheerOverlay, { opacity: cheerFadeAnim }]}>
          <Animated.View style={[styles.cheerBox, { transform: [{ translateY: cheerSlideAnim }] }]}>
            <Text style={styles.cheerTitle}>Tienes un mensaje</Text>
            {cheerActual && (
              <View>
                <Text style={styles.cheerFrom}>{cheerActual.fromNombre} te envio:</Text>
                <Text style={styles.cheerMsg}>{cheerActual.message}</Text>
              </View>
            )}
            {cheers.length > 1 && (
              <Text style={styles.cheerCount}>{cheerIdx + 1} / {cheers.length}</Text>
            )}
            <TouchableOpacity style={styles.cheerBtn} onPress={cerrarCheerModal}>
              <Text style={styles.cheerBtnText}>
                {cheerIdx < cheers.length - 1 ? 'Siguiente' : 'Gracias'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pregunta}>Como te sientes hoy?</Text>

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
          <Animated.View style={{ transform: [{ scale: scaleVer }] }}>
            <TouchableOpacity
              style={[styles.btn, (!selectedMood || loading) && styles.btnDisabled]}
              onPress={handleRegistrar}
              onPressIn={() => Animated.spring(scaleVer, { toValue: 0.97, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(scaleVer, { toValue: 1, useNativeDriver: true }).start()}
              disabled={loading || !selectedMood}
              activeOpacity={0.9}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Ver actividad sugerida</Text>}
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.card, { opacity: fadeAnim, borderLeftColor: cat.color, transform: [{ translateY: slideAnim }] }]}>
            <Text style={[styles.cardTag, { color: cat.color }]}>
              {cat.icon}{'  '}{actividad.categoria.toUpperCase()}
            </Text>
            <Text style={styles.cardNombre}>{actividad.nombre}</Text>
            <Text style={styles.cardDesc}>{actividad.descripcion}</Text>

            <Animated.View style={{ transform: [{ scale: scaleOtra }] }}>
              <TouchableOpacity
                style={[styles.btnOtra, { borderColor: cat.color }, loadingOtra && styles.btnDisabled]}
                onPress={handleOtraIdea}
                onPressIn={() => Animated.spring(scaleOtra, { toValue: 0.97, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(scaleOtra, { toValue: 1, useNativeDriver: true }).start()}
                disabled={loadingOtra}
                activeOpacity={0.9}
              >
                <Text style={[styles.btnOtraText, { color: loadingOtra ? '#999' : cat.color }]}>
                  {loadingOtra ? 'Buscando...' : 'Quiero otra idea'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
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
  cardTag: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1.2, marginBottom: 8 },
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
  cheerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  cheerBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cheerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  cheerFrom: { fontSize: 13, color: '#888', marginBottom: 10, textAlign: 'center' },
  cheerMsg: { fontSize: 22, textAlign: 'center', color: '#222', marginBottom: 20, lineHeight: 32 },
  cheerCount: { fontSize: 12, color: '#bbb', marginBottom: 12 },
  cheerBtn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 32,
  },
  cheerBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
