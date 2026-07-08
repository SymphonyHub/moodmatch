import { useState } from 'react';
import { View, Text, ScrollView, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { THEMES, AUTO_THEME_ID, resolveThemeId } from '../../theme/themes';
import { useTheme, makeThemedStyles, ThemeScope } from '../../theme/ThemeContext';
import { MOODS } from '../../constants/moods';
import Tappable from '../../components/Tappable';

const THEME_OPTIONS = [
  { id: AUTO_THEME_ID, name: 'Automático', tagline: 'Sigue el modo del sistema' },
  ...Object.values(THEMES).map((t) => ({ id: t.id, name: t.name, tagline: t.tagline })),
];

// Mini-mock de la app: dentro de un ThemeScope muestra cómo se vería el tema
// candidato sin aplicarlo globalmente.
function PreviewMock() {
  const { theme } = useTheme();
  const styles = usePreviewStyles();

  return (
    <View style={styles.canvas}>
      <View style={styles.header}>
        <Text style={styles.headerTxt}>Estado de ánimo</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.chipsRow}>
          {MOODS.slice(0, 3).map((m, i) => (
            <View key={m.value} style={[styles.chip, i === 0 && styles.chipActive]}>
              <Text style={styles.chipEmoji}>{m.emoji}</Text>
              <Text style={[styles.chipLabel, i === 0 && styles.chipLabelActive]}>
                {m.label}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.card}>
          <Text style={[styles.cardTag, { color: theme.colors.categories.mindfulness }]}>
            🧘  MINDFULNESS
          </Text>
          <Text style={styles.cardTitle}>Respiración consciente</Text>
          <Text style={styles.cardDesc}>Tres minutos de pausa para volver a ti.</Text>
        </View>
        <View style={styles.btn}>
          <Text style={styles.btnTxt}>Ver actividad sugerida</Text>
        </View>
      </View>
    </View>
  );
}

function ThemeOptionRow({ option, selected, onPress }) {
  const styles = useStyles();
  const swatchTheme = option.id === AUTO_THEME_ID ? null : THEMES[option.id];

  return (
    <Tappable
      style={[styles.optionRow, selected && styles.optionRowSelected]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`Tema ${option.name}. ${option.tagline}`}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <View style={styles.optionInfo}>
        <Text style={styles.optionName}>{option.name}</Text>
        <Text style={styles.optionTagline}>{option.tagline}</Text>
      </View>
      <View style={styles.swatches}>
        {swatchTheme ? (
          <>
            <View style={[styles.swatch, { backgroundColor: swatchTheme.colors.primary }]} />
            <View
              style={[
                styles.swatch,
                {
                  backgroundColor: swatchTheme.colors.background,
                  borderWidth: 1,
                  borderColor: swatchTheme.colors.border,
                },
              ]}
            />
            <View
              style={[styles.swatch, { backgroundColor: swatchTheme.colors.moods.CALMADO.color }]}
            />
          </>
        ) : (
          <>
            <View
              style={[
                styles.swatch,
                {
                  backgroundColor: THEMES.sereno.colors.background,
                  borderWidth: 1,
                  borderColor: THEMES.sereno.colors.border,
                },
              ]}
            />
            <View style={[styles.swatch, { backgroundColor: THEMES.nocturno.colors.background }]} />
          </>
        )}
      </View>
    </Tappable>
  );
}

export default function AjustesScreen() {
  const { themeChoice, applyThemeChoice, isApplying } = useTheme();
  const styles = useStyles();
  const systemScheme = useColorScheme();
  const [candidate, setCandidate] = useState(themeChoice);

  const previewTheme = THEMES[resolveThemeId(candidate, systemScheme)];
  const candidateName = THEME_OPTIONS.find((o) => o.id === candidate)?.name ?? candidate;
  const isDirty = candidate !== themeChoice;

  const handleCerrarSesion = async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.seccion}>Apariencia</Text>
      <Text style={styles.seccionHint}>
        Toca un tema para previsualizarlo. Nada cambia hasta que lo apliques.
      </Text>

      <ThemeScope theme={previewTheme}>
        <PreviewMock />
      </ThemeScope>

      <View style={styles.opciones}>
        {THEME_OPTIONS.map((opt) => (
          <ThemeOptionRow
            key={opt.id}
            option={opt}
            selected={candidate === opt.id}
            onPress={() => setCandidate(opt.id)}
          />
        ))}
      </View>

      <Tappable
        style={[styles.btnAplicar, (!isDirty || isApplying) && styles.btnAplicarDisabled]}
        onPress={() => applyThemeChoice(candidate)}
        disabled={!isDirty || isApplying}
      >
        <Text style={styles.btnAplicarTxt}>
          {isDirty ? `Aplicar tema ${candidateName}` : 'Este es tu tema actual'}
        </Text>
      </Tappable>

      <Text style={[styles.seccion, styles.seccionCuenta]}>Cuenta</Text>
      <Tappable style={styles.btnSalir} onPress={handleCerrarSesion} haptic={false}>
        <Text style={styles.btnSalirTxt}>Cerrar sesión</Text>
      </Tappable>
    </ScrollView>
  );
}

const useStyles = makeThemedStyles((t) => ({
  container: { padding: 20, paddingBottom: 40 },
  seccion: {
    fontSize: t.fontSize(18),
    ...t.typography.fonts.bold,
    color: t.colors.text,
    marginBottom: 6,
    marginTop: 4,
  },
  seccionCuenta: { marginTop: 32 },
  seccionHint: {
    fontSize: t.fontSize(13),
    color: t.colors.textMuted,
    marginBottom: 14,
  },
  opciones: { marginTop: 16, marginBottom: 20 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusLg,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    padding: 14,
    marginBottom: 8,
  },
  optionRowSelected: {
    borderColor: t.colors.primary,
    borderWidth: t.shape.borderThick,
    backgroundColor: t.colors.primarySoft,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: t.colors.textFaint,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: t.colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: t.colors.primary,
  },
  optionInfo: { flex: 1 },
  optionName: {
    fontSize: t.fontSize(15),
    ...t.typography.fonts.semibold,
    color: t.colors.text,
    marginBottom: 2,
  },
  optionTagline: { fontSize: t.fontSize(12), color: t.colors.textMuted },
  swatches: { flexDirection: 'row', gap: 4, marginLeft: 10 },
  swatch: { width: 18, height: 18, borderRadius: 9 },
  btnAplicar: {
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnAplicarDisabled: { backgroundColor: t.colors.primaryDisabled },
  btnAplicarTxt: {
    color: t.colors.onPrimary,
    fontSize: t.fontSize(15),
    ...t.typography.fonts.bold,
  },
  btnSalir: {
    borderWidth: t.shape.borderMedium,
    borderColor: t.colors.border,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnSalirTxt: { color: t.colors.textMuted, fontSize: t.fontSize(15) },
}));

const usePreviewStyles = makeThemedStyles((t) => ({
  canvas: {
    borderRadius: t.shape.radiusLg,
    overflow: 'hidden',
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    backgroundColor: t.colors.background,
  },
  header: {
    backgroundColor: t.colors.headerBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerTxt: {
    color: t.colors.onHeader,
    ...t.typography.fonts.bold,
    fontSize: t.fontSize(14),
  },
  body: { padding: 14 },
  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: {
    flex: 1,
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusMd,
    borderWidth: t.shape.borderThick,
    borderColor: t.colors.border,
    alignItems: 'center',
    paddingVertical: 10,
  },
  chipActive: {
    borderColor: t.colors.primary,
    backgroundColor: t.colors.primarySoft,
  },
  chipEmoji: { fontSize: 22, marginBottom: 2 },
  chipLabel: {
    fontSize: t.fontSize(11),
    ...t.typography.fonts.semibold,
    color: t.colors.textMuted,
  },
  chipLabelActive: { color: t.colors.primary },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusMd,
    padding: 12,
    marginBottom: 12,
    ...t.shadows.card,
  },
  cardTag: {
    fontSize: t.fontSize(10),
    ...t.typography.fonts.bold,
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: t.fontSize(15),
    ...t.typography.fonts.bold,
    color: t.colors.text,
    marginBottom: 3,
  },
  cardDesc: { fontSize: t.fontSize(12), color: t.colors.textMuted },
  btn: {
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnTxt: {
    color: t.colors.onPrimary,
    ...t.typography.fonts.bold,
    fontSize: t.fontSize(13),
  },
}));
