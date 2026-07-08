import sereno from './sereno';
import nocturno from './nocturno';
import amanecer from './amanecer';
import contraste from './contraste';
import fiesta from './fiesta';

// Helpers derivados que todo tema expone (p. ej. fontSize aplica la escala del tema).
const withHelpers = (theme) => ({
  ...theme,
  fontSize: (size) => Math.round(size * theme.typography.scale),
});

const ALL_THEMES = [sereno, nocturno, amanecer, contraste, fiesta];

export const THEMES = Object.fromEntries(ALL_THEMES.map((t) => [t.id, withHelpers(t)]));
export const THEME_IDS = ALL_THEMES.map((t) => t.id);
export const DEFAULT_THEME_ID = 'sereno';
export const AUTO_THEME_ID = 'auto';

// Lo que el usuario puede elegir: un tema concreto o seguir el sistema.
export const VALID_THEME_CHOICES = [...THEME_IDS, AUTO_THEME_ID];

// 'auto' sigue el modo del sistema: claro → sereno, oscuro → nocturno.
// Ante un id desconocido (valor corrupto o de una versión vieja) cae al default.
export function resolveThemeId(choice, systemScheme) {
  if (choice === AUTO_THEME_ID) {
    return systemScheme === 'dark' && THEMES.nocturno ? 'nocturno' : DEFAULT_THEME_ID;
  }
  return THEMES[choice] ? choice : DEFAULT_THEME_ID;
}
