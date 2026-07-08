import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  ScrollView, ActivityIndicator, Animated, Modal,
} from 'react-native';
import { apiCreateMoodEntry, apiGetCheers } from '../../services/api';
import { MOODS } from '../../constants/moods';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '../../constants/categories';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';

export default function HomeScreen() {
  const { theme } = useTheme();
  const styles = useStyles();

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
      setError('No pudimos conectar. Revisa tu conexión e intenta de nuevo.');
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

  const cat = actividad
    ? {
        color: theme.colors.categories[actividad.categoria] ?? theme.colors.textMuted,
        icon: CATEGORY_ICONS[actividad.categoria] ?? DEFAULT_CATEGORY_ICON,
      }
    : null;
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
                ? <ActivityIndicator color={theme.colors.onPrimary} />
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
                <Text style={[styles.btnOtraText, { color: loadingOtra ? theme.colors.textFaint : cat.color }]}>
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

const useStyles = makeThemedStyles((t) => ({
  container: { padding: 20, paddingBottom: 40 },
  pregunta: {
    fontSize: t.fontSize(20),
    ...t.typography.fonts.bold,
    color: t.colors.text,
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
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusLg,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: t.shape.borderThick,
    borderColor: t.colors.border,
    ...t.shadows.card,
  },
  moodBtnActive: {
    borderColor: t.colors.primary,
    backgroundColor: t.colors.primarySoft,
  },
  emoji: { fontSize: 38, marginBottom: 6 },
  moodLabel: {
    fontSize: t.fontSize(14),
    ...t.typography.fonts.semibold,
    color: t.colors.textMuted,
  },
  moodLabelActive: { color: t.colors.primary },
  error: {
    color: t.colors.danger,
    textAlign: 'center',
    marginBottom: 12,
    fontSize: t.fontSize(14),
  },
  btn: {
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: t.colors.primaryDisabled },
  btnText: {
    color: t.colors.onPrimary,
    fontSize: t.fontSize(16),
    ...t.typography.fonts.bold,
  },
  card: {
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.shape.radiusLg,
    padding: 22,
    borderLeftWidth: 5,
    ...t.shadows.cardStrong,
  },
  cardTag: {
    fontSize: t.fontSize(11),
    ...t.typography.fonts.bold,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  cardNombre: {
    fontSize: t.fontSize(20),
    ...t.typography.fonts.bold,
    color: t.colors.text,
    marginBottom: 10,
  },
  cardDesc: {
    fontSize: t.fontSize(15),
    color: t.colors.textMuted,
    lineHeight: Math.round(t.fontSize(15) * 1.55),
    marginBottom: 18,
  },
  btnOtra: {
    borderWidth: t.shape.borderMedium,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnOtraText: {
    ...t.typography.fonts.semibold,
    fontSize: t.fontSize(15),
  },
  cheerOverlay: {
    flex: 1,
    backgroundColor: t.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  cheerBox: {
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.shape.radiusXl,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    ...t.shadows.modal,
  },
  cheerTitle: {
    fontSize: t.fontSize(18),
    ...t.typography.fonts.bold,
    color: t.colors.text,
    marginBottom: 16,
  },
  cheerFrom: {
    fontSize: t.fontSize(13),
    color: t.colors.textMuted,
    marginBottom: 10,
    textAlign: 'center',
  },
  cheerMsg: {
    fontSize: t.fontSize(22),
    textAlign: 'center',
    color: t.colors.text,
    marginBottom: 20,
    lineHeight: Math.round(t.fontSize(22) * 1.45),
  },
  cheerCount: {
    fontSize: t.fontSize(12),
    color: t.colors.textFaint,
    marginBottom: 12,
  },
  cheerBtn: {
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 13,
    paddingHorizontal: 32,
  },
  cheerBtnText: {
    color: t.colors.onPrimary,
    ...t.typography.fonts.bold,
    fontSize: t.fontSize(15),
  },
}));
