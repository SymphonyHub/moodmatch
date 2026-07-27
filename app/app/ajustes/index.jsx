import { useEffect, useMemo, useState } from 'react';
import { Alert, View, Text, TextInput, useColorScheme } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  configDe,
  nuevaPaletaId,
  upsertPalette,
  setActive,
} from '../../theme/customTheme';
import { MOODS } from '../../constants/moods';
import Tappable from '../../components/Tappable';
import SegmentedTabs from '../../components/SegmentedTabs';
import FilaSwitch from '../../components/ajustes/FilaSwitch';
import { HueBar, SatBar, LumBar } from '../../components/color/HueBar';
import { TEXT_SCALE_STEPS } from '../../theme/persistence';
import { unregisterPushTokenForLogout } from '../../notifications/pushRegistration';

// Pasos de lectura, derivados de la lista de persistence para que no se
// desincronicen. SegmentedTabs trabaja con ids de texto.
const TEXT_SCALE_LABELS = ['Normal', 'Grande', 'Más grande'];
const TEXT_SCALE_TABS = TEXT_SCALE_STEPS.map((paso, i) => ({
  id: String(paso),
  label: TEXT_SCALE_LABELS[i] ?? `${Math.round(paso * 100)}%`,
}));

const THEME_OPTIONS = [
  { id: AUTO_THEME_ID, name: 'Automático', tagline: 'Sigue el modo del sistema' },
  ...Object.values(THEMES).map((t) => ({ id: t.id, name: t.name, tagline: t.tagline })),
  { id: CUSTOM_THEME_ID, name: 'Personalizado', tagline: 'Tus colores y tu fuente' },
];

// La paleta que el contenedor marca como activa (o la primera como red de red).
const paletaActiva = (container) =>
  container.palettes.find((p) => p.id === container.activeId) ?? container.palettes[0];

// Borde de las muestras de color: hairline translúcido que contrasta con
// CUALQUIER color en ambos temas. Con el contraste libre, un color casi-blanco
// o casi-negro puede quedar igual que la tarjeta; el stroke lo delinea igual.
const swatchStroke = (t) => (t.isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.22)');

// Nombre y versión del build, de app.json vía expo-constants. En un solo string
// para que sea legible de una sola lectura (y verificable en test).
const APP_BUILD = [Constants.expoConfig?.name ?? 'MoodMatch', Constants.expoConfig?.version]
  .filter(Boolean)
  .join(' ');

// Confirmación para las acciones que no se pueden deshacer (borrar una paleta,
// cerrar sesión). Un solo helper para que las dos pregunten igual.
const confirmarAccion = ({ titulo, mensaje, accion, onConfirm }) =>
  Alert.alert(titulo, mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: accion, style: 'destructive', onPress: onConfirm },
  ]);

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
      : // Automático muestra tres muestras como el resto de las filas (claro,
        // primario y oscuro) para que la columna de la derecha no quede despareja.
        [
          THEMES.sereno.colors.background,
          THEMES.sereno.colors.primary,
          THEMES.nocturno.colors.background,
        ];

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

// Lectura/edición del hex exacto. El `#` es opcional: "ff0000" vale igual que
// "#ff0000". La forma corta de 3 dígitos ("f00") se expande recién al salir del
// campo — si se expandiera mientras se escribe, el texto saltaría a "#ff0000" y
// con maxLength ya no se podría seguir tecleando un hex de 6 dígitos.
const hexLargo = (v) => {
  const m = /^#?([0-9a-f]{6})$/.exec(v.trim().toLowerCase());
  return m ? `#${m[1]}` : null;
};
const hexCorto = (v) => {
  const m = /^#?([0-9a-f]{3})$/.exec(v.trim().toLowerCase());
  return m ? `#${m[1].replace(/./g, (c) => c + c)}` : null;
};

function HexInput({ value, onChange, label }) {
  const styles = useStyles();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  const onText = (t) => {
    setText(t.toLowerCase());
    const hex = hexLargo(t);
    if (hex) onChange(hex);
  };

  // Al salir: deja el canónico a la vista (expandiendo la forma corta) o
  // revierte al último color válido si quedó a medias.
  const onBlur = () => {
    const hex = hexLargo(text) ?? hexCorto(text);
    if (!hex) {
      setText(value);
      return;
    }
    setText(hex);
    if (hex !== value) onChange(hex);
  };

  return (
    <TextInput
      style={styles.hexInput}
      value={text}
      onChangeText={onText}
      onBlur={onBlur}
      autoCapitalize="none"
      autoCorrect={false}
      maxLength={7}
      keyboardType="ascii-capable"
      placeholder="#000000"
      placeholderTextColor={styles.placeholder.color}
      accessibilityLabel={`Código hex de ${label}`}
    />
  );
}

// Un color libre (primario/acento/fondo): barras continuas + atajos + hex.
// `fondo` amplía el rango de luminosidad y agrega saturación (sin ella, el
// matiz de un fondo casi neutro no se notaría).
function ColorField({ label, value, onChange, swatches, sliderId, fondo = false }) {
  const styles = useStyles();
  return (
    <View style={styles.swatchBlock}>
      <View style={styles.colorHead}>
        <Text style={styles.swatchLabel}>{label}</Text>
        <View style={styles.hexWrap}>
          <HexInput value={value} onChange={onChange} label={label} />
          <View style={[styles.colorPreview, { backgroundColor: value }]} />
        </View>
      </View>
      <Text style={styles.sliderCap}>Matiz</Text>
      <HueBar value={value} onChange={onChange} id={sliderId} label={`Matiz de ${label}`} />
      {fondo ? (
        <>
          <View style={styles.sliderGap} />
          <Text style={styles.sliderCap}>Saturación</Text>
          <SatBar value={value} onChange={onChange} id={sliderId} label={`Saturación de ${label}`} />
        </>
      ) : null}
      <View style={styles.sliderGap} />
      <Text style={styles.sliderCap}>Luminosidad</Text>
      <LumBar
        value={value}
        onChange={onChange}
        id={sliderId}
        label={`Luminosidad de ${label}`}
        fondo={fondo}
      />
      <View style={styles.sliderGap} />
      <SwatchRow colors={swatches} selected={value} onSelect={onChange} label={label} />
    </View>
  );
}

// Selector de fuente estilo "selector de personaje": una a la vez, con flechas
// a los lados. La tarjeta central previsualiza en vivo el nombre y una frase de
// muestra ya renderizados en la fuente elegida.
function FontPicker({ selected, onSelect }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const total = BODY_FONT_IDS.length;
  const idx = Math.max(0, BODY_FONT_IDS.indexOf(selected));
  const font = BODY_FONTS[BODY_FONT_IDS[idx]];
  const go = (delta) => onSelect(BODY_FONT_IDS[(idx + delta + total) % total]);

  return (
    <View style={styles.swatchBlock}>
      <Text style={styles.swatchLabel}>Fuente</Text>
      <View style={styles.fontCarousel}>
        <Tappable
          style={styles.fontArrow}
          onPress={() => go(-1)}
          accessibilityLabel="Fuente anterior"
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
        </Tappable>

        <View
          style={styles.fontStage}
          accessible
          accessibilityLabel={`Fuente ${font.label}: ${font.tagline}. ${idx + 1} de ${total}`}
        >
          <Text style={[styles.fontStageName, { fontFamily: font.bodyFamily }]} numberOfLines={1}>
            {font.label}
          </Text>
          <Text style={styles.fontStageTag} numberOfLines={1}>
            {font.tagline}
          </Text>
          <Text style={[styles.fontStageSample, { fontFamily: font.bodyFamily }]} numberOfLines={1}>
            Hoy me siento en calma
          </Text>
          <Text style={styles.fontStageCount}>
            {idx + 1} / {total}
          </Text>
        </View>

        <Tappable
          style={styles.fontArrow}
          onPress={() => go(1)}
          accessibilityLabel="Fuente siguiente"
        >
          <Ionicons name="chevron-forward" size={22} color={theme.colors.primary} />
        </Tappable>
      </View>
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

// Aviso de contraste: informa y nada más. Los colores siguen siendo libres — no
// condiciona guardar ni aplicar — pero deja dicho cuándo una combinación va a
// costar de leer, que es la regla de la casa ("avisa, no bloquea"). Reusa
// evaluateCustomTheme, la misma evaluación que verifica contrast.test.js.
function ContrastHint({ issues }) {
  const styles = useStyles();
  if (issues.length === 0) return null;

  const aviso =
    issues.length === 1
      ? 'Hay una combinación de colores que puede costar de leer.'
      : `Hay ${issues.length} combinaciones de colores que pueden costar de leer.`;

  return <Text style={styles.contrastHint}>{`${aviso} Puedes usar la paleta igual.`}</Text>;
}

function CustomThemeEditor({
  draft,
  onChangeConfig,
  onRename,
  palettes,
  activeId,
  applied,
  onSelectPalette,
  onDeletePalette,
  onNewPalette,
  onSavePalette,
  canSave,
  contrastIssues,
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
        label="Primario"
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
      <ColorField
        label="Fondo"
        value={draft.background}
        onChange={(background) => onChangeConfig({ background })}
        swatches={SWATCHES.background}
        sliderId="background"
        fondo
      />
      <FontPicker
        selected={draft.bodyFont}
        onSelect={(bodyFont) => onChangeConfig({ bodyFont })}
      />

      <ContrastHint issues={contrastIssues} />

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
    theme,
    themeChoice,
    applyThemeChoice,
    isApplying,
    customConfig,
    savePalette,
    deletePalette,
    textScale,
    setTextScale,
    reduceMotion,
    setReduceMotion,
    hapticsEnabled,
    setHaptics,
  } = useTheme();
  const styles = useStyles();
  const systemScheme = useColorScheme();
  const [candidate, setCandidate] = useState(themeChoice);
  // draft = paleta en edición (copia local con id/name/config). Arranca en la activa.
  const [draft, setDraft] = useState(() => ({ ...paletaActiva(customConfig) }));

  const isCustomCandidate = candidate === CUSTOM_THEME_ID;
  const draftTheme = useMemo(() => makeCustomTheme(configDe(draft)), [draft]);
  const contrastIssues = useMemo(() => evaluateCustomTheme(draftTheme), [draftTheme]);

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
  // Borrar una paleta no se puede deshacer, así que pregunta antes.
  const confirmDeletePalette = (id) => {
    const paleta = customConfig.palettes.find((p) => p.id === id);
    confirmarAccion({
      titulo: `¿Borrar "${paleta?.name ?? 'esta paleta'}"?`,
      mensaje: 'Se pierde esta combinación de colores y fuente. No se puede deshacer.',
      accion: 'Borrar',
      onConfirm: () => removePaletteById(id),
    });
  };
  // Guardar exige solo un nombre no vacío; los colores son libres (el usuario
  // elige lo que quiera, sin condición de contraste).
  const nameOk = draft.name.trim().length > 0;
  const canSave = draftDiverge && nameOk;
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

  // Ajustes cuelga del Perfil, así que "Ver mi perfil" casi siempre es volver a
  // la pantalla anterior; navegar de nuevo apilaría un duplicado.
  const handleVerPerfil = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/perfil');
  };

  const cerrarSesion = async () => {
    await unregisterPushTokenForLogout();
    await AsyncStorage.removeItem('token');
    router.replace('/login');
  };

  const handleCerrarSesion = () =>
    confirmarAccion({
      titulo: '¿Cerrar sesión?',
      mensaje: 'Tendrás que volver a entrar con tu cuenta. Tus datos quedan guardados.',
      accion: 'Cerrar sesión',
      onConfirm: cerrarSesion,
    });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Tappable
          style={styles.back}
          onPress={() => router.back()}
          haptic={false}
          accessibilityLabel="Volver a mi perfil"
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.onHeader} />
        </Tappable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Ajustes</Text>
          <Text style={styles.headerSubtitle}>Tu app, a tu manera</Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
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
              palettes={customConfig.palettes}
              activeId={customConfig.activeId}
              applied={applied}
              onSelectPalette={selectPalette}
              onDeletePalette={confirmDeletePalette}
              onNewPalette={newPalette}
              onSavePalette={savePaletteDraft}
              canSave={canSave}
              contrastIssues={contrastIssues}
            />
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

        <SectionCard
          title="Accesibilidad"
          hint="Ajusta la lectura y el movimiento sin cambiar tu tema ni tu fuente."
        >
          <Text style={styles.a11yLabel}>Tamaño del texto</Text>
          <SegmentedTabs
            tabs={TEXT_SCALE_TABS}
            activeId={String(textScale)}
            onChange={(id) => setTextScale(Number(id))}
          />
          <View style={styles.a11yGap} />
          <FilaSwitch
            title="Reducir movimiento"
            hint="Quita las animaciones de entrada y las transiciones de tema."
            value={reduceMotion}
            onValueChange={setReduceMotion}
            divider
            accessibilityLabel="Reducir movimiento"
            accessibilityHint="Desactiva las animaciones de la aplicación"
          />
          <FilaSwitch
            title="Vibración al tocar"
            hint="La respuesta táctil de botones y controles."
            value={hapticsEnabled}
            onValueChange={setHaptics}
            accessibilityLabel="Vibración al tocar"
          />
        </SectionCard>

        <SectionCard
          title="Notificaciones"
          hint="Elige qué avisos quieres recibir y cuándo prefieres silencio."
        >
          <Tappable
            style={styles.settingsLink}
            onPress={() => router.push('/ajustes/notificaciones')}
            accessibilityLabel="Abrir preferencias de notificaciones"
          >
            <View style={styles.settingsLinkCopy}>
              <Text style={styles.settingsLinkTitle}>Preferencias y no molestar</Text>
              <Text style={styles.settingsLinkHint}>Mensajes, mascota, actividades y recordatorios</Text>
            </View>
            <Text style={styles.settingsLinkArrow}>›</Text>
          </Tappable>
        </SectionCard>

        <SectionCard title="Cuenta">
          <Tappable
            style={styles.settingsLink}
            onPress={handleVerPerfil}
            accessibilityLabel="Ver mi perfil"
          >
            <View style={styles.settingsLinkCopy}>
              <Text style={styles.settingsLinkTitle}>Ver mi perfil</Text>
              <Text style={styles.settingsLinkHint}>Tu foto, racha, amigos y mascotas</Text>
            </View>
            <Text style={styles.settingsLinkArrow}>›</Text>
          </Tappable>
          <View style={styles.accountDivider} />
          {/* Versión a la vista: sin esto no hay forma de saber qué build corre el
              teléfono cuando algo "no se ve aplicado". */}
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Acerca de</Text>
            <Text style={styles.aboutValue}>{APP_BUILD}</Text>
          </View>
          <View style={styles.accountDivider} />
          <Tappable
            style={styles.btnSalir}
            onPress={handleCerrarSesion}
            haptic={false}
            accessibilityLabel="Cerrar sesión"
          >
            <Text style={styles.btnSalirTxt}>Cerrar sesión</Text>
          </Tappable>
        </SectionCard>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeThemedStyles((t) => ({
  // Ajustes se abre como push desde el Perfil, así que trae su propio header
  // (mismo patrón que app/ajustes/notificaciones.jsx) en vez del del navegador.
  screen: { flex: 1, backgroundColor: t.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.headerBackground,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { marginLeft: 6 },
  headerTitle: { ...t.typography.type.title, color: t.colors.onHeader },
  headerSubtitle: {
    ...t.typography.type.caption,
    color: t.colors.onHeader,
    opacity: 0.78,
    marginTop: 1,
  },
  container: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: 20,
    paddingBottom: 40,
  },
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
  optionInfo: { flex: 1, minWidth: 0 },
  optionName: {
    fontSize: t.fontSize(15),
    ...t.typography.fonts.semibold,
    color: t.colors.text,
    marginBottom: 2,
  },
  optionTagline: { fontSize: t.fontSize(12), color: t.colors.textMuted },
  swatches: { flexDirection: 'row', gap: 4, marginLeft: 10 },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: swatchStroke(t) },
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
  hexWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hexInput: {
    minWidth: 82,
    fontSize: t.fontSize(12),
    color: t.colors.text,
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    borderRadius: t.shape.radiusSm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: 'center',
  },
  colorPreview: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: t.shape.borderThin,
    borderColor: swatchStroke(t),
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
    borderColor: swatchStroke(t),
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
  fontCarousel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fontArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontStage: {
    flex: 1,
    minHeight: 104,
    borderRadius: t.shape.radiusLg,
    borderWidth: t.shape.borderThick,
    borderColor: t.colors.primary,
    backgroundColor: t.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    ...t.shadows.card,
  },
  fontStageName: { fontSize: t.fontSize(22), color: t.colors.text },
  fontStageTag: { fontSize: t.fontSize(12), color: t.colors.textMuted, marginTop: 3 },
  fontStageSample: { fontSize: t.fontSize(15), color: t.colors.text, marginTop: 10 },
  fontStageCount: {
    fontSize: t.fontSize(11),
    ...t.typography.fonts.semibold,
    color: t.colors.primary,
    marginTop: 10,
  },
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
  palMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  palSwatches: { flexDirection: 'row', gap: 4, marginRight: 10 },
  palSwatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: swatchStroke(t) },
  palInfo: { flex: 1, minWidth: 0 },
  palName: {
    fontSize: t.fontSize(14),
    ...t.typography.fonts.semibold,
    color: t.colors.text,
  },
  palFont: { fontSize: t.fontSize(11), color: t.colors.textMuted, marginTop: 1 },
  palDelete: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  palDeleteTxt: { fontSize: t.fontSize(12), color: t.colors.danger },
  palNew: {
    borderWidth: t.shape.borderMedium,
    borderColor: t.colors.primarySoftBorder,
    borderRadius: t.shape.radiusMd,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  palNewTxt: { fontSize: t.fontSize(14), ...t.typography.fonts.semibold, color: t.colors.primary },
  palLimit: { fontSize: t.fontSize(12), color: t.colors.textMuted, marginTop: 2 },
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
  a11yLabel: {
    fontSize: t.fontSize(13),
    ...t.typography.fonts.semibold,
    color: t.colors.text,
    marginBottom: 8,
  },
  a11yGap: { height: 6 },
  contrastHint: { ...t.typography.type.caption, color: t.colors.textMuted, marginBottom: 14 },
  aboutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  aboutLabel: { ...t.typography.type.body, color: t.colors.text },
  aboutValue: { ...t.typography.type.caption, color: t.colors.textMuted },
  btnSalir: {
    borderWidth: t.shape.borderMedium,
    borderColor: t.colors.border,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 13,
    alignItems: 'center',
  },
  accountDivider: { height: t.shape.borderThin, backgroundColor: t.colors.border, marginVertical: 16 },
  btnSalirTxt: { color: t.colors.textMuted, fontSize: t.fontSize(15) },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.background,
    borderRadius: t.shape.radiusMd,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    padding: 14,
  },
  settingsLinkCopy: { flex: 1 },
  settingsLinkTitle: {
    fontSize: t.fontSize(15),
    ...t.typography.fonts.semibold,
    color: t.colors.text,
  },
  settingsLinkHint: { fontSize: t.fontSize(12), color: t.colors.textMuted, marginTop: 3 },
  settingsLinkArrow: { fontSize: t.fontSize(28), color: t.colors.primary, marginLeft: 12 },
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
