import { contrastRatio, relativeLuminance, hexToRgb } from '../theme/contrast';
import { THEMES, THEME_IDS } from '../theme/themes';

const AA_TEXTO = 4.5;

describe('utilidades de contraste', () => {
  test('hexToRgb parsea formatos largos y cortos', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('2e7d32')).toEqual({ r: 46, g: 125, b: 50 });
  });

  test('negro sobre blanco es 21:1 y es simétrico', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0);
  });

  test('la luminancia relativa está normalizada', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });
});

// Cada tema debe cumplir WCAG AA (>= 4.5:1) en todos los pares texto/fondo
// que la UI realmente usa. Si un tema nuevo o un ajuste de paleta rompe un
// par, este test lo señala con el par exacto.
describe.each(THEME_IDS)('contraste WCAG AA — tema %s', (id) => {
  const c = THEMES[id].colors;

  const paresTexto = [
    ...['background', 'surface', 'surfaceElevated'].flatMap((bg) => [
      [`text/${bg}`, c.text, c[bg]],
      [`textMuted/${bg}`, c.textMuted, c[bg]],
      [`textFaint/${bg}`, c.textFaint, c[bg]],
      [`danger/${bg}`, c.danger, c[bg]],
    ]),
    ['primary/surface', c.primary, c.surface],
    ['primary/primarySoft', c.primary, c.primarySoft],
    ['onPrimary/primary', c.onPrimary, c.primary],
    ['onHeader/headerBackground', c.onHeader, c.headerBackground],
    ['danger/dangerSoft', c.danger, c.dangerSoft],
    ['tabActive/tabBarBackground', c.tabActive, c.tabBarBackground],
    ['tabInactive/tabBarBackground', c.tabInactive, c.tabBarBackground],
    ...Object.entries(c.moods).flatMap(([mood, def]) => [
      [`mood ${mood}/surface`, def.color, c.surface],
      [`mood ${mood}/soft`, def.color, def.soft],
    ]),
    ...Object.entries(c.categories).map(([cat, color]) => [
      `categoría ${cat}/surface`,
      color,
      c.surface,
    ]),
  ];

  test.each(paresTexto)('%s cumple >= 4.5:1', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXTO);
  });
});
