import { useState } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator,
} from 'react-native';
import { apiCreateMoodEntry } from '../../services/api';
import { MOODS } from '../../constants/moods';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '../../constants/categories';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../../components/Tappable';
import Entrance from '../../components/Entrance';

export default function HomeScreen() {
  const { theme } = useTheme();
  const styles = useStyles();

  const [selectedMood, setSelectedMood] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingOtra, setLoadingOtra] = useState(false);
  const [actividad, setActividad] = useState(null);
  const [error, setError] = useState('');

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
      setActividad(data.actividadSugerida);
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
      if (data.actividadSugerida) setActividad(data.actividadSugerida);
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
  // Los mensajes de amigos ya no interrumpen con un modal al entrar:
  // viven en el chat y se anuncian con el badge de la pestaña Amigos.
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pregunta}>Como te sientes hoy?</Text>

        <View style={styles.grid}>
          {MOODS.map((mood) => (
            <Tappable
              key={mood.value}
              wrapperStyle={styles.moodBtnWrapper}
              style={[styles.moodBtn, selectedMood === mood.value && styles.moodBtnActive]}
              onPress={() => seleccionarMood(mood.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{mood.emoji}</Text>
              <Text style={[styles.moodLabel, selectedMood === mood.value && styles.moodLabelActive]}>
                {mood.label}
              </Text>
            </Tappable>
          ))}
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        {!actividad ? (
          <Tappable
            style={[styles.btn, (!selectedMood || loading) && styles.btnDisabled]}
            onPress={handleRegistrar}
            disabled={loading || !selectedMood}
          >
            {loading
              ? <ActivityIndicator color={theme.colors.onPrimary} />
              : <Text style={styles.btnText}>Ver actividad sugerida</Text>}
          </Tappable>
        ) : (
          <Entrance
            key={actividad.id}
            style={[styles.card, { borderLeftColor: cat.color }]}
          >
            <Text style={[styles.cardTag, { color: cat.color }]}>
              {cat.icon}{'  '}{actividad.categoria.toUpperCase()}
            </Text>
            <Text style={styles.cardNombre}>{actividad.nombre}</Text>
            <Text style={styles.cardDesc}>{actividad.descripcion}</Text>

            <Tappable
              style={[styles.btnOtra, { borderColor: cat.color }, loadingOtra && styles.btnDisabled]}
              onPress={handleOtraIdea}
              disabled={loadingOtra}
              haptic={false}
            >
              <Text style={[styles.btnOtraText, { color: loadingOtra ? theme.colors.textFaint : cat.color }]}>
                {loadingOtra ? 'Buscando...' : 'Quiero otra idea'}
              </Text>
            </Tappable>
          </Entrance>
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  container: { padding: 20, paddingBottom: 40 },
  pregunta: {
    ...t.typography.type.title,
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
  moodBtnWrapper: { width: '44%' },
  moodBtn: {
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
    ...t.typography.type.title,
    color: t.colors.text,
    marginBottom: 10,
  },
  cardDesc: {
    ...t.typography.type.body,
    color: t.colors.textMuted,
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
}));
