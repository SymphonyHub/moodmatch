// Conversión HSL↔hex para el selector de matiz continuo (Fase 10 P2). El resto
// del sistema de tema trabaja en hex (contrast.js, customTheme.js): estos
// helpers son solo la capa de entrada del HueBar/LumBar — se elige hue y
// luminosidad de forma continua y se guarda el hex resultante, así el shape
// persistido y makeCustomTheme no cambian. Reusa hexToRgb de contrast.js.
import { hexToRgb } from './contrast';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const clamp255 = (n) => Math.max(0, Math.min(255, Math.round(n)));
const toHex2 = (n) => clamp255(n).toString(16).padStart(2, '0');

// h en [0,360), s y l en [0,1]. Devuelve '#rrggbb'.
export function hslToHex(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 1);
  const lum = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * lum - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lum - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return `#${toHex2((r + m) * 255)}${toHex2((g + m) * 255)}${toHex2((b + m) * 255)}`;
}

// '#rrggbb' → { h: [0,360), s: [0,1], l: [0,1] }. Gris → h=0, s=0.
export function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}
