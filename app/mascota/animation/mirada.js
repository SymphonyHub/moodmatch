// Hacia dónde mira la mascota cuando la tocan. Puro y sin reanimated, como el
// ritmo del parpadeo: la cuenta se puede testear, el resorte no.
//
// El Pressable del rig mide exactamente size × size y contiene un SVG con
// viewBox 0 0 100 100, así que `locationX/locationY` (que RN entrega relativos
// al elemento tocado) se mapean directo al lienzo del sprite sin medir nada.

import { mirada } from './movimiento';

const acotar = (v) => Math.max(-1, Math.min(1, v));

// Punto tocado → cuánto se corre el ojo, en unidades del viewBox. Devuelve el
// centro ante cualquier dato raro: un NaN acá dejaría los ojos fuera de la cara.
export function desplazamientoMirada(locationX, locationY, size) {
  if (!Number.isFinite(size) || size <= 0) return { x: 0, y: 0 };
  if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) return { x: 0, y: 0 };

  return {
    x: acotar((locationX / size - 0.5) * 2) * mirada.maxPx,
    // Vertical más corto que horizontal: un ojo que sube y baja tanto como se
    // mueve a los costados se lee desorbitado, no atento.
    y: acotar((locationY / size - 0.5) * 2) * mirada.maxPy,
  };
}
