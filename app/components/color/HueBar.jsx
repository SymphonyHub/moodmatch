import ColorSlider from './ColorSlider';
import { hexToHsl, hslToHex } from '../../theme/color';
import { xAHue, hueAFraccion, xALum, lumAFraccion, LUM_MIN, LUM_MAX } from './barMath';

// Barra de matiz (Fase 10 P2): elige el hue de forma continua conservando la
// saturación y luminosidad actuales del color. `value` es hex; `onChange`
// recibe hex. El degradado muestra el espectro a S/L fijos; el pulgar lleva el
// color real. Cada instancia necesita un `id` distinto (ids de SVG únicos).
const HUE_STOPS = [0, 60, 120, 180, 240, 300, 360].map((h) => hslToHex(h, 0.7, 0.5));

let contador = 0;
const nuevoGradId = (prefijo) => {
  contador += 1;
  return `grad-${prefijo}-${contador}`;
};

export function HueBar({ value, onChange, id }) {
  const { h, s, l } = hexToHsl(value);
  const gradId = id ? `hue-${id}` : nuevoGradId('hue');
  return (
    <ColorSlider
      stops={HUE_STOPS}
      fraccion={hueAFraccion(h)}
      onFraccion={(frac) => onChange(hslToHex(xAHue(frac, 1), s, l))}
      thumbColor={value}
      gradientId={gradId}
    />
  );
}

export function LumBar({ value, onChange, id }) {
  const { h, s, l } = hexToHsl(value);
  const gradId = id ? `lum-${id}` : nuevoGradId('lum');
  // Rampa de luminosidad al hue/saturación actuales, de LUM_MIN a LUM_MAX.
  const stops = [LUM_MIN, (LUM_MIN + LUM_MAX) / 2, LUM_MAX].map((ll) => hslToHex(h, s, ll));
  return (
    <ColorSlider
      stops={stops}
      fraccion={lumAFraccion(l)}
      onFraccion={(frac) => onChange(hslToHex(h, s, xALum(frac, 1)))}
      thumbColor={value}
      gradientId={gradId}
    />
  );
}
