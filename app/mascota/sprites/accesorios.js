// Overlays cosméticos de accesorios (Fase 14, Parte C). El backend
// (backend/lib/accesorios.js) es la autoridad del catálogo y del desbloqueo;
// aquí solo se dibuja cada id. Dos categorías: "cabeza" (encima de la criatura)
// y "color" (patrón sobre el cuerpo). Los ids deben coincidir con el backend
// (verificado por accesorios.paridad.test.js).
//
// Cada especie ancla el overlay en un punto propio (un gorro se posa distinto en
// el huevo que en el perro), así el rig y el sprite quedan agnósticos de especie.

import {
  elip, circ, con, contornoFino, path,
} from './geometria';
import {
  GOLD, CORAL, CORAL_SOFT, GLOW,
} from './paletas';
import {
  ACCESORIOS_BASE_EQUIPABLES, dibujarAccesorioEquipable, esAccesorioBase,
} from './accesorios/catalogoBase';

// Tres puntos de apoyo por especie, en el lienzo 0 0 100 100:
//   cabeza → la CORONILLA, donde se posa un sombrero (recalibrada en Fase 17,
//            cuando las siete siluetas cambiaron de alto al pulirlas)
//   cuello → la línea donde la cabeza se junta con el cuerpo, por debajo de la
//            boca o del pico. En las especies sin cuello real (polluelo, huevo,
//            espíritu) es la altura donde una bufanda se lee ceñida y no como un
//            cinturón: bajo la carita, sobre la panza
//   cuerpo → [x, y, radio] de la zona donde cae un patrón de color
//
// Que `cabeza` y `cuello` sean puntos distintos es justamente lo que faltaba: la
// bufanda se dibujaba desde la coronilla con un desfase de Fase 14 y terminaba
// cruzada sobre los ojos en las siete especies.
export const ANCLAS = {
  polluelo: { cabeza: [50, 40], cuello: [50, 74], cuerpo: [50, 62, 15] },
  'nutria-lunar': { cabeza: [50, 27], cuello: [50, 63], cuerpo: [50, 70, 13] },
  'espiritu-calma': { cabeza: [50, 33], cuello: [50, 69], cuerpo: [50, 58, 12] },
  pinguino: { cabeza: [50, 26], cuello: [50, 56], cuerpo: [50, 63, 12] },
  perro: { cabeza: [50, 29], cuello: [50, 63], cuerpo: [50, 70, 12] },
  dinosaurio: { cabeza: [47, 28], cuello: [48, 64], cuerpo: [50, 71, 12] },
  huevo: { cabeza: [50, 25], cuello: [50, 69], cuerpo: [50, 58, 14] },
};
const anclas = (especie) => ANCLAS[especie] ?? ANCLAS.polluelo;

// Qué punto usa cada pieza de la ranura de cabeza. Casi todas se apoyan en la
// coronilla; la bufanda es la excepción y por eso se declara, en vez de quedar
// implícita en su geometría.
const APOYO = { bufanda: 'cuello' };

// ── Accesorios de cabeza ────────────────────────────────────────────────────
const CABEZA = {
  gorrito: (x, y, P) => [
    path(`M${x - 9},${y + 2} a9,9 0 0 1 18,0Z`, { fill: P.dark }),
    path(`M${x - 10},${y + 2} l20,0`, { stroke: P.dark, strokeWidth: 3, strokeLinecap: 'round' }),
    circ(x, y - 8, 2.6, P.body),
  ],
  // Se ciñe SOBRE el punto de apoyo, no por debajo: la vuelta va de y-3 a y+3 y
  // solo cuelga la punta. Dibujada desde la coronilla —como estaba— tapaba la
  // cara entera.
  bufanda: (x, y, P) => [
    con(path(`M${x - 11},${y - 3} q11,6 22,0 l0,6 q-11,6 -22,0Z`, { fill: CORAL }), contornoFino(P)),
    con(path(`M${x + 4},${y + 2} q4,1 5.4,-1 l3.4,11 q-3.6,2.4 -6.4,0.6Z`, { fill: CORAL }), contornoFino(P)),
    path(`M${x - 7},${y - 1.4} q7,4 14,0`, {
      stroke: CORAL_SOFT, strokeWidth: 1.4, fill: 'none', strokeLinecap: 'round', opacity: 0.9,
    }),
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
  id, categoria: 'cabeza', nombre, descripcion, ...nivelDe(NIVEL_BASE[id]),
}));

// `zona` es DÓNDE cae la pieza en la silueta, que no es lo mismo que la ranura
// que ocupa: la bufanda se equipa en la ranura de cabeza y se dibuja en el
// cuello. El vestidor la usa para encuadrar la vista previa — en un recorte de
// cabeza, una bufanda no se ve. Se deriva de APOYO para que no haya dos listas
// que mantener en acuerdo.
const conZona = (a) => ({
  ...a,
  zona: a.categoria === 'color' ? 'cuerpo' : (APOYO[a.id] ?? 'cabeza'),
});

export const CATALOGO_ACCESORIOS = [
  { id: 'gorrito', categoria: 'cabeza', nombre: 'Gorrito', ...nivelDe(6) },
  { id: 'bufanda', categoria: 'cabeza', nombre: 'Bufanda', ...nivelDe(16) },
  { id: 'corona', categoria: 'cabeza', nombre: 'Corona', ...nivelDe(36) },
  { id: 'flor', categoria: 'cabeza', nombre: 'Flor', pista: 'Completen un reto juntos' },
  ...CATALOGO_BASE,
  { id: 'lunares', categoria: 'color', nombre: 'Lunares', ...nivelDe(10) },
  { id: 'estrellas', categoria: 'color', nombre: 'Estrellas', ...nivelDe(24) },
  { id: 'aura', categoria: 'color', nombre: 'Aura', ...nivelDe(40) },
].map(conZona);

// Devuelve { cabeza:[nodos], color:[nodos] } para los ids equipados (o vacíos).
// La ranura de cabeza acepta dos familias de dibujo: la geométrica de acá y la
// del catálogo base. Se resuelve por id, así que quien equipa no necesita saber
// de dónde sale el dibujo.
export function dibujarAccesorios({
  especie, paleta, cabeza, color,
}) {
  const puntos = anclas(especie);
  const { cuerpo: [bx, by, br] } = puntos;
  let cabezaNodos = [];
  if (esAccesorioBase(cabeza)) {
    cabezaNodos = dibujarAccesorioEquipable({ id: cabeza, especie, paleta });
  } else if (cabeza && CABEZA[cabeza]) {
    const [ax, ay] = puntos[APOYO[cabeza] ?? 'cabeza'];
    cabezaNodos = CABEZA[cabeza](ax, ay, paleta);
  }
  const colorNodos = color && COLOR[color] ? COLOR[color](bx, by, br, paleta) : [];
  return { cabeza: cabezaNodos, color: colorNodos };
}
