// Lenguaje de movimiento de MoodMatch: calmo y discreto.
// Regla de la casa: nada dura más de 400 ms y nada rebota fuerte — cada efecto
// debe reforzar la sensación de calma, no llamar la atención sobre sí mismo.
import { Easing } from 'react-native';

export const durations = {
  quick: 140,
  base: 240,
  gentle: 380,
};

export const easings = {
  standard: Easing.out(Easing.cubic),
  decelerate: Easing.out(Easing.quad),
  accelerate: Easing.in(Easing.quad),
};

// Springs contenidos (asentamiento suave, sin rebote fuerte):
// press = presión táctil; unlock = revelado de contenido que se desbloquea.
export const springs = {
  press: { damping: 18, stiffness: 280, mass: 0.6 },
  unlock: { damping: 16, stiffness: 200, mass: 0.9 },
};

export const PRESS_SCALE = 0.97;

// Escalonado entre ítems de una lista al entrar.
export const STAGGER_MS = 60;
