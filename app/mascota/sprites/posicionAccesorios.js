// Posiciones del catálogo visual base. Cada punto vive en el mismo viewBox
// 0 0 100 100 de las siluetas y representa el punto de apoyo del accesorio;
// `scale` ajusta su tamaño sin depender del renderer.
//
// Qué punto es "el de apoyo" lo decide el anclaje del diseño (accesorios/
// catalogoBase.js): para los lentes es el centro de los ojos, para los gorros la
// coronilla. Los valores de abajo están medidos sobre las siluetas reales.
//
// Ojo: estos son ids de DISEÑO, no ids equipables. Las variantes de color
// comparten posición porque comparten dibujo.
export const IDS_ACCESORIOS_BASE = [
  'lentes-sol',
  'sombrero-fiesta',
  'gorrito-noche',
  'lazo',
];

export const POSICIONES_ACCESORIOS = {
  polluelo: {
    'lentes-sol': { x: 50, y: 60.5, scale: 1.05 },
    'sombrero-fiesta': { x: 50, y: 40, scale: 1.02 },
    'gorrito-noche': { x: 50, y: 40, scale: 1.02 },
    lazo: { x: 65, y: 49, scale: 0.86 },
  },
  'nutria-lunar': {
    'lentes-sol': { x: 50, y: 46, scale: 1.1 },
    'sombrero-fiesta': { x: 50, y: 27, scale: 1.05 },
    'gorrito-noche': { x: 50, y: 27, scale: 1.05 },
    lazo: { x: 67, y: 36, scale: 0.82 },
  },
  'espiritu-calma': {
    'lentes-sol': { x: 50, y: 58.5, scale: 1.1 },
    'sombrero-fiesta': { x: 50, y: 33, scale: 1.08 },
    'gorrito-noche': { x: 50, y: 33, scale: 1.08 },
    lazo: { x: 68, y: 43, scale: 0.8 },
  },
  pinguino: {
    'lentes-sol': { x: 50, y: 40, scale: 0.92 },
    'sombrero-fiesta': { x: 50, y: 26, scale: 0.92 },
    'gorrito-noche': { x: 50, y: 26, scale: 0.92 },
    // El pingüino tiene la cabeza angosta y los ojos altos (centro en y=40, con
    // el anillo llegando a y=35): el lazo del tamaño de las demás especies caía
    // encima del ojo derecho. Se sube y se achica para que apoye sobre la sien.
    lazo: { x: 57, y: 28, scale: 0.64 },
  },
  perro: {
    'lentes-sol': { x: 50, y: 46, scale: 1.08 },
    'sombrero-fiesta': { x: 50, y: 29, scale: 1.05 },
    'gorrito-noche': { x: 50, y: 29, scale: 1.05 },
    lazo: { x: 67, y: 36, scale: 0.82 },
  },
  dinosaurio: {
    'lentes-sol': { x: 47, y: 37, scale: 1.12 },
    'sombrero-fiesta': { x: 47, y: 28, scale: 1.08 },
    'gorrito-noche': { x: 47, y: 28, scale: 1.08 },
    lazo: { x: 64, y: 30, scale: 0.84 },
  },
  huevo: {
    'lentes-sol': { x: 50, y: 54, scale: 1.05 },
    'sombrero-fiesta': { x: 50, y: 27, scale: 1.05 },
    'gorrito-noche': { x: 50, y: 25, scale: 1.05 },
    lazo: { x: 67, y: 36, scale: 0.82 },
  },
};

export function posicionAccesorio(especie, id) {
  if (!IDS_ACCESORIOS_BASE.includes(id)) return null;
  return (POSICIONES_ACCESORIOS[especie] ?? POSICIONES_ACCESORIOS.polluelo)[id];
}
