import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Modal, Animated,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { apiGetFriendships, apiSendCheer, apiGetSocialActivities } from '../../services/api';

const GREEN = '#2e7d32';

const MOOD_INFO = {
  FELIZ:   { emoji: '😊', label: 'Feliz',   color: '#2e7d32' },
  TRISTE:  { emoji: '😢', label: 'Triste',  color: '#1565c0' },
  ANSIOSO: { emoji: '😰', label: 'Ansioso', color: '#e65100' },
  CALMADO: { emoji: '😌', label: 'Calmado', color: '#00695c' },
  ENOJADO: { emoji: '😠', label: 'Enojado', color: '#c62828' },
  NEUTRO:  { emoji: '😐', label: 'Neutro',  color: '#616161' },
};

const CHEERS = [
  '💚 Pensando en ti',
  '✨ Espero que tengas un buen día',
  '🤗 Aquí estoy si me necesitas',
  '🌟 Eres más fuerte de lo que crees',
  '☕ ¿Una pausa te vendría bien?',
  '🙌 ¡Vas muy bien, sigue así!',
];

function ScaleBtn({ wrapperStyle, style, onPress, children, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[wrapperStyle, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={style}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        disabled={disabled}
        activeOpacity={0.9}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

function FriendCard({ amigo, onAnimo, index }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const mood = amigo.moodReciente ? MOOD_INFO[amigo.moodReciente] : null;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarTxt}>{amigo.nombre.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.nombre}>{amigo.nombre}</Text>
        {mood ? (
          <Text style={[styles.mood, { color: mood.color }]}>{mood.emoji}{'  '}{mood.label}</Text>
        ) : (
          <Text style={styles.moodNulo}>Sin registrar aún</Text>
        )}
      </View>
      <ScaleBtn style={styles.btnAnimo} onPress={() => onAnimo(amigo)}>
        <Text style={styles.btnAnimoText}>💚 Ánimo</Text>
      </ScaleBtn>
    </Animated.View>
  );
}

export default function AmigosScreen() {
  const [amigos, setAmigos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actividades, setActividades] = useState([]);

  const [cheerTarget, setCheerTarget] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [cheerOk, setCheerOk] = useState('');

  const modalFade = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (cheerTarget) {
      modalFade.setValue(0);
      modalSlide.setValue(50);
      Animated.parallel([
        Animated.timing(modalFade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(modalSlide, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [cheerTarget]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [dataAmigos, dataActs] = await Promise.all([
        apiGetFriendships(),
        apiGetSocialActivities(),
      ]);
      if (dataAmigos.amigos) setAmigos(dataAmigos.amigos);
      if (dataActs.activities) setActividades(dataActs.activities.slice(0, 3));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(cargar);

  const enviarCheer = async (message) => {
    if (!cheerTarget) return;
    setEnviando(true);
    try {
      const data = await apiSendCheer(cheerTarget.id, message);
      if (!data.error) {
        setCheerOk(`¡Mensaje enviado a ${cheerTarget.nombre}! 💚`);
      }
    } catch {
      // falla silenciosamente
    } finally {
      setEnviando(false);
      setCheerTarget(null);
    }
  };

  return (
    <>
      <Modal
        visible={!!cheerTarget}
        transparent
        animationType="none"
        onRequestClose={() => setCheerTarget(null)}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: modalFade }]}>
          <Animated.View style={[styles.modalBox, { transform: [{ translateY: modalSlide }] }]}>
            <Text style={styles.modalTitle}>
              Envía un ánimo a {cheerTarget?.nombre}
            </Text>
            {CHEERS.map((msg) => (
              <ScaleBtn
                key={msg}
                style={[styles.cheerOption, enviando && styles.cheerOptionDisabled]}
                onPress={() => enviarCheer(msg)}
                disabled={enviando}
              >
                <Text style={styles.cheerOptionText}>{msg}</Text>
              </ScaleBtn>
            ))}
            <ScaleBtn style={styles.modalCancelar} onPress={() => setCheerTarget(null)}>
              <Text style={styles.modalCancelarText}>Cancelar</Text>
            </ScaleBtn>
          </Animated.View>
        </Animated.View>
      </Modal>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.titulo}>Mis amigos</Text>
        <Text style={styles.subtitulo}>
          El estado de ánimo más reciente de cada amigo
        </Text>

        {!!cheerOk && (
          <View style={styles.bannerOk}>
            <Text style={styles.bannerOkText}>{cheerOk}</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={GREEN} style={styles.spinner} />
        ) : amigos.length === 0 ? (
          <View style={styles.vacioCont}>
            <Text style={styles.vacioEmoji}>👥</Text>
            <Text style={styles.vacioTxt}>Aún no tienes amigos agregados</Text>
            <Text style={styles.vacioHint}>
              Ve a la pestaña "Mi QR" y escanea el código de alguien para empezar.
            </Text>
          </View>
        ) : (
          <>
            {amigos.map((amigo, i) => (
              <FriendCard
                key={amigo.id}
                amigo={amigo}
                index={i}
                onAnimo={(a) => { setCheerOk(''); setCheerTarget(a); }}
              />
            ))}

            <ScaleBtn
              wrapperStyle={{ alignSelf: 'center', marginTop: 8, marginBottom: 24 }}
              style={styles.btnRecargar}
              onPress={cargar}
            >
              <Text style={styles.btnRecargarTxt}>Actualizar</Text>
            </ScaleBtn>

            {actividades.length > 0 && (
              <View style={styles.socialSection}>
                <Text style={styles.socialTitulo}>Para hacer con amigos</Text>
                {actividades.map((act) => (
                  <View key={act.id} style={styles.actCard}>
                    <Text style={styles.actNombre}>{act.nombre}</Text>
                    <Text style={styles.actDesc}>{act.descripcion}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 4, marginTop: 4 },
  subtitulo: { fontSize: 13, color: '#999', marginBottom: 22 },
  spinner: { marginTop: 40 },
  bannerOk: { backgroundColor: '#e8f5e9', borderRadius: 10, padding: 12, marginBottom: 16 },
  bannerOkText: { color: GREEN, fontWeight: '600', textAlign: 'center', fontSize: 14 },
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
  btnAnimo: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  btnAnimoText: { fontSize: 13, fontWeight: '600', color: GREEN },
  btnRecargar: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ccc',
  },
  btnRecargarTxt: { color: '#888', fontSize: 14, fontWeight: '600' },
  socialSection: { marginTop: 4 },
  socialTitulo: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  actCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#1565c0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  actNombre: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 4 },
  actDesc: { fontSize: 13, color: '#666', lineHeight: 19 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 16, textAlign: 'center' },
  cheerOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  cheerOptionDisabled: { opacity: 0.5 },
  cheerOptionText: { fontSize: 15, color: '#333' },
  modalCancelar: { marginTop: 8, alignItems: 'center', paddingVertical: 12 },
  modalCancelarText: { color: '#aaa', fontSize: 15 },
});
