import { hexToHsl, hslToHex } from '../theme/color';
import {
  xAFraccion,
  xAHue,
  hueAFraccion,
  xALum,
  lumAFraccion,
  LUM_MIN,
  LUM_MAX,
} from '../components/color/barMath';

const HEX = /^#[0-9a-f]{6}$/i;

describe('hslToHex', () => {
  test('primarios conocidos', () => {
    expect(hslToHex(0, 1, 0.5)).toBe('#ff0000');
    expect(hslToHex(120, 1, 0.5)).toBe('#00ff00');
    expect(hslToHex(240, 1, 0.5)).toBe('#0000ff');
  });

  test('gris al saturar en 0; negro y blanco en los extremos de luz', () => {
    expect(hslToHex(200, 0, 0.5)).toBe('#808080');
    expect(hslToHex(200, 0.8, 0)).toBe('#000000');
    expect(hslToHex(200, 0.8, 1)).toBe('#ffffff');
  });

  test('envuelve el hue y clampa s/l fuera de rango', () => {
    expect(hslToHex(360, 1, 0.5)).toBe(hslToHex(0, 1, 0.5));
    expect(hslToHex(0, 2, 0.5)).toBe(hslToHex(0, 1, 0.5));
    expect(hslToHex(0, 1, -1)).toBe('#000000');
  });
});

describe('hexToHsl', () => {
  test('primarios y grises', () => {
    expect(hexToHsl('#ff0000')).toMatchObject({ h: 0, s: 1, l: 0.5 });
    expect(hexToHsl('#808080')).toMatchObject({ s: 0 });
    const negro = hexToHsl('#000000');
    expect(negro.l).toBe(0);
  });

  test('ida y vuelta preserva el color (redondeo estable)', () => {
    ['#4a5fc1', '#b34c30', '#f0977a', '#12141c', '#93a3f0'].forEach((hex) => {
      const { h, s, l } = hexToHsl(hex);
      expect(hslToHex(h, s, l)).toBe(hex);
    });
  });

  test('siempre produce hex válido', () => {
    for (let h = 0; h < 360; h += 37) {
      expect(hslToHex(h, 0.6, 0.5)).toMatch(HEX);
    }
  });
});

describe('barMath', () => {
  test('xAFraccion clampa a [0,1] y evita dividir por ancho 0', () => {
    expect(xAFraccion(50, 100)).toBe(0.5);
    expect(xAFraccion(-10, 100)).toBe(0);
    expect(xAFraccion(200, 100)).toBe(1);
    expect(xAFraccion(50, 0)).toBe(0);
  });

  test('xAHue mapea el ancho a 0..360 y hueAFraccion es su inversa', () => {
    expect(xAHue(0, 100)).toBe(0);
    expect(xAHue(100, 100)).toBe(360);
    expect(xAHue(50, 100)).toBe(180);
    expect(hueAFraccion(180)).toBeCloseTo(0.5, 5);
    expect(hueAFraccion(360)).toBe(0);
  });

  test('xALum se mueve dentro de [LUM_MIN, LUM_MAX] y lumAFraccion invierte', () => {
    expect(xALum(0, 100)).toBeCloseTo(LUM_MIN, 5);
    expect(xALum(100, 100)).toBeCloseTo(LUM_MAX, 5);
    expect(lumAFraccion(LUM_MIN)).toBe(0);
    expect(lumAFraccion(LUM_MAX)).toBe(1);
  });
});
