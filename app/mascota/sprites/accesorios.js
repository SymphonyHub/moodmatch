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
import {
  ACCESORIOS_BASE_EQUIPABLES, dibujarAccesorioEquipable, esAccesorioBase,
} from './accesorios/catalogoBase';

// [cabezaX, cabezaY] = dónde se apoya un sombrero; [cuerpoX, cuerpoY, r] = zona
// del cuerpo donde cae un patrón de color. Recalibradas en Fase 17: las siete
// siluetas cambiaron de tamaño y de altura de cabeza al pulirlas.
const ANCLAS = {
  polluelo: { cabeza: [50, 40], cuerpo: [50, 62, 15] },
  'nutria-lunar': { cabeza: [50, 27], cuerpo: [50, 70, 13] },
  'espiritu-calma': { cabeza: [50, 33], cuerpo: [50, 58, 12] },
  pinguino: { cabeza: [50, 26], cuerpo: [50, 63, 12] },
  perro: { cabeza: [50, 29], cuerpo: [50, 70, 12] },
  dinosaurio: { cabeza: [47, 28], cuerpo: [50, 71, 12] },
  huevo: { cabeza: [50, 25], cuerpo: [50, 58, 14] },
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
//
// Los de nivel llevan también el número, que la tienda y el vestidor muestran
// sin tener que interpretar el texto.
const nivelDe = (n) => ({ nivel: n, pista: `Nivel ${n} de cariño` });

// Los cuatro diseños del catálogo base (con sus variantes de color) se dibujan
// en accesorios/catalogoBase.js y no acá: vienen de arte importado, no de
// geometría escrita a mano. Su desbloqueo es el mismo mecanismo que el resto.
const NIVEL_BASE = {
  lazo: 4,
  'lentes-sol': 8,
  'sombrero-fiesta': 12,
  'lentes-sol-b': 18,
  'gorrito-noche': 20,
  'sombrero-fiesta-b': 26,
  'gorrito-noche-b': 30,
};

const CATALOGO_BASE = ACCESORIOS_BASE_EQUIPABLES.map(({ id, nombre, descripcion }) => ({
  id,
  categoria: 'cabeza',
  nombre,
  descripcion,
  ...nivelDe(NIVEL_BASE[id]),
}));

export const CATALOGO_ACCESORIOS = [
  { id: 'gorrito', categoria: 'cabeza', nombre: 'Gorrito', ...nivelDe(6) },
  { id: 'bufanda', categoria: 'cabeza', nombre: 'Bufanda', ...nivelDe(16) },
  { id: 'corona', categoria: 'cabeza', nombre: 'Corona', ...nivelDe(36) },
  { id: 'flor', categoria: 'cabeza', nombre: 'Flor', pista: 'Completen un reto juntos' },
  ...CATALOGO_BASE,
  { id: 'lunares', categoria: 'color', nombre: 'Lunares', ...nivelDe(10) },
  { id: 'estrellas', categoria: 'color', nombre: 'Estrellas', ...nivelDe(24) },
  { id: 'aura', categoria: 'color', nombre: 'Aura', ...nivelDe(40) },
];

// Devuelve { cabeza:[nodos], color:[nodos] } para los ids equipados (o vacíos).
// La ranura de cabeza acepta dos familias de dibujo: la geométrica de acá y la
// del catálogo base (arte importado). Se resuelve por id, así que quien equipa
// no necesita saber de dónde sale el dibujo.
export function dibujarAccesorios({
  especie, paleta, cabeza, color,
}) {
  const { cabeza: [hx, hy], cuerpo: [bx, by, br] } = anclas(especie);
  let cabezaNodos = [];
  if (esAccesorioBase(cabeza)) {
    cabezaNodos = dibujarAccesorioEquipable({ id: cabeza, especie, paleta });
  } else if (cabeza && CABEZA[cabeza]) {
    cabezaNodos = CABEZA[cabeza](hx, hy, paleta);
  }
  const colorNodos = color && COLOR[color] ? COLOR[color](bx, by, br, paleta) : [];
  return { cabeza: cabezaNodos, color: colorNodos };
}
