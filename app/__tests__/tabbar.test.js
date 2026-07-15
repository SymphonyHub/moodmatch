// Lógica pura de la barra de tabs (components/tabBarLogic.js): resolución de
// íconos por variante de tema y geometría de la píldora indicadora.
import { indicatorLayout, resolveTabIcon } from '../components/tabBarLogic';

const ICON_SETS = {
  home: { outline: 'home-outline', filled: 'home' },
  amigos: { outline: 'people-outline', filled: 'people' },
  'mi-qr': { outline: 'qr-code-outline', filled: 'qr-code' },
  ajustes: { outline: 'settings-outline', filled: 'settings' },
};

describe('resolveTabIcon', () => {
  test.each(Object.keys(ICON_SETS))('variante outline: %s rellena solo con foco', (route) => {
    const icons = ICON_SETS[route];
    expect(resolveTabIcon(icons, 'outline', false)).toBe(icons.outline);
    expect(resolveTabIcon(icons, 'outline', true)).toBe(icons.filled);
  });

  test.each(Object.keys(ICON_SETS))('variante filled: %s siempre relleno', (route) => {
    const icons = ICON_SETS[route];
    expect(resolveTabIcon(icons, 'filled', false)).toBe(icons.filled);
    expect(resolveTabIcon(icons, 'filled', true)).toBe(icons.filled);
  });
});

describe('indicatorLayout', () => {
  test('centra la píldora dentro de cada tab', () => {
    // 360 de ancho / 4 tabs = 90 por tab; píldora 64 → margen de 13 por lado.
    expect(indicatorLayout(360, 4, 0, { pillWidth: 64 })).toEqual({ x: 13, width: 64 });
    expect(indicatorLayout(360, 4, 1, { pillWidth: 64 })).toEqual({ x: 103, width: 64 });
    expect(indicatorLayout(360, 4, 3, { pillWidth: 64 })).toEqual({ x: 283, width: 64 });
  });

  test('recorta la píldora si el tab es más angosto que ella', () => {
    // 200 / 4 = 50 por tab, menor que la píldora de 64 → ocupa el tab completo.
    expect(indicatorLayout(200, 4, 0, { pillWidth: 64 })).toEqual({ x: 0, width: 50 });
    expect(indicatorLayout(200, 4, 2, { pillWidth: 64 })).toEqual({ x: 100, width: 50 });
  });

  test('sin ancho medido o sin tabs no dibuja nada', () => {
    expect(indicatorLayout(0, 4, 0)).toEqual({ x: 0, width: 0 });
    expect(indicatorLayout(-1, 4, 0)).toEqual({ x: 0, width: 0 });
    expect(indicatorLayout(360, 0, 0)).toEqual({ x: 0, width: 0 });
  });

  test('usa 64 como ancho de píldora por defecto', () => {
    expect(indicatorLayout(400, 4, 0)).toEqual({ x: 18, width: 64 });
  });
});
