import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, useColorScheme } from 'react-native';
import { THEMES, DEFAULT_THEME_ID, CUSTOM_THEME_ID, resolveThemeId } from './themes';
import {
  loadThemeChoice,
  saveThemeChoice,
  loadCustomThemeConfig,
  saveCustomThemeConfig,
  DEFAULT_TEXT_SCALE,
  LARGE_TEXT_SCALE,
  loadTextScale,
  saveTextScale,
} from './persistence';
import {
  makeCustomTheme,
  DEFAULT_CUSTOM_CONFIG,
  DEFAULT_CUSTOM_THEME,
  activePalette,
  upsertPalette,
  removePalette,
  setActive,
} from './customTheme';
import { apiUpdateThemePreference, apiUpdateMe } from '../services/api';

const ThemeContext = createContext(null);

// Los temas existentes declaran tanto presets tipográficos como tamaños
// puntuales vía fontSize(). Escalamos ambos para que el modo accesible sea
// coherente en toda la app, incluidos los ThemeScope de previsualización.
export function scaleThemeText(theme, scale = DEFAULT_TEXT_SCALE) {
  if (scale === DEFAULT_TEXT_SCALE) return theme;
  const type = Object.fromEntries(
    Object.entries(theme.typography.type).map(([name, style]) => [
      name,
      {
        ...style,
        fontSize: Math.round(style.fontSize * scale),
        lineHeight: Math.round(style.lineHeight * scale),
      },
    ]),
  );
  const baseScale = theme.typography.scale;
  return {
    ...theme,
    typography: { ...theme.typography, scale: baseScale * scale, type },
    fontSize: (size) => Math.round(size * baseScale * scale),
  };
}

export function ThemeProvider({ children }) {
  // null = aún no se hidrató la elección guardada; el root layout no renderiza hasta entonces.
  const [choice, setChoice] = useState(null);
  // Contenedor de paletas personalizadas { activeId, palettes } (null = nunca
  // configurado → DEFAULT_CUSTOM_THEME).
  const [customConfig, setCustomConfigState] = useState(null);
  const [textScale, setTextScaleState] = useState(DEFAULT_TEXT_SCALE);
  // Velo de transición al aplicar un tema: { color, opacity } mientras anima.
  const [veil, setVeil] = useState(null);
  const systemScheme = useColorScheme();

  useEffect(() => {
    let alive = true;
    Promise.all([loadThemeChoice(), loadCustomThemeConfig(), loadTextScale()]).then(([
      stored,
      storedCustom,
      storedTextScale,
    ]) => {
      if (!alive) return;
      setCustomConfigState(storedCustom);
      setTextScaleState(storedTextScale);
      setChoice(stored);
    });
    return () => {
      alive = false;
    };
  }, []);

  // sync: false cuando el valor VIENE del servidor (adopción al login),
  // para no reenviarle su propio dato. El PATCH es best-effort: si falla
  // (sin red, backend viejo), el tema queda aplicado y guardado local igual.
  const setThemeChoice = useCallback((next, { sync = true } = {}) => {
    setChoice(next);
    saveThemeChoice(next);
    if (sync) apiUpdateThemePreference(next).catch(() => {});
  }, []);

  // Contenedor de paletas: persiste local y sincroniza best-effort, con la
  // misma semántica de sync que setThemeChoice.
  const setCustomContainer = useCallback((next, { sync = true } = {}) => {
    setCustomConfigState(next);
    saveCustomThemeConfig(next);
    if (sync) apiUpdateMe({ customTheme: next }).catch(() => {});
  }, []);

  const setTextScale = useCallback((next) => {
    const scale = next === LARGE_TEXT_SCALE ? LARGE_TEXT_SCALE : DEFAULT_TEXT_SCALE;
    setTextScaleState(scale);
    saveTextScale(scale);
  }, []);

  // Gestión de paletas: parten del contenedor actual (o el default) y aplican
  // una operación pura antes de persistir. Alta/edición, borrado y activación.
  const base = () => customConfig ?? DEFAULT_CUSTOM_THEME;
  const savePalette = useCallback(
    (palette) => setCustomContainer(upsertPalette(base(), palette)),
    [customConfig, setCustomContainer],
  );
  const deletePalette = useCallback(
    (id) => setCustomContainer(removePalette(base(), id)),
    [customConfig, setCustomContainer],
  );
  const setActivePalette = useCallback(
    (id) => setCustomContainer(setActive(base(), id)),
    [customConfig, setCustomContainer],
  );

  // El tema personalizado se construye desde la paleta activa. makeThemedStyles
  // cachea estilos por identidad del objeto tema (WeakMap).
  const customTheme = useMemo(
    () => makeCustomTheme(activePalette(customConfig ?? DEFAULT_CUSTOM_THEME) ?? DEFAULT_CUSTOM_CONFIG),
    [customConfig],
  );

  // Aplica un tema con transición suave: sube un velo del color de fondo del tema
  // entrante, conmuta el tema debajo del velo y lo desvanece. Para el modo
  // personalizado, `custom` (opcional) es un contenedor a persistir junto con
  // la elección.
  const applyThemeChoice = useCallback(
    (next, { custom } = {}) => {
      const container = custom ?? customConfig ?? DEFAULT_CUSTOM_THEME;
      const target =
        next === CUSTOM_THEME_ID
          ? makeCustomTheme(activePalette(container) ?? DEFAULT_CUSTOM_CONFIG)
          : THEMES[resolveThemeId(next, systemScheme)];
      const opacity = new Animated.Value(0);
      setVeil({ color: target.colors.background, opacity });
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start(() => {
        if (custom) setCustomContainer(custom);
        setThemeChoice(next);
        Animated.timing(opacity, {
          toValue: 0,
          duration: 260,
          delay: 60,
          useNativeDriver: true,
        }).start(() => setVeil(null));
      });
    },
    [systemScheme, setThemeChoice, setCustomContainer, customConfig],
  );

  const hydrated = choice !== null;
  const effectiveChoice = hydrated ? choice : DEFAULT_THEME_ID;
  const baseTheme =
    effectiveChoice === CUSTOM_THEME_ID
      ? customTheme
      : THEMES[resolveThemeId(effectiveChoice, systemScheme)];
  const theme = useMemo(() => scaleThemeText(baseTheme, textScale), [baseTheme, textScale]);

  const value = useMemo(
    () => ({
      theme,
      themeChoice: effectiveChoice,
      hydrated,
      setThemeChoice,
      applyThemeChoice,
      customConfig: customConfig ?? DEFAULT_CUSTOM_THEME,
      customTheme,
      setCustomContainer,
      savePalette,
      deletePalette,
      setActivePalette,
      textScale,
      setTextScale,
      isApplying: veil !== null,
      veil,
    }),
    [
      theme,
      effectiveChoice,
      hydrated,
      setThemeChoice,
      applyThemeChoice,
      customConfig,
      customTheme,
      setCustomContainer,
      savePalette,
      deletePalette,
      setActivePalette,
      textScale,
      setTextScale,
      veil,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Overlay de la transición de tema; debe renderizarse al final del root layout.
export function ThemeVeil() {
  const { veil } = useTheme();
  if (!veil) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: veil.color, opacity: veil.opacity, zIndex: 1000, elevation: 1000 },
      ]}
    />
  );
}

// Fija un tema en un subárbol sin aplicarlo globalmente (preview de Ajustes).
export function ThemeScope({ theme, children }) {
  const parent = useContext(ThemeContext);
  const scaledTheme = useMemo(
    () => scaleThemeText(theme, parent?.textScale ?? DEFAULT_TEXT_SCALE),
    [theme, parent?.textScale],
  );
  const value = useMemo(
    () => ({ ...(parent ?? {}), theme: scaledTheme, isPreview: true }),
    [parent, scaledTheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}

// Crea un hook de estilos tematizados: const useStyles = makeThemedStyles((t) => ({ ... }));
// Cachea por identidad del objeto tema, así cada factory corre una sola vez por tema.
export function makeThemedStyles(factory) {
  const cache = new WeakMap();
  return function useThemedStyles() {
    const { theme } = useTheme();
    let styles = cache.get(theme);
    if (!styles) {
      styles = StyleSheet.create(factory(theme));
      cache.set(theme, styles);
    }
    return styles;
  };
}
