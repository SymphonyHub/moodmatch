import {
  CUSTOM_THEME_ID,
  BODY_FONT_IDS,
  BODY_FONTS,
  SWATCHES,
  DEFAULT_CUSTOM_CONFIG,
  AA_MIN,
  isValidPaletteConfig,
  makeCustomTheme,
  evaluateCustomTheme,
  mix,
} from '../theme/customTheme';
import { contrastRatio, relativeLuminance } from '../theme/contrast';
import {
  MOOD_KEYS,
  CATEGORY_KEYS,
  REQUIRED_COLOR_KEYS,
  REQUIRED_SHAPE_KEYS,
  REQUIRED_FONT_ROLES,
  REQUIRED_TYPE_ROLES,
  REQUIRED_SHADOW_KEYS,
} from '../theme/tokens';

const HEX = /^#[0-9a-f]{6}$/i;

const configOscura = {
  primary: '#93a3f0',
  accent: '#f0977a',
  background: '#12141c',
  bodyFont: 'nunito',
};

describe('isValidPaletteConfig', () => {
  test('acepta la config por defecto y una oscura', () => {
    expect(isValidPaletteConfig(DEFAULT_CUSTOM_CONFIG)).toBe(true);
    expect(isValidPaletteConfig(configOscura)).toBe(true);
  });

  test('acepta las fuentes nuevas de Fase 10', () => {
    ['rubik', 'lora', 'bitter', 'fraunces'].forEach((bodyFont) => {
      expect(isValidPaletteConfig({ ...DEFAULT_CUSTOM_CONFIG, bodyFont })).toBe(true);
    });
  });

  test.each([
    ['null', null],
    ['array', ['#4a5fc1']],
    ['string', 'sereno'],
    ['hex corto', { ...DEFAULT_CUSTOM_CONFIG, primary: '#fff' }],
    ['hex inválido', { ...DEFAULT_CUSTOM_CONFIG, background: 'azul' }],
    ['fuente desconocida', { ...DEFAULT_CUSTOM_CONFIG, bodyFont: 'papyrus' }],
    ['clave extra', { ...DEFAULT_CUSTOM_CONFIG, sorpresa: '#000000' }],
    [
      'clave faltante',
      { primary: '#4a5fc1', accent: '#b34c30', background: '#f5f6fa' },
    ],
  ])('rechaza %s', (_caso, value) => {
    expect(isValidPaletteConfig(value)).toBe(false);
  });
});

describe('mix', () => {
  test('interpola entre los extremos', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

// El tema generado debe cumplir el MISMO contrato de forma que los 5 temas
// base (themes.test.js), sea cual sea la config de entrada.
describe.each([
  ['clara (default)', DEFAULT_CUSTOM_CONFIG],
  ['oscura', configOscura],
  ['fuente baloo2', { ...DEFAULT_CUSTOM_CONFIG, bodyFont: 'baloo2' }],
])('contrato del tema personalizado — config %s', (_nombre, config) => {
  const theme = makeCustomTheme(config);

  test('identidad completa', () => {
    expect(theme.id).toBe(CUSTOM_THEME_ID);
    expect(typeof theme.name).toBe('string');
    expect(typeof theme.tagline).toBe('string');
    expect(typeof theme.isDark).toBe('boolean');
    expect(['dark', 'light']).toContain(theme.statusBar.onBackground);
    expect(['dark', 'light']).toContain(theme.statusBar.onHeader);
    expect(['outline', 'filled']).toContain(theme.icons.variant);
  });

  test('todas las claves de color requeridas, en hex', () => {
    REQUIRED_COLOR_KEYS.forEach((key) => {
      expect(theme.colors[key]).toBeDefined();
      if (key !== 'overlay') expect(theme.colors[key]).toMatch(HEX);
    });
  });

  test('moods y categorías completos', () => {
    MOOD_KEYS.forEach((mood) => {
      expect(theme.colors.moods[mood].color).toMatch(HEX);
      expect(theme.colors.moods[mood].soft).toMatch(HEX);
    });
    CATEGORY_KEYS.forEach((cat) => {
      expect(theme.colors.categories[cat]).toMatch(HEX);
    });
  });

  test('shape, fonts, type y shadows completos', () => {
    REQUIRED_SHAPE_KEYS.forEach((key) => expect(typeof theme.shape[key]).toBe('number'));
    REQUIRED_FONT_ROLES.forEach((role) =>
      expect(theme.typography.fonts[role]).toBeDefined(),
    );
    REQUIRED_TYPE_ROLES.forEach((role) => {
      const preset = theme.typography.type[role];
      expect(typeof preset.fontSize).toBe('number');
      expect(preset.lineHeight).toBeGreaterThanOrEqual(preset.fontSize);
    });
    REQUIRED_SHADOW_KEYS.forEach((key) => expect(theme.shadows[key]).toBeDefined());
  });

  test('Sora fija en la jerarquía alta (contrato de marca)', () => {
    expect(theme.typography.type.display.fontFamily).toBe('Sora_700Bold');
    expect(theme.typography.type.title.fontFamily).toBe('Sora_700Bold');
    expect(theme.typography.type.section.fontFamily).toBe('Sora_600SemiBold');
  });

  test('fontSize aplica la escala', () => {
    expect(theme.fontSize(16)).toBe(16);
  });
});

describe('derivación', () => {
  test('isDark según la luminancia del fondo', () => {
    expect(makeCustomTheme(DEFAULT_CUSTOM_CONFIG).isDark).toBe(false);
    expect(makeCustomTheme(configOscura).isDark).toBe(true);
  });

  test('la fuente elegida gobierna cuerpo y roles de peso', () => {
    BODY_FONT_IDS.forEach((id) => {
      const theme = makeCustomTheme({ ...DEFAULT_CUSTOM_CONFIG, bodyFont: id });
      expect(theme.typography.type.body.fontFamily).toBe(BODY_FONTS[id].bodyFamily);
      expect(theme.typography.fonts).toBe(BODY_FONTS[id].fonts);
    });
  });
});

describe('evaluateCustomTheme', () => {
  test('las combinaciones recomendadas no reportan fallos', () => {
    expect(evaluateCustomTheme(makeCustomTheme(DEFAULT_CUSTOM_CONFIG))).toEqual([]);
    expect(evaluateCustomTheme(makeCustomTheme(configOscura))).toEqual([]);
  });

  test('detecta una combinación mala e incluye el par primario/tarjetas', () => {
    const malo = makeCustomTheme({
      primary: '#ffee58',
      accent: '#b34c30',
      background: '#ffffff',
      bodyFont: 'manrope',
    });
    const issues = evaluateCustomTheme(malo);
    expect(issues.length).toBeGreaterThan(0);
    const pares = issues.map((i) => i.pair);
    expect(pares).toContain('Color primario sobre las tarjetas');
    issues.forEach((i) => expect(i.ratio).toBeLessThan(AA_MIN));
  });
});

// Curación de swatches: garantías mínimas que la UI de Ajustes promete.
describe('swatches curados', () => {
  const fondosClaros = SWATCHES.background.filter((bg) => relativeLuminance(bg) >= 0.35);
  const fondosOscuros = SWATCHES.background.filter((bg) => relativeLuminance(bg) < 0.35);

  test('hay fondos claros y oscuros', () => {
    expect(fondosClaros.length).toBeGreaterThanOrEqual(4);
    expect(fondosOscuros.length).toBeGreaterThanOrEqual(4);
  });

  test.each(SWATCHES.background)(
    'fondo %s: textos y moods heredados cumplen AA',
    (background) => {
      const theme = makeCustomTheme({ ...DEFAULT_CUSTOM_CONFIG, background });
      const { colors: c } = theme;

      ['background', 'surface', 'surfaceElevated'].forEach((bg) => {
        expect(contrastRatio(c.text, c[bg])).toBeGreaterThanOrEqual(AA_MIN);
        expect(contrastRatio(c.textMuted, c[bg])).toBeGreaterThanOrEqual(AA_MIN);
        expect(contrastRatio(c.textFaint, c[bg])).toBeGreaterThanOrEqual(AA_MIN);
        expect(contrastRatio(c.danger, c[bg])).toBeGreaterThanOrEqual(AA_MIN);
      });

      Object.values(c.moods).forEach(({ color, soft }) => {
        expect(contrastRatio(color, c.surface)).toBeGreaterThanOrEqual(AA_MIN);
        expect(contrastRatio(color, soft)).toBeGreaterThanOrEqual(AA_MIN);
      });
      Object.values(c.categories).forEach((color) => {
        expect(contrastRatio(color, c.surface)).toBeGreaterThanOrEqual(AA_MIN);
      });
    },
  );

  test.each(SWATCHES.background)(
    'fondo %s: existe al menos un primario y un acento del set sin ningún fallo',
    (background) => {
      const hayPrimarioLimpio = SWATCHES.primary.some((primary) => {
        const theme = makeCustomTheme({ ...DEFAULT_CUSTOM_CONFIG, background, primary });
        return !evaluateCustomTheme(theme).some((i) => i.pair.includes('primario'));
      });
      const hayAcentoLimpio = SWATCHES.accent.some((accent) => {
        const theme = makeCustomTheme({ ...DEFAULT_CUSTOM_CONFIG, background, accent });
        return !evaluateCustomTheme(theme).some((i) => i.pair.includes('Acento'));
      });
      expect(hayPrimarioLimpio).toBe(true);
      expect(hayAcentoLimpio).toBe(true);
    },
  );
});
