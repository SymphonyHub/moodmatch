import {
  THEMES,
  THEME_IDS,
  DEFAULT_THEME_ID,
  AUTO_THEME_ID,
  VALID_THEME_CHOICES,
  CUSTOM_THEME_ID,
  resolveThemeId,
} from '../theme/themes';
import {
  MOOD_KEYS,
  CATEGORY_KEYS,
  REQUIRED_COLOR_KEYS,
  REQUIRED_SHAPE_KEYS,
  REQUIRED_FONT_ROLES,
  REQUIRED_TYPE_ROLES,
  REQUIRED_SHADOW_KEYS,
} from '../theme/tokens';

describe('registro de temas', () => {
  test('existen los 5 temas y el default está entre ellos', () => {
    expect(THEME_IDS).toHaveLength(5);
    expect(THEMES[DEFAULT_THEME_ID]).toBeDefined();
  });

  test('las elecciones válidas son los temas más "auto" y "personalizado"', () => {
    expect(VALID_THEME_CHOICES).toEqual([...THEME_IDS, AUTO_THEME_ID, CUSTOM_THEME_ID]);
  });

  test('"personalizado" no vive en el registro estático: resuelve al default', () => {
    // El ThemeProvider lo intercepta antes; cualquier otro consumidor
    // (o una versión vieja de la app) obtiene el tema por defecto.
    expect(resolveThemeId(CUSTOM_THEME_ID, 'light')).toBe(DEFAULT_THEME_ID);
  });

  test.each(THEME_IDS)('tema %s tiene identidad completa', (id) => {
    const t = THEMES[id];
    expect(t.id).toBe(id);
    expect(typeof t.name).toBe('string');
    expect(typeof t.tagline).toBe('string');
    expect(typeof t.isDark).toBe('boolean');
    expect(['dark', 'light']).toContain(t.statusBar.onBackground);
    expect(['dark', 'light']).toContain(t.statusBar.onHeader);
    expect(['outline', 'filled']).toContain(t.icons.variant);
  });

  test.each(THEME_IDS)('tema %s define todas las claves de color', (id) => {
    const { colors } = THEMES[id];
    for (const key of REQUIRED_COLOR_KEYS) {
      expect(colors[key]).toBeDefined();
    }
  });

  test.each(THEME_IDS)('tema %s define los 6 estados de ánimo con color y soft', (id) => {
    const { moods } = THEMES[id].colors;
    expect(Object.keys(moods).sort()).toEqual([...MOOD_KEYS].sort());
    for (const mood of MOOD_KEYS) {
      expect(moods[mood].color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(moods[mood].soft).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test.each(THEME_IDS)('tema %s define las 8 categorías de actividades', (id) => {
    const { categories } = THEMES[id].colors;
    expect(Object.keys(categories).sort()).toEqual([...CATEGORY_KEYS].sort());
  });

  test.each(THEME_IDS)('tema %s define forma, tipografía y sombras completas', (id) => {
    const t = THEMES[id];
    for (const key of REQUIRED_SHAPE_KEYS) {
      expect(typeof t.shape[key]).toBe('number');
    }
    for (const role of REQUIRED_FONT_ROLES) {
      expect(t.typography.fonts[role]).toBeDefined();
    }
    for (const key of REQUIRED_SHADOW_KEYS) {
      expect(t.shadows[key]).toBeDefined();
    }
  });

  test.each(THEME_IDS)('tema %s define los presets de jerarquía tipográfica', (id) => {
    const { type } = THEMES[id].typography;
    for (const role of REQUIRED_TYPE_ROLES) {
      expect(typeof type[role].fontSize).toBe('number');
      expect(typeof type[role].lineHeight).toBe('number');
      expect(type[role].lineHeight).toBeGreaterThanOrEqual(type[role].fontSize);
    }
    // Sora titula en todos los temas: consistencia de marca.
    expect(type.display.fontFamily).toBe('Sora_700Bold');
    expect(type.title.fontFamily).toBe('Sora_700Bold');
    expect(type.section.fontFamily).toBe('Sora_600SemiBold');
  });

  test.each(THEME_IDS)('tema %s expone fontSize aplicando su escala', (id) => {
    const t = THEMES[id];
    expect(t.fontSize(16)).toBe(Math.round(16 * t.typography.scale));
  });
});

describe('resolveThemeId', () => {
  test('un id concreto se resuelve a sí mismo', () => {
    expect(resolveThemeId('fiesta', 'light')).toBe('fiesta');
    expect(resolveThemeId('nocturno', 'light')).toBe('nocturno');
  });

  test('auto sigue el modo del sistema', () => {
    expect(resolveThemeId(AUTO_THEME_ID, 'dark')).toBe('nocturno');
    expect(resolveThemeId(AUTO_THEME_ID, 'light')).toBe(DEFAULT_THEME_ID);
  });

  test('auto sin esquema del sistema cae al default', () => {
    expect(resolveThemeId(AUTO_THEME_ID, null)).toBe(DEFAULT_THEME_ID);
  });

  test('un id desconocido o corrupto cae al default', () => {
    expect(resolveThemeId('temazo', 'light')).toBe(DEFAULT_THEME_ID);
    expect(resolveThemeId(undefined, 'light')).toBe(DEFAULT_THEME_ID);
    expect(resolveThemeId(null, 'dark')).toBe(DEFAULT_THEME_ID);
  });
});
