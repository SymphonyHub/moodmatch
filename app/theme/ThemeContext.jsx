import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { THEMES, DEFAULT_THEME_ID, resolveThemeId } from './themes';
import { loadThemeChoice, saveThemeChoice } from './persistence';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // null = aún no se hidrató la elección guardada; el root layout no renderiza hasta entonces.
  const [choice, setChoice] = useState(null);
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

  const hydrated = choice !== null;
  const effectiveChoice = hydrated ? choice : DEFAULT_THEME_ID;
  const theme = THEMES[resolveThemeId(effectiveChoice, systemScheme)];

  const value = useMemo(
    () => ({ theme, themeChoice: effectiveChoice, hydrated, setThemeChoice }),
    [theme, effectiveChoice, hydrated, setThemeChoice],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
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
