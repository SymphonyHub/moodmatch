// Personalidad agregada de la amistad (la calcula el backend en
// calcularPersonalidad → 'más animada' | 'más tranquila' | 'más sensible' |
// 'curiosa') mapeada a una variación sutil de la pose idle. No cambia la
// silueta: solo modula cuánto respira/se inclina el rig y cada cuánto parpadea.
// Coherente con el tono de calma de la app: nada exagerado.

const POSES = {
  'más animada': { rebote: 1.3, inclinacion: 0, parpadeoMs: 3000 },
  'más tranquila': { rebote: 0.65, inclinacion: -2, parpadeoMs: 5400 },
  'más sensible': { rebote: 0.85, inclinacion: 2, parpadeoMs: 4200 },
  curiosa: { rebote: 1, inclinacion: 1.2, parpadeoMs: 3800 },
};

export const poseDePersonalidad = (personalidad) => POSES[personalidad] ?? POSES.curiosa;
