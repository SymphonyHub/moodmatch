import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, SectionList, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGetMoodHistory } from '../services/api';
import { MOODS, MOOD_INFO } from '../constants/moods';
import {
  analizarPatron,
  mensajeResumen,
  agruparPorDia,
  horaCorta,
  DIAS_VENTANA,
} from '../features/wellness/historial';
import { useTheme, makeThemedStyles } from '../theme/ThemeContext';
import Tappable from '../components/Tappable';
import Entrance from '../components/Entrance';

// Vista de historial de ánimos + mensaje de progreso (FASE6 PARTE C).
// El resumen se calcula localmente por conteo de frecuencias — sin IA.
export default function HistorialScreen() {
  const { theme } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  // 'cargando' | 'vacio' | 'ok' | 'error'
  const [fase, setFase] = useState('cargando');
  const [entries, setEntries] = useState([]);

  const cargar = useCallback(async () => {
    try {
      const data = await apiGetMoodHistory(30);
      if (Array.isArray(data.entries)) {
        setEntries(data.entries);
        setFase(data.entries.length === 0 ? 'vacio' : 'ok');
      } else {
        setFase('error');
      }
    } catch {
      setFase('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const { analisis, mensaje, secciones } = useMemo(() => {
    const a = analizarPatron(entries);
    return { analisis: a, mensaje: mensajeResumen(a), secciones: agruparPorDia(entries) };
  }, [entries]);

  // Tinte de la card de resumen según el patrón: cálido para la buena racha,
  // sobrio (nunca danger) para la difícil, neutro para el resto.
  const cardResumen =
    analisis.tipo === 'positivo'
      ? { backgroundColor: theme.colors.accentSoft }
      : analisis.tipo === 'dificil'
        ? {
            backgroundColor: theme.colors.surfaceElevated,
            borderWidth: theme.shape.borderThin,
            borderColor: theme.colors.border,
          }
        : {
            backgroundColor: theme.colors.surface,
            borderWidth: theme.shape.borderThin,
            borderColor: theme.colors.border,
          };

  const chips = MOODS.filter((m) => analisis.conteos[m.value] > 0);

  const renderContenido = () => {
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
            No pudimos cargar tu historial. Revisa tu conexión e intenta de nuevo.
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
            Aún no hay registros recientes. Cuando cuentes cómo estás, tu
            historial va a aparecer acá.
          </Text>
          <Tappable style={styles.cta} onPress={() => router.push('/(tabs)/home')}>
            <Text style={styles.ctaTexto}>Registrar cómo estoy</Text>
          </Tappable>
        </View>
      );
    }

    return (
      <SectionList
        sections={secciones}
        keyExtractor={(entry) => String(entry.id)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={(
          <Entrance>
            <View style={[styles.resumen, cardResumen]}>
              <Text style={styles.resumenCaption}>
                Últimos {DIAS_VENTANA} días · {analisis.total}{' '}
                {analisis.total === 1 ? 'registro' : 'registros'}
              </Text>
              <Text style={styles.resumenTexto}>{mensaje}</Text>
              {chips.length > 0 && (
                <View style={styles.chipsFila}>
                  {chips.map((m) => (
                    <View
                      key={m.value}
                      style={[styles.chip, { backgroundColor: theme.colors.moods[m.value].soft }]}
                    >
                      <Text style={styles.chipEmoji}>{m.emoji}</Text>
                      <Text style={[styles.chipConteo, { color: theme.colors.moods[m.value].color }]}>
                        {analisis.conteos[m.value]}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Entrance>
        )}
        renderSectionHeader={({ section }) => (
          <Text style={styles.dia}>{section.titulo}</Text>
        )}
        renderItem={({ item, index }) => (
          <Entrance index={Math.min(index, 6)}>
            <View style={styles.fila}>
              <View
                style={[
                  styles.filaEmojiCirculo,
                  { backgroundColor: theme.colors.moods[item.moodType].soft },
                ]}
              >
                <Text style={styles.filaEmoji}>{MOOD_INFO[item.moodType].emoji}</Text>
              </View>
              <View style={styles.filaTextos}>
                <Text style={styles.filaLabel}>{MOOD_INFO[item.moodType].label}</Text>
                {!!item.nota && (
                  <Text style={styles.filaNota} numberOfLines={3}>{item.nota}</Text>
                )}
              </View>
              <Text style={styles.filaHora}>{horaCorta(item.createdAt)}</Text>
            </View>
          </Entrance>
        )}
      />
    );
  };

  return (
    <View style={[styles.pantalla, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Tappable style={styles.btnVolver} onPress={() => router.back()} haptic={false}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.onHeader} />
        </Tappable>
        <Text style={styles.titulo}>Mi historial</Text>
      </View>
      {renderContenido()}
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  pantalla: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: t.colors.headerBackground,
  },
  btnVolver: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: {
    ...t.typography.type.title,
    color: t.colors.onHeader,
    marginLeft: 4,
  },
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
  lista: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: 16,
    paddingBottom: 32,
  },
  resumen: {
    borderRadius: t.shape.radiusLg,
    padding: 16,
    marginBottom: 16,
    ...t.shadows.card,
  },
  resumenCaption: {
    ...t.typography.type.caption,
    color: t.colors.textMuted,
    marginBottom: 8,
  },
  resumenTexto: {
    ...t.typography.type.body,
    color: t.colors.text,
  },
  chipsFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: t.shape.radiusXl,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  chipEmoji: { fontSize: t.fontSize(14) },
  chipConteo: {
    ...t.typography.fonts.bold,
    fontSize: t.fontSize(13),
  },
  dia: {
    ...t.typography.type.section,
    color: t.colors.textMuted,
    marginTop: 16,
    marginBottom: 8,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusMd,
    padding: 12,
    marginBottom: 8,
    ...t.shadows.card,
  },
  filaEmojiCirculo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaEmoji: { fontSize: t.fontSize(20) },
  filaTextos: { flex: 1, minWidth: 0 },
  filaLabel: {
    ...t.typography.type.body,
    ...t.typography.fonts.semibold,
    color: t.colors.text,
  },
  filaNota: {
    ...t.typography.type.caption,
    color: t.colors.textMuted,
    marginTop: 2,
  },
  filaHora: {
    ...t.typography.type.caption,
    color: t.colors.textFaint,
  },
}));
