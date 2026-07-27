import ColorSlider from './ColorSlider';
import { hexToHsl, hslToHex } from '../../theme/color';
import {
  xAHue,
  hueAFraccion,
  xALum,
  lumAFraccion,
  LUM_MIN,
  LUM_MAX,
  BG_LUM_MIN,
  BG_LUM_MAX,
} from './barMath';

// Barra de matiz (Fase 10 P2): elige el hue de forma continua conservando la
// saturación y luminosidad actuales del color. `value` es hex; `onChange`
// recibe hex. El degradado muestra el espectro a S/L fijos; el pulgar lleva el
// color real. Cada instancia necesita un `id` distinto (ids de SVG únicos).
// `label` alimenta el accessibilityLabel del control para lectores de pantalla.
const HUE_STOPS = [0, 60, 120, 180, 240, 300, 360].map((h) => hslToHex(h, 0.7, 0.5));

let contador = 0;
const nuevoGradId = (prefijo) => {
  contador += 1;
  return `grad-${prefijo}-${contador}`;
};

export function HueBar({ value, onChange, id, label }) {
  const { h, s, l } = hexToHsl(value);
  const gradId = id ? `hue-${id}` : nuevoGradId('hue');
  return (
    <ColorSlider
      stops={HUE_STOPS}
      fraccion={hueAFraccion(h)}
      onFraccion={(frac) => onChange(hslToHex(xAHue(frac, 1), s, l))}
      thumbColor={value}
      gradientId={gradId}
      accessibilityLabel={label}
    />
  );
}

// Barra de saturación: de gris (s=0) al color pleno (s=1) al hue/luminosidad
// actuales. La usa el Fondo para que su Matiz tenga efecto (un fondo neutro
// tiene saturación ~0, y sin ella girar el matiz no cambia nada).
export function SatBar({ value, onChange, id, label }) {
  const { h, s, l } = hexToHsl(value);
  const gradId = id ? `sat-${id}` : nuevoGradId('sat');
  const stops = [0, 0.5, 1].map((ss) => hslToHex(h, ss, l));
  return (
    <ColorSlider
      stops={stops}
      fraccion={s}
      onFraccion={(frac) => onChange(hslToHex(h, frac, l))}
      thumbColor={value}
      gradientId={gradId}
      accessibilityLabel={label}
    />
  );
}

// `fondo` amplía el rango de luminosidad: los colores de marca evitan negro y
// blanco puros, pero el fondo sí necesita llegar casi a ambos extremos.
export function LumBar({ value, onChange, id, label, fondo = false }) {
  const { h, s, l } = hexToHsl(value);
  const gradId = id ? `lum-${id}` : nuevoGradId('lum');
  const min = fondo ? BG_LUM_MIN : LUM_MIN;
  const max = fondo ? BG_LUM_MAX : LUM_MAX;
  // Rampa de luminosidad al hue/saturación actuales, de min a max.
  const stops = [min, (min + max) / 2, max].map((ll) => hslToHex(h, s, ll));
  return (
    <ColorSlider
      stops={stops}
      fraccion={lumAFraccion(l, min, max)}
      onFraccion={(frac) => onChange(hslToHex(h, s, xALum(frac, 1, min, max)))}
      thumbColor={value}
      gradientId={gradId}
      accessibilityLabel={label}
    />
  );
}
