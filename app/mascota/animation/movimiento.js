// Tokens de movimiento del RIG de mascota (MascotaAnimada). Separado de
// theme/motion.js a propósito: los loops ambientales de la criatura
// (respiración ~1.9 s, balanceo ~2.6 s) son más lentos que la regla "nada dura
// más de 400 ms" de la casa, que rige transiciones discretas de UI. Acá el
// lenguaje es el de un ser que respira, no el de un botón. Reutiliza los easings
// de reanimated (el rig corre en worklets) y hace eco de los springs blandos de
// la casa.
//
// Regla de esta fase: nada frenético. La mascota "se infla" y "se mece"; cuando
// reacciona, ANTICIPA antes de moverse y el apéndice blando ARRASTRA un instante
// después de que el cuerpo se detiene (follow-through).
import { Easing } from 'react-native-reanimated';

// Respiración: el cuerpo se infla y desinfla en loop. escala* = cuánto deforma
// (leve squash & stretch vertical, coherente con el ritmo gentil).
export const respiracion = {
  duracionMs: 1900,
  easing: Easing.inOut(Easing.quad),
  escalaX: 0.015,
  escalaY: 0.025,
};

// Balanceo ambiental: el cuerpo se mece un poco; el apéndice, más (factorApendice).
export const balanceo = {
  duracionMs: 2600,
  easing: Easing.inOut(Easing.sin),
  ampIdleDeg: 1.4,
  ampAtencionDeg: 3.4,
  factorApendice: 1.7,
};

// Parpadeo: escala Y del ojo al cerrar + tiempos de cierre/apertura. El INTERVALO
// entre parpadeos lo aporta personalidad.js (media); su variación es del paso 3.
export const parpadeo = {
  cerrado: 0.12,
  cierreMs: 80,
  aperturaMs: 120,
};

// Reacción al toque: ANTICIPA (squash breve, j<0) → sube → asienta con spring.
// escala*/alturaPx son cuánto deforma y salta el cuerpo con j (el valor animado).
export const salto = {
  anticipacionMs: 90,
  anticipacionMag: -0.4,
  subidaMs: 130,
  subidaEasing: Easing.out(Easing.quad),
  asentamiento: { damping: 10, stiffness: 220, mass: 0.7 },
  escalaX: 0.06,
  escalaY: 0.1,
  alturaPx: 9,
};

// Evolución: pop de escala al subir de etapa y asentamiento.
export const evolucion = {
  pop: { toValue: 1.18, spring: { damping: 9, stiffness: 180 } },
  settle: { toValue: 1, spring: { damping: 12, stiffness: 160 } },
};

// Follow-through del apéndice: al reaccionar el cuerpo, el apéndice blando
// (penacho/orejas/cola/voluta) barre y vuelve con un spring MÁS blando —
// arrastra y sobrepasa en vez de seguir rígido. gradosPorSalto = amplitud del
// barrido cuando el cuerpo salta.
export const followApendice = {
  spring: { damping: 7, stiffness: 90, mass: 1.1 },
  gradosPorSalto: 10,
};
