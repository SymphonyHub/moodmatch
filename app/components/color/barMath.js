// Matemática pura de los deslizadores de color (Fase 10 P2). Sin React ni RN:
// testeable directo. Mapea la posición x del gesto a hue/luminosidad y de
// vuelta, con clamp a los extremos de la barra.

// La luminosidad útil para colores de marca evita el negro y el blanco puros
// (inservibles como primario/acento): se limita a [LUM_MIN, LUM_MAX].
export const LUM_MIN = 0.2;
export const LUM_MAX = 0.9;

// x dentro de [0, ancho] → fracción [0, 1] (clamp fuera de rango).
export function xAFraccion(x, ancho) {
  if (!(ancho > 0)) return 0;
  return Math.max(0, Math.min(1, x / ancho));
}

export const xAHue = (x, ancho) => xAFraccion(x, ancho) * 360;
export const hueAFraccion = (hue) => (((hue % 360) + 360) % 360) / 360;

export const xALum = (x, ancho) => LUM_MIN + xAFraccion(x, ancho) * (LUM_MAX - LUM_MIN);
export const lumAFraccion = (lum) =>
  Math.max(0, Math.min(1, (lum - LUM_MIN) / (LUM_MAX - LUM_MIN)));
