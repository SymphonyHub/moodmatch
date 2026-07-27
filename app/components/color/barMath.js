// Matemática pura de los deslizadores de color (Fase 10 P2). Sin React ni RN:
// testeable directo. Mapea la posición x del gesto a hue/luminosidad y de
// vuelta, con clamp a los extremos de la barra.

// La luminosidad útil para colores de marca evita el negro y el blanco puros
// (inservibles como primario/acento): se limita a [LUM_MIN, LUM_MAX].
export const LUM_MIN = 0.2;
export const LUM_MAX = 0.9;

// El fondo sí necesita acercarse al negro y al blanco: usa su propio rango,
// más amplio, con los mismos xALum/lumAFraccion pasando estos límites.
export const BG_LUM_MIN = 0.04;
export const BG_LUM_MAX = 0.98;

// x dentro de [0, ancho] → fracción [0, 1] (clamp fuera de rango).
export function xAFraccion(x, ancho) {
  if (!(ancho > 0)) return 0;
  return Math.max(0, Math.min(1, x / ancho));
}

export const xAHue = (x, ancho) => xAFraccion(x, ancho) * 360;
export const hueAFraccion = (hue) => (((hue % 360) + 360) % 360) / 360;

export const xALum = (x, ancho, min = LUM_MIN, max = LUM_MAX) =>
  min + xAFraccion(x, ancho) * (max - min);
export const lumAFraccion = (lum, min = LUM_MIN, max = LUM_MAX) =>
  Math.max(0, Math.min(1, (lum - min) / (max - min)));
