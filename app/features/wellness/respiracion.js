// Lógica pura del widget de respiración guiada de "Para mí" (Fase 10). Sin
// React ni efectos: la UI (app/wellness/WidgetInteractivo.jsx) consume estas
// fases y textos. Mismo patrón que racha.js / historial.js — lógica en
// features/, testeada aparte en app/__tests__/respiracion.test.js.
//
// El pacer usa un ciclo 4-4-4-4 (respiración "en caja"): inhalar, sostener
// lleno, exhalar, sostener vacío. Esta lentitud deliberada ES la calma que
// busca la app; la regla de theme/motion.js (nada > 400 ms) gobierna las
// microinteracciones de UI, no la guía respiratoria en sí.

import { MOOD_KEYS } from '../../theme/tokens';

// Cada fase: id estable, etiqueta visible, duración y a qué escala del círculo
// tiende (la UI mapea `escala` a un valor de Animated con useNativeDriver).
export const FASES = [
  { id: 'inhalar', label: 'Inhala', dur: 4000, escala: 'alta' },
  { id: 'sostenerLleno', label: 'Mantén', dur: 4000, escala: 'alta' },
  { id: 'exhalar', label: 'Exhala', dur: 4000, escala: 'baja' },
  { id: 'sostenerVacio', label: 'Mantén', dur: 4000, escala: 'baja' },
];

export const CICLO_MS = FASES.reduce((total, f) => total + f.dur, 0);

// Escala del círculo: contraído en reposo/vacío, expandido al inhalar/sostener
// lleno. La transición ocupa la fase entera (inhalar sube, exhalar baja).
export const ESCALA_MIN = 0.6;
export const ESCALA_MAX = 1;

// Índice de la fase activa según los ms transcurridos desde que se inició el
// ciclo. Envuelve con módulo: el pacer corre en loop mientras está activo.
export function indiceFaseEn(msTranscurridos) {
  const ms = ((msTranscurridos % CICLO_MS) + CICLO_MS) % CICLO_MS;
  let acumulado = 0;
  for (let i = 0; i < FASES.length; i++) {
    acumulado += FASES[i].dur;
    if (ms < acumulado) return i;
  }
  return FASES.length - 1;
}

// Fase activa (objeto de FASES) en un instante del ciclo.
export function faseEn(msTranscurridos) {
  return FASES[indiceFaseEn(msTranscurridos)];
}

// Línea de entrada que conecta el ánimo del último registro con la invitación a
// respirar. Tono no negociable (mismas reglas del chat): valida primero, invita
// sin ordenar, nunca minimiza ni fuerza positividad en emociones difíciles.
// Prohibido "cálmate/relájate". Sin tildes problemáticas de fondo — el tono se
// verifica mecánicamente en respiracion.test.js contra tono.js.
export const INTRO_POR_MOOD = {
  FELIZ: 'Para acompañar ese buen momento, quédate un rato con tu respiración.',
  TRISTE: 'No hay nada que apurar. Si quieres, acompaña este rato respirando a tu ritmo.',
  ANSIOSO: 'Cuando la mente va rápido, el aire puede marcar un ritmo más lento. Pruébalo si te hace bien.',
  CALMADO: 'Ya estás en un buen espacio; respirar un poco puede ayudarte a sostenerlo.',
  ENOJADO: 'Esa energía es válida. Darle unos ciclos de aire puede darte algo de espacio.',
  NEUTRO: 'Un momento para ti: sigue el círculo y deja que el aire marque el ritmo.',
};

const INTRO_FALLBACK =
  'Un momento para ti: sigue el círculo y deja que el aire marque el ritmo.';

// Intro del mood dado; fallback neutro si el mood es desconocido o no vino (el
// contrato del slot dice que moodType puede ignorarse / faltar).
export function introDe(moodType) {
  return INTRO_POR_MOOD[moodType] ?? INTRO_FALLBACK;
}

export { MOOD_KEYS };
