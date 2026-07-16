import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { apiGetLatestMoodEntry, apiNextSuggestion } from '../../services/api';
import { MOOD_INFO } from '../../constants/moods';
import { ENCABEZADOS, tiempoRelativo } from '../../features/wellness/paraMi';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../Tappable';
import Entrance from '../Entrance';
import ActivitySuggestionCard from './ActivitySuggestionCard';

/**
 * Contenido de la pestaña "Para mí" del Wellness Hub, montado por
 * app/wellness/ParaMiPanel.jsx dentro de la pantalla actividades.jsx del
 * Agente A. Autosuficiente: sin props obligatorias, hace su propio fetch
 * (GET /api/mood-entries/latest) al enfocar, maneja cargando / vacío /
 * error / contenido y usa el tema. La pestaña "Con amigos" es del Agente C
 * — este componente no la conoce.
 */
export default function ParaMiTab() {
  const { theme } = useTheme();
  const styles = useStyles();

  // 'cargando' | 'vacio' | 'ok' | 'error'
  const [fase, setFase] = useState('cargando');
  const [moodEntry, setMoodEntry] = useState(null);
  const [actividad, setActividad] = useState(null);
  const [loadingOtra, setLoadingOtra] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const data = await apiGetLatestMoodEntry();
      if (data.moodEntry && data.actividad) {
        setMoodEntry(data.moodEntry);
        setActividad(data.actividad);
        setFase('ok');
      } else if (data.error) {
        setFase('error');
      } else {
        setFase('vacio');
      }
    } catch {
      setFase('error');
    }
  }, []);

  // Refresca al enfocar: si el usuario registró un ánimo nuevo en el chat y
  // llega aquí, muestra esa sugerencia sin acciones extra.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const handleOtraIdea = async () => {
    if (!moodEntry) return;
    setLoadingOtra(true);
    try {
      const data = await apiNextSuggestion(moodEntry.id);
      if (data.activity) setActividad(data.activity);
    } catch {
      // falla silenciosamente: se conserva la actividad actual
    } finally {
      setLoadingOtra(false);
    }
  };

  if (fase === 'cargando') {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (fase === 'error') {
    return (
      <View style={styles.centro}>
        <Text style={styles.vacioEmoji}>📡</Text>
        <Text style={styles.vacioTexto}>
          No pudimos cargar tu espacio. Revisa tu conexión e intenta de nuevo.
        </Text>
        <Tappable style={styles.cta} onPress={() => { setFase('cargando'); cargar(); }}>
          <Text style={styles.ctaTexto}>Intentar de nuevo</Text>
        </Tappable>
      </View>
    );
  }

  if (fase === 'vacio') {
    return (
      <View style={styles.centro}>
        <Text style={styles.vacioEmoji}>🌱</Text>
        <Text style={styles.vacioTexto}>
          Aún no hay registros. Cuando cuentes cómo estás, acá va a aparecer
          una idea pensada para ese momento.
        </Text>
        <Tappable style={styles.cta} onPress={() => router.push('/(tabs)/home')}>
          <Text style={styles.ctaTexto}>Registrar cómo estoy</Text>
        </Tappable>
      </View>
    );
  }

  const info = MOOD_INFO[moodEntry.moodType];
  const tinte = theme.colors.moods[moodEntry.moodType];
  const cuando = tiempoRelativo(moodEntry.createdAt);

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <Entrance>
        <View style={[styles.contexto, { backgroundColor: tinte.soft }]}>
          <Text style={styles.contextoEmoji}>{info.emoji}</Text>
          <View style={styles.contextoTextos}>
            <Text style={styles.contextoLinea}>
              Según tu último registro{cuando ? ` · ${cuando}` : ''}
            </Text>
            <Text style={[styles.contextoMood, { color: tinte.color }]}>{info.label}</Text>
          </View>
        </View>
      </Entrance>

      <Entrance index={1}>
        <Text style={styles.encabezado}>{ENCABEZADOS[moodEntry.moodType]}</Text>
      </Entrance>

      <Entrance index={2}>
        <ActivitySuggestionCard
          actividad={actividad}
          onOtraIdea={handleOtraIdea}
          loadingOtra={loadingOtra}
        />
      </Entrance>
    </ScrollView>
  );
}

const useStyles = makeThemedStyles((t) => ({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  vacioEmoji: { fontSize: 44, marginBottom: 16 },
  vacioTexto: {
    ...t.typography.type.body,
    color: t.colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  cta: {
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  ctaTexto: {
    color: t.colors.onPrimary,
    ...t.typography.fonts.bold,
    fontSize: t.fontSize(15),
  },
  // El contenedor del Hub (actividades.jsx) ya aporta padding 16; aquí solo
  // margen mínimo para que la sombra de la card no se recorte.
  contenido: { padding: 4, paddingTop: 8, paddingBottom: 32 },
  contexto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: t.shape.radiusLg,
    padding: 16,
    marginBottom: 24,
  },
  contextoEmoji: { fontSize: 34 },
  contextoTextos: { flex: 1 },
  contextoLinea: {
    ...t.typography.type.caption,
    color: t.colors.textMuted,
    marginBottom: 2,
  },
  contextoMood: {
    ...t.typography.type.section,
  },
  encabezado: {
    ...t.typography.type.body,
    color: t.colors.textMuted,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
}));
