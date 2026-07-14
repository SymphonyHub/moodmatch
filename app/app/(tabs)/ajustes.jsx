import { useMemo, useState } from 'react';
import { View, Text, ScrollView, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { THEMES, AUTO_THEME_ID, CUSTOM_THEME_ID, resolveThemeId } from '../../theme/themes';
import { useTheme, makeThemedStyles, ThemeScope } from '../../theme/ThemeContext';
import {
  SWATCHES,
  BODY_FONT_IDS,
  BODY_FONTS,
  DEFAULT_CUSTOM_CONFIG,
  makeCustomTheme,
  evaluateCustomTheme,
} from '../../theme/customTheme';
import { MOODS } from '../../constants/moods';
import Tappable from '../../components/Tappable';

const THEME_OPTIONS = [
  { id: AUTO_THEME_ID, name: 'Automático', tagline: 'Sigue el modo del sistema' },
  ...Object.values(THEMES).map((t) => ({ id: t.id, name: t.name, tagline: t.tagline })),
  { id: CUSTOM_THEME_ID, name: 'Personalizado', tagline: 'Tus colores y tu fuente' },
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

function ThemeOptionRow({ option, selected, onPress, customDraft }) {
  const styles = useStyles();
  const isCustomOption = option.id === CUSTOM_THEME_ID;
  const swatchTheme =
    option.id === AUTO_THEME_ID || isCustomOption ? null : THEMES[option.id];

  // Personalizado muestra la paleta del borrador actual; los temas base, la suya.
  const swatchColors = isCustomOption
    ? [customDraft.primary, customDraft.background, customDraft.accent]
    : swatchTheme
      ? [
          swatchTheme.colors.primary,
          swatchTheme.colors.background,
          swatchTheme.colors.moods.CALMADO.color,
        ]
      : [THEMES.sereno.colors.background, THEMES.nocturno.colors.background];

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
        {swatchColors.map((color, i) => (
          <View key={`${color}-${i}`} style={[styles.swatch, { backgroundColor: color }]} />
        ))}
      </View>
    </Tappable>
  );
}

function SwatchGrid({ label, colors, selected, onSelect }) {
  const styles = useStyles();
  return (
    <View style={styles.swatchBlock}>
      <Text style={styles.swatchLabel}>{label}</Text>
      <View style={styles.swatchGrid}>
        {colors.map((color) => {
          const isSelected = color === selected;
          return (
            <Tappable
              key={color}
              onPress={() => onSelect(color)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${label}: color ${color}`}
              style={[styles.swatchOuter, isSelected && styles.swatchOuterSelected]}
            >
              <View style={[styles.swatchPick, { backgroundColor: color }]} />
            </Tappable>
          );
        })}
      </View>
    </View>
  );
}

function FontPicker({ selected, onSelect }) {
  const styles = useStyles();
  return (
    <View style={styles.swatchBlock}>
      <Text style={styles.swatchLabel}>Fuente</Text>
      <View style={styles.fontRow}>
        {BODY_FONT_IDS.map((id) => {
          const isSelected = id === selected;
          return (
            <Tappable
              key={id}
              onPress={() => onSelect(id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Fuente ${BODY_FONTS[id].label}`}
              style={[styles.fontChip, isSelected && styles.fontChipSelected]}
            >
              <Text
                style={[
                  styles.fontChipTxt,
                  { fontFamily: BODY_FONTS[id].bodyFamily },
                  isSelected && styles.fontChipTxtSelected,
                ]}
              >
                {BODY_FONTS[id].label}
              </Text>
            </Tappable>
          );
        })}
      </View>
    </View>
  );
}

// Aviso WCAG AA: informa qué pares no alcanzan 4.5:1 pero NUNCA bloquea
// el botón de aplicar (requisito de la fase).
function ContrastNotice({ issues }) {
  const styles = useStyles();

  if (issues.length === 0) {
    return (
      <Text style={styles.contrastOk}>
        ✓ Esta combinación cumple el contraste recomendado (WCAG AA).
      </Text>
    );
  }

  return (
    <View style={styles.contrastWarn}>
      <Text style={styles.contrastWarnTitle}>
        Esta combinación no alcanza el contraste recomendado (AA) en{' '}
        {issues.length === 1 ? '1 par' : `${issues.length} pares`}
      </Text>
      {issues.slice(0, 3).map(({ pair, ratio }) => (
        <Text key={pair} style={styles.contrastWarnItem}>
          • {pair} ({ratio}:1, mínimo 4.5:1)
        </Text>
      ))}
      <Text style={styles.contrastWarnHint}>
        Puedes aplicarla igualmente, pero algunos textos podrían leerse peor.
      </Text>
    </View>
  );
}

function CustomThemeEditor({ draft, onChange, issues }) {
  const styles = useStyles();
  return (
    <View style={styles.editor}>
      <SwatchGrid
        label="Fondo"
        colors={SWATCHES.background}
        selected={draft.background}
        onSelect={(background) => onChange({ ...draft, background })}
      />
      <SwatchGrid
        label="Color primario"
        colors={SWATCHES.primary}
        selected={draft.primary}
        onSelect={(primary) => onChange({ ...draft, primary })}
      />
      <SwatchGrid
        label="Acento"
        colors={SWATCHES.accent}
        selected={draft.accent}
        onSelect={(accent) => onChange({ ...draft, accent })}
      />
      <FontPicker
        selected={draft.bodyFont}
        onSelect={(bodyFont) => onChange({ ...draft, bodyFont })}
      />
      <ContrastNotice issues={issues} />
    </View>
  );
}

// Tarjeta de sección: agrupa visualmente Apariencia / Cuenta con la misma
// jerarquía tipográfica del resto de la app.
function SectionCard({ title, hint, children }) {
  const styles = useStyles();
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.seccion}>{title}</Text>
      {hint ? <Text style={styles.seccionHint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

export default function AjustesScreen() {
  const { themeChoice, applyThemeChoice, isApplying, customConfig } = useTheme();
  const styles = useStyles();
  const systemScheme = useColorScheme();
  const [candidate, setCandidate] = useState(themeChoice);
  const [draft, setDraft] = useState(customConfig ?? DEFAULT_CUSTOM_CONFIG);

  const isCustomCandidate = candidate === CUSTOM_THEME_ID;
  const draftTheme = useMemo(() => makeCustomTheme(draft), [draft]);
  const contrastIssues = useMemo(() => evaluateCustomTheme(draftTheme), [draftTheme]);

  const previewTheme = isCustomCandidate
    ? draftTheme
    : THEMES[resolveThemeId(candidate, systemScheme)];
  const candidateName = THEME_OPTIONS.find((o) => o.id === candidate)?.name ?? candidate;

  const savedDraft = customConfig ?? DEFAULT_CUSTOM_CONFIG;
  const isDirty =
    candidate !== themeChoice ||
    (isCustomCandidate && JSON.stringify(draft) !== JSON.stringify(savedDraft));

  const handleAplicar = () =>
    applyThemeChoice(candidate, isCustomCandidate ? { custom: draft } : undefined);

  const handleCerrarSesion = async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SectionCard
        title="Apariencia"
        hint="Toca un tema para previsualizarlo. Nada cambia hasta que lo apliques."
      >
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
              customDraft={draft}
            />
          ))}
        </View>

        {isCustomCandidate && (
          <CustomThemeEditor draft={draft} onChange={setDraft} issues={contrastIssues} />
        )}

        <Tappable
          style={[styles.btnAplicar, (!isDirty || isApplying) && styles.btnAplicarDisabled]}
          onPress={handleAplicar}
          disabled={!isDirty || isApplying}
        >
          <Text style={styles.btnAplicarTxt}>
            {isDirty ? `Aplicar tema ${candidateName}` : 'Este es tu tema actual'}
          </Text>
        </Tappable>
      </SectionCard>

      <SectionCard title="Cuenta">
        <Tappable style={styles.btnSalir} onPress={handleCerrarSesion} haptic={false}>
          <Text style={styles.btnSalirTxt}>Cerrar sesión</Text>
        </Tappable>
      </SectionCard>
    </ScrollView>
  );
}

const useStyles = makeThemedStyles((t) => ({
  container: { padding: 20, paddingBottom: 40 },
  sectionCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusLg,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    padding: 16,
    marginBottom: 20,
    ...t.shadows.card,
  },
  seccion: {
    ...t.typography.type.section,
    color: t.colors.text,
    marginBottom: 6,
  },
  seccionHint: {
    ...t.typography.type.caption,
    color: t.colors.textMuted,
    marginBottom: 14,
  },
  opciones: { marginTop: 16, marginBottom: 4 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.background,
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
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  editor: {
    marginBottom: 16,
    borderRadius: t.shape.radiusLg,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    backgroundColor: t.colors.background,
    padding: 14,
  },
  swatchBlock: { marginBottom: 14 },
  swatchLabel: {
    fontSize: t.fontSize(13),
    ...t.typography.fonts.semibold,
    color: t.colors.text,
    marginBottom: 8,
  },
  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatchOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchOuterSelected: { borderColor: t.colors.primary },
  swatchPick: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  fontRow: { flexDirection: 'row', gap: 8 },
  fontChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: t.shape.radiusMd,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    alignItems: 'center',
  },
  fontChipSelected: {
    borderColor: t.colors.primary,
    borderWidth: t.shape.borderThick,
    backgroundColor: t.colors.primarySoft,
  },
  fontChipTxt: { fontSize: t.fontSize(14), color: t.colors.textMuted },
  fontChipTxtSelected: { color: t.colors.primary },
  contrastOk: {
    ...t.typography.type.caption,
    color: t.colors.textMuted,
  },
  contrastWarn: {
    backgroundColor: t.colors.dangerSoft,
    borderRadius: t.shape.radiusMd,
    padding: 12,
  },
  contrastWarnTitle: {
    fontSize: t.fontSize(13),
    ...t.typography.fonts.semibold,
    color: t.colors.danger,
    marginBottom: 6,
  },
  contrastWarnItem: {
    fontSize: t.fontSize(12),
    color: t.colors.danger,
    marginBottom: 2,
  },
  contrastWarnHint: {
    fontSize: t.fontSize(12),
    color: t.colors.danger,
    marginTop: 6,
  },
  btnAplicar: {
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
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
    fontFamily: t.typography.type.title.fontFamily,
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
    fontFamily: t.typography.type.title.fontFamily,
    fontSize: t.fontSize(15),
    color: t.colors.text,
    marginBottom: 3,
  },
  cardDesc: {
    fontFamily: t.typography.type.body.fontFamily,
    fontSize: t.fontSize(12),
    color: t.colors.textMuted,
  },
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
