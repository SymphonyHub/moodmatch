// Overlays cosméticos de accesorios (Fase 14, Parte C). El backend
// (backend/lib/accesorios.js) es la autoridad del catálogo y del desbloqueo;
// aquí solo se dibuja cada id. Dos categorías: "cabeza" (encima de la criatura)
// y "color" (patrón sobre el cuerpo). Los ids deben coincidir con el backend
// (verificado por accesorios.paridad.test.js).
//
// Cada especie ancla el overlay en un punto propio (un gorro se posa distinto en
// el huevo que en el perro), así el rig y el sprite quedan agnósticos de especie.

import { elip, circ, path } from './geometria';
import { GOLD, CORAL, GLOW } from './paletas';

// [cabezaX, cabezaY] = dónde se apoya un sombrero; [cuerpoX, cuerpoY, r] = zona
// del cuerpo donde cae un patrón de color.
const ANCLAS = {
  polluelo: { cabeza: [50, 39], cuerpo: [50, 61, 15] },
  'nutria-lunar': { cabeza: [50, 26], cuerpo: [50, 66, 13] },
  'espiritu-calma': { cabeza: [50, 25], cuerpo: [50, 56, 12] },
  pinguino: { cabeza: [50, 37], cuerpo: [50, 62, 11] },
  perro: { cabeza: [50, 29], cuerpo: [50, 67, 12] },
  dinosaurio: { cabeza: [39, 33], cuerpo: [50, 64, 12] },
  huevo: { cabeza: [50, 25], cuerpo: [50, 56, 14] },
};
const anclas = (especie) => ANCLAS[especie] ?? ANCLAS.polluelo;

// ── Accesorios de cabeza ────────────────────────────────────────────────────
const CABEZA = {
  gorrito: (x, y, P) => [
    path(`M${x - 9},${y + 2} a9,9 0 0 1 18,0Z`, { fill: P.dark }),
    path(`M${x - 10},${y + 2} l20,0`, { stroke: P.dark, strokeWidth: 3, strokeLinecap: 'round' }),
    circ(x, y - 8, 2.6, P.body),
  ],
  bufanda: (x, y, P) => [
    path(`M${x - 10},${y + 7} q10,5 20,0 l0,4 q-10,5 -20,0Z`, { fill: CORAL }),
    path(`M${x + 5},${y + 10} l3,10 l-4,-1 l-1,-8Z`, { fill: CORAL }),
  ],
  corona: (x, y) => [
    path(`M${x - 9},${y + 3} l0,-8 l4,4 l5,-7 l5,7 l4,-4 l0,8Z`, { fill: GOLD }),
    circ(x, y - 6, 1.4, CORAL),
  ],
  flor: (x, y, P) => {
    const fx = x + 9;
    const fy = y + 1;
    const petalos = [0, 72, 144, 216, 288].map((a) => {
      const rad = (a * Math.PI) / 180;
      return circ(fx + Math.cos(rad) * 3, fy + Math.sin(rad) * 3, 2.2, P.bodyHi);
    });
    return [...petalos, circ(fx, fy, 2, GOLD)];
  },
};

// ── Patrones de color sobre el cuerpo ───────────────────────────────────────
const estrella = (cx, cy, r, fill) => {
  const pts = [];
  for (let i = 0; i < 10; i += 1) {
    const rad = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + Math.cos(rad) * rr).toFixed(1)},${(cy + Math.sin(rad) * rr).toFixed(1)}`);
  }
  return path(`M${pts.join(' L')}Z`, { fill });
};

const COLOR = {
  lunares: (cx, cy, r, P) => [
    circ(cx - r * 0.5, cy - r * 0.2, 2, P.dark, 0.55),
    circ(cx + r * 0.5, cy + r * 0.1, 2, P.dark, 0.55),
    circ(cx, cy + r * 0.5, 2, P.dark, 0.55),
    circ(cx - r * 0.2, cy + r * 0.9, 1.6, P.dark, 0.5),
  ],
  estrellas: (cx, cy, r) => [
    estrella(cx - r * 0.5, cy - r * 0.1, 2.6, GOLD),
    estrella(cx + r * 0.5, cy + r * 0.3, 2.2, GOLD),
    estrella(cx, cy + r * 0.8, 1.8, GOLD),
  ],
  aura: (cx, cy, r) => [
    { t: 'ellipse', cx, cy, rx: r + 6, ry: r + 8, fill: 'none', stroke: GLOW, strokeWidth: 1.6, opacity: 0.5 },
    circ(cx - r, cy - r * 0.6, 1.6, GLOW, 0.8),
    circ(cx + r, cy, 1.4, GLOW, 0.8),
  ],
};

// Metadata para el grid del slot de accesorios (nombre + pista de desbloqueo).
// Las pistas reflejan las reglas de backend/lib/accesorios.js; los ids deben
// coincidir con el catálogo del backend (verificado por la prueba de paridad).
export const CATALOGO_ACCESORIOS = [
  { id: 'gorrito', categoria: 'cabeza', nombre: 'Gorrito', pista: 'Nivel 6 de cariño' },
  { id: 'bufanda', categoria: 'cabeza', nombre: 'Bufanda', pista: 'Nivel 16 de cariño' },
  { id: 'corona', categoria: 'cabeza', nombre: 'Corona', pista: 'Nivel 36 de cariño' },
  { id: 'flor', categoria: 'cabeza', nombre: 'Flor', pista: 'Completen un reto juntos' },
  { id: 'lunares', categoria: 'color', nombre: 'Lunares', pista: 'Nivel 10 de cariño' },
  { id: 'estrellas', categoria: 'color', nombre: 'Estrellas', pista: 'Nivel 24 de cariño' },
  { id: 'aura', categoria: 'color', nombre: 'Aura', pista: 'Nivel 40 de cariño' },
];

// Devuelve { cabeza:[nodos], color:[nodos] } para los ids equipados (o vacíos).
export function dibujarAccesorios({
  especie, paleta, cabeza, color,
}) {
  const { cabeza: [hx, hy], cuerpo: [bx, by, br] } = anclas(especie);
  const cabezaNodos = cabeza && CABEZA[cabeza] ? CABEZA[cabeza](hx, hy, paleta) : [];
  const colorNodos = color && COLOR[color] ? COLOR[color](bx, by, br, paleta) : [];
  return { cabeza: cabezaNodos, color: colorNodos };
}
