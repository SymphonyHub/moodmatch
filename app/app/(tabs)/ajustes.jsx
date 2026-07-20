import { useCallback, useMemo, useState } from 'react';
import { Switch, View, Text, TextInput, ScrollView, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { THEMES, AUTO_THEME_ID, CUSTOM_THEME_ID, resolveThemeId } from '../../theme/themes';
import { useTheme, makeThemedStyles, ThemeScope } from '../../theme/ThemeContext';
import {
  SWATCHES,
  BODY_FONT_IDS,
  BODY_FONTS,
  DEFAULT_CUSTOM_CONFIG,
  MAX_PALETAS,
  NAME_MAX,
  makeCustomTheme,
  evaluateCustomTheme,
  customThemePassesAA,
  configDe,
  nuevaPaletaId,
  upsertPalette,
  setActive,
} from '../../theme/customTheme';
import { MOODS } from '../../constants/moods';
import Tappable from '../../components/Tappable';
import { HueBar, LumBar } from '../../components/color/HueBar';
import AvatarPicker from '../../components/profile/AvatarPicker';
import { apiGetMe } from '../../services/api';
import { LARGE_TEXT_SCALE } from '../../theme/persistence';

const THEME_OPTIONS = [
  { id: AUTO_THEME_ID, name: 'Automático', tagline: 'Sigue el modo del sistema' },
  ...Object.values(THEMES).map((t) => ({ id: t.id, name: t.name, tagline: t.tagline })),
  { id: CUSTOM_THEME_ID, name: 'Personalizado', tagline: 'Tus colores y tu fuente' },
];

// La paleta que el contenedor marca como activa (o la primera como red de red).
const paletaActiva = (container) =>
  container.palettes.find((p) => p.id === container.activeId) ?? container.palettes[0];

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

// Fila de swatches sin etiqueta: atajos rápidos que fijan un color (y de paso
// reposicionan los thumbs de hue/luminosidad, que se derivan del hex).
function SwatchRow({ colors, selected, onSelect, label }) {
  const styles = useStyles();
  return (
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
  );
}

// Un color de marca (primario/acento): matiz y luminosidad continuos + atajos.
function ColorField({ label, value, onChange, swatches, sliderId }) {
  const styles = useStyles();
  return (
    <View style={styles.swatchBlock}>
      <View style={styles.colorHead}>
        <Text style={styles.swatchLabel}>{label}</Text>
        <View style={[styles.colorPreview, { backgroundColor: value }]} />
      </View>
      <Text style={styles.sliderCap}>Matiz</Text>
      <HueBar value={value} onChange={onChange} id={sliderId} />
      <View style={styles.sliderGap} />
      <Text style={styles.sliderCap}>Luminosidad</Text>
      <LumBar value={value} onChange={onChange} id={sliderId} />
      <View style={styles.sliderGap} />
      <SwatchRow colors={swatches} selected={value} onSelect={onChange} label={label} />
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
              accessibilityLabel={`Fuente ${BODY_FONTS[id].label}: ${BODY_FONTS[id].tagline}`}
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

// Aviso WCAG AA: una combinación que no alcance 4.5:1 no se puede aplicar.
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
        Ajusta los colores indicados para poder guardar o aplicar esta paleta.
      </Text>
    </View>
  );
}

// Lista de paletas guardadas: cada tarjeta se puede seleccionar (editar +
// previsualizar) o borrar; "＋ Nueva" hasta MAX_PALETAS.
function PaletteList({ palettes, draftId, activeId, applied, onSelect, onDelete, onNew }) {
  const styles = useStyles();
  return (
    <View style={styles.swatchBlock}>
      <Text style={styles.swatchLabel}>Mis paletas</Text>
      {palettes.map((p) => {
        const isDraft = p.id === draftId;
        const enUso = applied && p.id === activeId;
        return (
          <View key={p.id} style={[styles.palRow, isDraft && styles.palRowSelected]}>
            <Tappable
              style={styles.palMain}
              onPress={() => onSelect(p)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isDraft }}
              accessibilityLabel={`Paleta ${p.name}${enUso ? ', en uso' : ''}`}
            >
              <View style={styles.palSwatches}>
                {[p.primary, p.background, p.accent].map((c, i) => (
                  <View key={`${c}-${i}`} style={[styles.palSwatch, { backgroundColor: c }]} />
                ))}
              </View>
              <View style={styles.palInfo}>
                <Text style={styles.palName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.palFont}>
                  {BODY_FONTS[p.bodyFont]?.label ?? p.bodyFont}
                  {enUso ? '  ·  en uso' : ''}
                </Text>
              </View>
            </Tappable>
            {palettes.length > 1 ? (
              <Tappable
                style={styles.palDelete}
                onPress={() => onDelete(p.id)}
                haptic={false}
                accessibilityLabel={`Borrar paleta ${p.name}`}
              >
                <Text style={styles.palDeleteTxt}>Borrar</Text>
              </Tappable>
            ) : null}
          </View>
        );
      })}
      {palettes.length < MAX_PALETAS ? (
        <Tappable style={styles.palNew} onPress={onNew} accessibilityLabel="Crear paleta nueva">
          <Text style={styles.palNewTxt}>＋ Nueva paleta</Text>
        </Tappable>
      ) : (
        <Text style={styles.palLimit}>Máximo {MAX_PALETAS} paletas guardadas.</Text>
      )}
    </View>
  );
}

function CustomThemeEditor({
  draft,
  onChangeConfig,
  onRename,
  issues,
  palettes,
  activeId,
  applied,
  onSelectPalette,
  onDeletePalette,
  onNewPalette,
  onSavePalette,
  canSave,
}) {
  const styles = useStyles();
  return (
    <View style={styles.editor}>
      <PaletteList
        palettes={palettes}
        draftId={draft.id}
        activeId={activeId}
        applied={applied}
        onSelect={onSelectPalette}
        onDelete={onDeletePalette}
        onNew={onNewPalette}
      />

      <View style={styles.swatchBlock}>
        <Text style={styles.swatchLabel}>Nombre</Text>
        <TextInput
          style={styles.nameInput}
          value={draft.name}
          onChangeText={onRename}
          maxLength={NAME_MAX}
          placeholder="Mi paleta"
          placeholderTextColor={styles.placeholder.color}
          accessibilityLabel="Nombre de la paleta"
        />
      </View>

      <ColorField
        label="Color primario"
        value={draft.primary}
        onChange={(primary) => onChangeConfig({ primary })}
        swatches={SWATCHES.primary}
        sliderId="primary"
      />
      <ColorField
        label="Acento"
        value={draft.accent}
        onChange={(accent) => onChangeConfig({ accent })}
        swatches={SWATCHES.accent}
        sliderId="accent"
      />
      <View style={styles.swatchBlock}>
        <Text style={styles.swatchLabel}>Fondo</Text>
        <SwatchRow
          colors={SWATCHES.background}
          selected={draft.background}
          onSelect={(background) => onChangeConfig({ background })}
          label="Fondo"
        />
      </View>
      <FontPicker
        selected={draft.bodyFont}
        onSelect={(bodyFont) => onChangeConfig({ bodyFont })}
      />

      <ContrastNotice issues={issues} />

      <Tappable
        style={[styles.btnGuardar, !canSave && styles.btnGuardarDisabled]}
        onPress={onSavePalette}
        disabled={!canSave}
        accessibilityLabel="Guardar paleta"
      >
        <Text style={styles.btnGuardarTxt}>Guardar paleta</Text>
      </Tappable>
    </View>
  );
}

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
  const {
    themeChoice,
    applyThemeChoice,
    isApplying,
    customConfig,
    savePalette,
    deletePalette,
    textScale,
    setTextScale,
  } = useTheme();
  const styles = useStyles();
  const systemScheme = useColorScheme();
  const [candidate, setCandidate] = useState(themeChoice);
  // draft = paleta en edición (copia local con id/name/config). Arranca en la activa.
  const [draft, setDraft] = useState(() => ({ ...paletaActiva(customConfig) }));
  const [profile, setProfile] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      apiGetMe()
        .then((data) => {
          if (active && data.user) setProfile(data.user);
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, []),
  );

  const isCustomCandidate = candidate === CUSTOM_THEME_ID;
  const draftTheme = useMemo(() => makeCustomTheme(configDe(draft)), [draft]);
  const contrastIssues = useMemo(() => evaluateCustomTheme(draftTheme), [draftTheme]);
  const customPassesAA = useMemo(() => customThemePassesAA(draftTheme), [draftTheme]);

  const previewTheme = isCustomCandidate
    ? draftTheme
    : THEMES[resolveThemeId(candidate, systemScheme)];
  const candidateName = THEME_OPTIONS.find((o) => o.id === candidate)?.name ?? candidate;

  // La versión guardada de la paleta en edición (si ya existe en el contenedor).
  const saved = customConfig.palettes.find((p) => p.id === draft.id);
  const draftDiverge = !saved || JSON.stringify(saved) !== JSON.stringify(draft);
  const applied = themeChoice === CUSTOM_THEME_ID;

  const changeConfig = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const renameDraft = (name) => setDraft((d) => ({ ...d, name }));

  const selectPalette = (p) => setDraft({ ...p });
  const newPalette = () =>
    setDraft({ id: nuevaPaletaId(), name: `Paleta ${customConfig.palettes.length + 1}`, ...DEFAULT_CUSTOM_CONFIG });
  const removePaletteById = (id) => {
    deletePalette(id);
    if (id === draft.id) {
      const restantes = customConfig.palettes.filter((p) => p.id !== id);
      if (restantes.length) setDraft({ ...restantes[0] });
    }
  };
  // Guardar exige un nombre no vacío; el resto siempre es válido (hex derivado).
  const nameOk = draft.name.trim().length > 0;
  // Guardar una paleta activa actualiza el tema en runtime, así que también
  // debe respetar AA para no eludir el bloqueo del botón Aplicar.
  const canSave = draftDiverge && nameOk && customPassesAA;
  const savePaletteDraft = () => savePalette({ ...draft, name: draft.name.trim() });

  // isDirty del botón Aplicar: cambió el tema elegido, o (en custom) hay una
  // paleta distinta a la aplicada / con ediciones sin guardar.
  const isDirty =
    candidate !== themeChoice ||
    (isCustomCandidate && (draft.id !== customConfig.activeId || draftDiverge));

  const handleAplicar = () => {
    if (isCustomCandidate) {
      const limpio = { ...draft, name: draft.name.trim() || 'Mi paleta' };
      // Guarda la paleta en edición y la deja activa antes de aplicar el tema.
      const container = setActive(upsertPalette(customConfig, limpio), limpio.id);
      applyThemeChoice(candidate, { custom: container });
    } else {
      applyThemeChoice(candidate);
    }
  };

  const handleCerrarSesion = async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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
          <CustomThemeEditor
            draft={draft}
            onChangeConfig={changeConfig}
            onRename={renameDraft}
            issues={contrastIssues}
            palettes={customConfig.palettes}
            activeId={customConfig.activeId}
            applied={applied}
            onSelectPalette={selectPalette}
            onDeletePalette={removePaletteById}
            onNewPalette={newPalette}
            onSavePalette={savePaletteDraft}
            canSave={canSave}
          />
        )}

        <Tappable
          style={[
            styles.btnAplicar,
            (!isDirty || isApplying || (isCustomCandidate && !customPassesAA)) &&
              styles.btnAplicarDisabled,
          ]}
          onPress={handleAplicar}
          disabled={!isDirty || isApplying || (isCustomCandidate && !customPassesAA)}
          accessibilityHint={
            isCustomCandidate && !customPassesAA
              ? 'Corrige el contraste de la paleta antes de aplicarla'
              : undefined
          }
        >
          <Text style={styles.btnAplicarTxt}>
            {isCustomCandidate && !customPassesAA
              ? 'Corrige el contraste para aplicar'
              : isDirty
                ? `Aplicar tema ${candidateName}`
                : 'Este es tu tema actual'}
          </Text>
        </Tappable>
      </SectionCard>

      <SectionCard title="Accesibilidad" hint="Ajusta la lectura sin cambiar tu tema ni tu fuente.">
        <View style={styles.accessibilityRow}>
          <View style={styles.accessibilityCopy}>
            <Text style={styles.accessibilityTitle}>Texto grande</Text>
            <Text style={styles.accessibilityHint}>Aumenta los textos de toda la app.</Text>
          </View>
          <Switch
            value={textScale === LARGE_TEXT_SCALE}
            onValueChange={(enabled) => setTextScale(enabled ? LARGE_TEXT_SCALE : 1)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primarySoftBorder }}
            thumbColor={textScale === LARGE_TEXT_SCALE ? theme.colors.primary : theme.colors.surface}
            accessibilityLabel="Texto grande"
            accessibilityHint="Aumenta el tamaño de los textos de la aplicación"
          />
        </View>
      </SectionCard>

      <SectionCard title="Cuenta">
        <AvatarPicker
          avatarUrl={profile?.avatarUrl}
          nombre={profile?.nombre}
          onChange={(avatarUrl) => setProfile((current) => ({ ...current, avatarUrl }))}
        />
        <View style={styles.accountDivider} />
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
  seccion: { ...t.typography.type.section, color: t.colors.text, marginBottom: 6 },
  seccionHint: { ...t.typography.type.caption, color: t.colors.textMuted, marginBottom: 14 },
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
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: t.colors.primary },
  optionInfo: { flex: 1 },
  optionName: {
    fontSize: t.fontSize(15),
    ...t.typography.fonts.semibold,
    color: t.colors.text,
    marginBottom: 2,
  },
  optionTagline: { fontSize: t.fontSize(12), color: t.colors.textMuted },
  swatches: { flexDirection: 'row', gap: 4, marginLeft: 10 },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: t.colors.border },
  editor: {
    marginBottom: 16,
    borderRadius: t.shape.radiusLg,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    backgroundColor: t.colors.background,
    padding: 14,
  },
  swatchBlock: { marginBottom: 18 },
  swatchLabel: {
    fontSize: t.fontSize(13),
    ...t.typography.fonts.semibold,
    color: t.colors.text,
    marginBottom: 8,
  },
  colorHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  colorPreview: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
  },
  sliderCap: {
    fontSize: t.fontSize(11),
    color: t.colors.textMuted,
    marginBottom: 6,
    marginTop: 4,
  },
  sliderGap: { height: 10 },
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
  nameInput: {
    ...t.typography.type.body,
    color: t.colors.text,
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    borderRadius: t.shape.radiusMd,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  placeholder: { color: t.colors.textFaint },
  fontRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fontChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
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
  palRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusMd,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    marginBottom: 8,
  },
  palRowSelected: { borderColor: t.colors.primary, borderWidth: t.shape.borderThick },
  palMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 10 },
  palSwatches: { flexDirection: 'row', gap: 3, marginRight: 10 },
  palSwatch: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: t.colors.border },
  palInfo: { flex: 1 },
  palName: {
    fontSize: t.fontSize(14),
    ...t.typography.fonts.semibold,
    color: t.colors.text,
  },
  palFont: { fontSize: t.fontSize(11), color: t.colors.textMuted, marginTop: 1 },
  palDelete: { paddingHorizontal: 12, paddingVertical: 10 },
  palDeleteTxt: { fontSize: t.fontSize(12), color: t.colors.danger },
  palNew: {
    borderWidth: t.shape.borderMedium,
    borderColor: t.colors.primarySoftBorder,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 2,
  },
  palNewTxt: { fontSize: t.fontSize(14), ...t.typography.fonts.semibold, color: t.colors.primary },
  palLimit: { fontSize: t.fontSize(12), color: t.colors.textMuted, marginTop: 2 },
  contrastOk: { ...t.typography.type.caption, color: t.colors.textMuted, marginBottom: 14 },
  contrastWarn: {
    backgroundColor: t.colors.dangerSoft,
    borderRadius: t.shape.radiusMd,
    padding: 12,
    marginBottom: 14,
  },
  contrastWarnTitle: {
    fontSize: t.fontSize(13),
    ...t.typography.fonts.semibold,
    color: t.colors.danger,
    marginBottom: 6,
  },
  contrastWarnItem: { fontSize: t.fontSize(12), color: t.colors.danger, marginBottom: 2 },
  contrastWarnHint: { fontSize: t.fontSize(12), color: t.colors.danger, marginTop: 6 },
  btnGuardar: {
    backgroundColor: t.colors.accent,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnGuardarDisabled: { backgroundColor: t.colors.primaryDisabled },
  btnGuardarTxt: {
    color: t.colors.onPrimary,
    fontSize: t.fontSize(14),
    ...t.typography.fonts.bold,
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
  accessibilityRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  accessibilityCopy: { flex: 1 },
  accessibilityTitle: { ...t.typography.type.body, ...t.typography.fonts.semibold, color: t.colors.text },
  accessibilityHint: { ...t.typography.type.caption, color: t.colors.textMuted, marginTop: 2 },
  btnSalir: {
    borderWidth: t.shape.borderMedium,
    borderColor: t.colors.border,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 13,
    alignItems: 'center',
  },
  accountDivider: { height: t.shape.borderThin, backgroundColor: t.colors.border, marginVertical: 16 },
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
  header: { backgroundColor: t.colors.headerBackground, paddingVertical: 12, paddingHorizontal: 16 },
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
  chipActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft },
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
  btnTxt: { color: t.colors.onPrimary, ...t.typography.fonts.bold, fontSize: t.fontSize(13) },
}));
