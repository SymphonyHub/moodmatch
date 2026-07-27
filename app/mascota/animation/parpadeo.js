// Ritmo del parpadeo: decide CUÁNTO espera la mascota hasta el próximo parpadeo
// y si ese parpadeo es doble. Puro y sin reanimated a propósito — es la parte del
// rig que sí se puede testear en jest (los worklets están mockeados), y deja la
// aleatoriedad afuera del componente en vez de escondida en un efecto.
//
// Reparto de responsabilidades: personalidad.js aporta la MEDIA (cada
// personalidad parpadea a su ritmo), movimiento.js aporta las magnitudes, y este
// módulo aporta la FORMA del ritmo. No inventa números propios.

import { parpadeo } from './movimiento';

// Media de 'curiosa' en personalidad.js. Solo se usa si llega una media inválida:
// un setTimeout con NaN dispara en bucle y eso sería un parpadeo epiléptico.
const MEDIA_POR_DEFECTO = 3800;

// Plan del próximo parpadeo. `azar` se inyecta para poder testear el sorteo.
export function planParpadeo(mediaMs, azar = Math.random) {
  const media = Number.isFinite(mediaMs) && mediaMs > 0 ? mediaMs : MEDIA_POR_DEFECTO;
  const u = Math.min(1, Math.max(0, azar()));
  const rango = parpadeo.jitterMax - parpadeo.jitterMin;
  const factor = parpadeo.jitterMin + rango * (u ** parpadeo.sesgo);
  return {
    esperaMs: Math.max(parpadeo.esperaMinMs, Math.round(media * factor)),
    doble: azar() < parpadeo.probDoble,
  };
}

// Pasos del parpadeo, en el orden en que los encadena withSequence.
// `a` = escala Y del ojo al terminar el paso (1 = abierto del todo).
export function pasosParpadeo(doble = false) {
  const cerrar = { a: parpadeo.cerrado, ms: parpadeo.cierreMs, curva: parpadeo.cierreEasing };
  const abrir = { a: 1, ms: parpadeo.aperturaMs, curva: parpadeo.aperturaEasing };
  if (!doble) return [cerrar, abrir];

  const breve = (ms) => Math.round(ms * parpadeo.dobleFactor);
  return [
    cerrar,
    abrir,
    // Ojo abierto un instante entre los dos golpes.
    { a: 1, ms: parpadeo.pausaDobleMs, curva: parpadeo.aperturaEasing },
    // Segundo golpe: más rápido y sin llegar a cerrar del todo.
    { a: parpadeo.dobleCerrado, ms: breve(parpadeo.cierreMs), curva: parpadeo.cierreEasing },
    { a: 1, ms: breve(parpadeo.aperturaMs), curva: parpadeo.aperturaEasing },
  ];
}
