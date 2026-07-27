// Posiciones del catálogo visual base de Bloque 4. Cada punto vive en el mismo
// viewBox 0 0 100 100 de las siluetas y representa el centro de apoyo del
// accesorio; `scale` ajusta su geometría sin depender del renderer.
//
// Este mapa no habilita compra ni equipamiento. Los cuatro ids permanecen fuera
// del catálogo autoritativo del backend hasta que exista el contrato de moneda.
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
    lazo: { x: 62, y: 32, scale: 0.78 },
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
