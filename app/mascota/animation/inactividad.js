// Qué hace la mascota cuando hace rato que nadie la toca, y cada cuánto.
// Puro y sin reanimated, como el ritmo del parpadeo y la dirección de la mirada.
//
// La regla de tono está en el crecimiento de la espera: el primer gesto llega
// pronto, el siguiente tarda más, y así hasta un techo. Una mascota que hace lo
// mismo cada quince segundos deja de leerse viva y pasa a leerse como un
// reclamo, que es justo lo que esta app no hace.

import { inactividad } from './movimiento';

// Los tres son gestos tranquilos. Nada de saltar ni agitarse para que la miren.
export const GESTOS = ['estirarse', 'bostezar', 'vistazo'];

// vuelta 0 es el primer gesto desde el último toque; de ahí en más va creciendo.
export function planInactividad(vuelta = 0, azar = Math.random) {
  const n = Number.isFinite(vuelta) && vuelta > 0 ? Math.floor(vuelta) : 0;
  const base = Math.min(
    inactividad.maxMs,
    inactividad.primeraMs * inactividad.crecimiento ** n,
  );
  // Un poco de variación para que no caiga siempre en el mismo segundo.
  const u = Math.min(1, Math.max(0, azar()));
  const factor = 1 + (u * 2 - 1) * inactividad.jitter;

  return {
    esperaMs: Math.round(base * factor),
    gesto: GESTOS[Math.min(GESTOS.length - 1, Math.floor(azar() * GESTOS.length))],
  };
}
