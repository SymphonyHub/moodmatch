import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, useColorScheme } from 'react-native';
import { THEMES, DEFAULT_THEME_ID, resolveThemeId } from './themes';
import { loadThemeChoice, saveThemeChoice } from './persistence';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // null = aún no se hidrató la elección guardada; el root layout no renderiza hasta entonces.
  const [choice, setChoice] = useState(null);
  // Velo de transición al aplicar un tema: { color, opacity } mientras anima.
  const [veil, setVeil] = useState(null);
  const systemScheme = useColorScheme();

  useEffect(() => {
    let alive = true;
    loadThemeChoice().then((stored) => {
      if (alive) setChoice(stored);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setThemeChoice = useCallback((next) => {
    setChoice(next);
    saveThemeChoice(next);
  }, []);

  // Aplica un tema con transición suave: sube un velo del color de fondo del tema
  // entrante, conmuta el tema debajo del velo y lo desvanece.
  const applyThemeChoice = useCallback(
    (next) => {
      const target = THEMES[resolveThemeId(next, systemScheme)];
      const opacity = new Animated.Value(0);
      setVeil({ color: target.colors.background, opacity });
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start(() => {
        setThemeChoice(next);
        Animated.timing(opacity, {
          toValue: 0,
          duration: 260,
          delay: 60,
          useNativeDriver: true,
        }).start(() => setVeil(null));
      });
    },
    [systemScheme, setThemeChoice],
  );

  const hydrated = choice !== null;
  const effectiveChoice = hydrated ? choice : DEFAULT_THEME_ID;
  const theme = THEMES[resolveThemeId(effectiveChoice, systemScheme)];

  const value = useMemo(
    () => ({
      theme,
      themeChoice: effectiveChoice,
      hydrated,
      setThemeChoice,
      applyThemeChoice,
      isApplying: veil !== null,
      veil,
    }),
    [theme, effectiveChoice, hydrated, setThemeChoice, applyThemeChoice, veil],
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
  const value = useMemo(() => ({ ...(parent ?? {}), theme, isPreview: true }), [parent, theme]);
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
