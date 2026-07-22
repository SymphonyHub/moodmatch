// Catálogo cerrado de las 7 especies de mascota (Fase 14, Parte C). Cada especie
// es un builder puro que, dada la etapa (0..2) y la paleta de esa etapa, devuelve
// la silueta como grupos de nodos SVG:
//
//   { shadow, cuerpo, apendice, cara: { ojos, resto } }
//
// Convención estructural compartida por TODAS las especies, para que el rig de
// animación (MascotaAnimada) sea único y no conozca especies:
//   · shadow    → sombra de contacto (no se mueve con el salto/respiración)
//   · cuerpo    → masa principal (respira y salta como un todo)
//   · apendice  → parte secundaria "blandita" (oreja/cola/voluta/cresta) que el
//                 rig balancea con leve desfase; [] si la especie es rígida (huevo)
//   · cara.ojos → globos de los ojos (el rig los aplana al parpadear)
//   · cara.resto→ nariz/boca/cachetes
//
// Las siluetas se diferencian por FORMA, no por color: todas usan la misma
// paleta de marca (paletas.js). Se profundizan al evolucionar (0→2). El `huevo`
// es especie propia: no eclosiona, solo gana decoración.

import {
  elip, circ, path, sombra, ojoDulce, ojoSereno, sonrisa,
} from './geometria';
import { CORAL, CORAL_SOFT, GOLD, GLOW } from './paletas';

// ── Polluelo — ave redonda con cresta y pico coral ──────────────────────────
function polluelo(s, P) {
  const bodyR = [22, 21, 20][s];
  const bodyY = [60, 59, 58][s];
  const cuerpo = [];
  const wing = s === 0 ? 0.5 : 1;
  cuerpo.push(path(`M${50 - bodyR * 0.9},${bodyY} q-${9 * wing},2 -${5 * wing},10 q${4 * wing},-2 ${6 * wing},-6Z`, { fill: P.dark, opacity: 0.85 }));
  cuerpo.push(path(`M${50 + bodyR * 0.9},${bodyY} q${9 * wing},2 ${5 * wing},10 q-${4 * wing},-2 -${6 * wing},-6Z`, { fill: P.dark, opacity: 0.85 }));
  cuerpo.push(elip(50, bodyY, bodyR, bodyR * 0.98, P.body));
  cuerpo.push(elip(50 - bodyR * 0.34, bodyY - bodyR * 0.36, bodyR * 0.44, bodyR * 0.5, P.bodyHi, 0.5));
  cuerpo.push(elip(50, bodyY + bodyR * 0.28, bodyR * 0.6, bodyR * 0.62, P.belly));
  if (s === 2) cuerpo.push(path(`M${50 + bodyR * 0.6},${bodyY + bodyR * 0.5} q14,-2 16,-12 q-4,10 -12,10 q6,2 4,8Z`, { fill: P.body }));
  cuerpo.push(path(`M50,${bodyY - 1} l-4,4 l4,3.4 l4,-3.4Z`, { fill: CORAL }));
  cuerpo.push(path(`M${50 - 6},${bodyY + bodyR * 0.92} l0,4 M${50 - 8},${bodyY + bodyR * 0.92 + 4} l4,0 M${50 + 6},${bodyY + bodyR * 0.92} l0,4 M${50 + 4},${bodyY + bodyR * 0.92 + 4} l4,0`, { stroke: CORAL, strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round' }));
  if (s === 2) cuerpo.push(circ(50 + bodyR * 0.55, bodyY - bodyR * 0.5, 1.6, GOLD));

  const crestN = [1, 2, 3][s];
  const apendice = [];
  for (let i = 0; i < crestN; i += 1) {
    const dx = (i - (crestN - 1) / 2) * 6;
    const h = 8 + (crestN - Math.abs(i - (crestN - 1) / 2)) * 2;
    apendice.push(path(`M${50 + dx},${bodyY - bodyR + 2} q-2.5,-${h} 0,-${h + 2} q2.5,2 0,${h + 2}Z`,
      { fill: i === Math.floor(crestN / 2) ? P.dark : P.body }));
  }

  const ojos = [...ojoDulce(50 - bodyR * 0.34, bodyY - 4, 2.7, P.dark), ...ojoDulce(50 + bodyR * 0.34, bodyY - 4, 2.7, P.dark)];
  const resto = [
    circ(50 - bodyR * 0.62, bodyY + 1, 2.7, CORAL_SOFT, 0.7),
    circ(50 + bodyR * 0.62, bodyY + 1, 2.7, CORAL_SOFT, 0.7),
  ];
  return { shadow: [sombra(50, 90, bodyR + 1)], cuerpo, apendice, cara: { ojos, resto } };
}

// ── Nutria lunar — mamífero cabezón y cálido ────────────────────────────────
function nutria(s, P) {
  const headR = [21, 19, 18][s];
  const headY = [46, 44, 43][s];
  const bodyRx = [19, 18.5, 17][s];
  const bodyRy = [17, 18.5, 20][s];
  const bodyY = 66;
  const earR = [7.5, 7, 6.5][s];
  const cuerpo = [];
  cuerpo.push(elip(50, bodyY, bodyRx, bodyRy, P.body));
  cuerpo.push(elip(50, bodyY + 2, bodyRx * 0.62, bodyRy * 0.72, P.belly));
  for (const ex of [50 - headR * 0.72, 50 + headR * 0.72]) {
    cuerpo.push(circ(ex, headY - headR * 0.78, earR, P.body));
    cuerpo.push(circ(ex, headY - headR * 0.78, earR * 0.5, P.dark, 0.5));
  }
  cuerpo.push(circ(50, headY, headR, P.body));
  cuerpo.push(elip(50 - headR * 0.36, headY - headR * 0.34, headR * 0.42, headR * 0.42, P.bodyHi, 0.5));
  if (s >= 1) cuerpo.push(path(`M50,${headY - headR} q-4,-7 0,-10 q4,3 0,10`, { fill: P.body }));
  if (s === 2) cuerpo.push(path(`M50,${headY - headR * 0.42} a4.4,4.4 0 1 0 3.2,7.4 a3.4,3.4 0 1 1 -3.2,-7.4Z`, { fill: GOLD }));
  if (s === 2) cuerpo.push(circ(50 + headR * 0.8, headY - headR * 0.7, 1.7, '#FFFFFF', 0.9));

  const apendice = s >= 1
    ? [path(`M${50 + bodyRx * 0.9},${bodyY + 6} q12,2 10,-9 q-2,7 -10,4Z`, { fill: P.body })]
    : [];

  const ojos = [...ojoDulce(50 - headR * 0.42, headY + 1, 2.7, P.dark), ...ojoDulce(50 + headR * 0.42, headY + 1, 2.7, P.dark)];
  const resto = [
    elip(50, headY + headR * 0.5, 2.6, 1.9, P.dark),
    sonrisa(50, headY + headR * 0.72, 4, P.dark, 1.8),
    circ(50 - headR * 0.78, headY + headR * 0.42, 3, CORAL_SOFT, 0.75),
    circ(50 + headR * 0.78, headY + headR * 0.42, 3, CORAL_SOFT, 0.75),
  ];
  return { shadow: [sombra(50, 90, bodyRx + 3)], cuerpo, apendice, cara: { ojos, resto } };
}

// ── Espíritu de calma — gotita etérea que flota, sin patas ──────────────────
function espiritu(s, P) {
  const w = [15, 16.5, 17.5][s];
  const topY = [26, 22, 20][s];
  const botY = 84;
  const midY = (topY + botY) / 2;
  const cuerpo = [];
  // aura tenue (etapa 3): elipse con borde punteado, sin relleno
  if (s === 2) {
    cuerpo.push({
      t: 'ellipse', cx: 50, cy: midY, rx: w + 9, ry: w + 13,
      fill: 'none', stroke: GLOW, strokeWidth: 1.4, opacity: 0.5, strokeDasharray: '2 5',
    });
  }
  cuerpo.push(path(`M50,${topY} C${50 + w * 0.95},${topY} ${50 + w},${midY - 4} ${50 + w},${midY + 6} C${50 + w},${botY - 4} ${50 + w * 0.6},${botY} 50,${botY} C${50 - w * 0.6},${botY} ${50 - w},${botY - 4} ${50 - w},${midY + 6} C${50 - w},${midY - 4} ${50 - w * 0.95},${topY} 50,${topY}Z`, { fill: P.body }));
  cuerpo.push(elip(50 - w * 0.35, midY - 2, w * 0.4, w * 0.66, P.bodyHi, 0.55));
  if (s === 2) {
    cuerpo.push(circ(50 - w - 6, topY + 6, 2.4, GLOW, 0.85));
    cuerpo.push(circ(50 + w + 5, midY + 8, 1.8, GLOW, 0.75));
    cuerpo.push(circ(50 + w - 1, topY + 2, 1.3, '#FFFFFF', 0.8));
  }

  const apendice = s >= 1 ? [
    path(`M${50 - w},${midY} q-9,4 -6,-8 q3,6 6,8Z`, { fill: P.body, opacity: 0.85 }),
    path(`M${50 + w},${midY} q9,4 6,-8 q-3,6 -6,8Z`, { fill: P.body, opacity: 0.85 }),
  ] : [];

  const faceY = midY - 2;
  const ojos = [...ojoSereno(50 - w * 0.42, faceY, 3, P.dark), ...ojoSereno(50 + w * 0.42, faceY, 3, P.dark)];
  const resto = [
    sonrisa(50, faceY + 6, 3, P.dark, 1.6),
    circ(50 - w * 0.62, faceY + 4, 2.6, CORAL_SOFT, 0.6),
    circ(50 + w * 0.62, faceY + 4, 2.6, CORAL_SOFT, 0.6),
  ];
  return { shadow: [sombra(50, 92, w * 0.7, 0.09)], cuerpo, apendice, cara: { ojos, resto } };
}

// ── Pingüino — compacto, esmoquin y pico/patas coral ────────────────────────
function pinguino(s, P) {
  const back = s === 0 ? P.body : P.dark;
  const bodyRx = [17, 17, 16][s];
  const bodyRy = [21, 22, 23][s];
  const bodyY = 58;
  const cuerpo = [];
  cuerpo.push(path(`M${50 - 6},${bodyY + bodyRy - 2} l-5,4 m5,-4 l1,5 M${50 + 6},${bodyY + bodyRy - 2} l5,4 m-5,-4 l-1,5`, { stroke: CORAL, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' }));
  cuerpo.push(path(`M${50 - bodyRx + 1},${bodyY - 2} q-7,6 -3,15 q2,-6 4,-11Z`, { fill: back }));
  cuerpo.push(path(`M${50 + bodyRx - 1},${bodyY - 2} q7,6 3,15 q-2,-6 -4,-11Z`, { fill: back }));
  cuerpo.push(elip(50, bodyY, bodyRx, bodyRy, back));
  cuerpo.push(elip(50 - bodyRx * 0.34, bodyY - bodyRy * 0.4, bodyRx * 0.4, bodyRy * 0.4, P.bodyHi, 0.35));
  cuerpo.push(elip(50, bodyY + 3, bodyRx * 0.66, bodyRy * 0.74, P.belly));
  if (s >= 1) cuerpo.push(path(`M${50 - bodyRx},${bodyY - 6} a${bodyRx},${bodyRx} 0 0 1 ${bodyRx * 2},0 q-${bodyRx},7 -${bodyRx * 2},0Z`, { fill: back }));
  cuerpo.push(path(`M50,${bodyY - 7} l-4,3 l4,3 l4,-3Z`, { fill: CORAL }));
  if (s === 2) cuerpo.push(path(`M50,${bodyY - 3} l-4,-2 l0,4Z M50,${bodyY - 3} l4,-2 l0,4Z`, { fill: GOLD }));

  const apendice = s === 2
    ? [path(`M50,${bodyY - bodyRy + 1} q-2,-7 0,-9 q2,2 0,9Z`, { fill: P.dark })]
    : [];

  const ojos = [...ojoDulce(50 - 5, bodyY - 10, 2.5, P.dark), ...ojoDulce(50 + 5, bodyY - 10, 2.5, P.dark)];
  const resto = [
    circ(50 - 9, bodyY - 5, 2.4, CORAL_SOFT, 0.7),
    circ(50 + 9, bodyY - 5, 2.4, CORAL_SOFT, 0.7),
  ];
  return { shadow: [sombra(50, 89, bodyRx + 2)], cuerpo, apendice, cara: { ojos, resto } };
}

// ── Perro — cachorro de orejas caídas ───────────────────────────────────────
function perro(s, P) {
  const headR = [18, 17, 16][s];
  const headY = [46, 45, 44][s];
  const bodyRx = [17, 17, 16][s];
  const bodyRy = [15, 16, 17][s];
  const bodyY = 67;
  const earLen = [15, 14, 12][s];
  const tailY = [4, -2, -8][s];
  const cuerpo = [];
  cuerpo.push(elip(50, bodyY, bodyRx, bodyRy, P.body));
  cuerpo.push(elip(50, bodyY + 2, bodyRx * 0.55, bodyRy * 0.7, P.belly));
  cuerpo.push(circ(50, headY, headR, P.body));
  cuerpo.push(elip(50 - headR * 0.34, headY - headR * 0.34, headR * 0.38, headR * 0.38, P.bodyHi, 0.5));
  cuerpo.push(elip(50, headY + headR * 0.42, headR * 0.5, headR * 0.4, P.belly));
  cuerpo.push(elip(50, headY + headR * 0.2, 2.6, 2, P.dark));
  if (s === 2) {
    cuerpo.push(path(`M${50 - headR * 0.7},${headY + headR * 0.92} q${headR * 0.7},7 ${headR * 1.4},0`, { stroke: CORAL, strokeWidth: 3, fill: 'none' }));
    cuerpo.push(circ(50, headY + headR + 2, 2.4, GOLD));
  }

  const apendice = [];
  for (const sgn of [-1, 1]) {
    apendice.push(path(`M${50 + sgn * headR * 0.72},${headY - headR * 0.55} q${sgn * 9},2 ${sgn * 7},${earLen} q${-sgn * 5},2 ${-sgn * 8},-3Z`, { fill: P.dark }));
  }
  apendice.push(path(`M${50 + bodyRx * 0.8},${bodyY} q12,${tailY} 11,${tailY - 8} q-3,7 -11,${tailY === 4 ? 2 : 6}Z`, { fill: P.body }));

  const ojos = [...ojoDulce(50 - headR * 0.42, headY - headR * 0.1, 2.6, P.dark), ...ojoDulce(50 + headR * 0.42, headY - headR * 0.1, 2.6, P.dark)];
  const resto = [];
  if (s >= 1) resto.push(path(`M${50 - 2.5},${headY + headR * 0.58} q2.5,5 5,0Z`, { fill: CORAL }));
  else resto.push(sonrisa(50, headY + headR * 0.62, 3, P.dark, 1.6));
  return { shadow: [sombra(50, 89, bodyRx + 3)], cuerpo, apendice, cara: { ojos, resto } };
}

// ── Dinosaurio — regordete con placas dorsales que crecen ───────────────────
function dinosaurio(s, P) {
  const bodyRx = [17, 18, 18][s];
  const bodyRy = [15, 16, 17][s];
  const bodyY = 64;
  const headR = [11, 12, 12][s];
  const hx = 50 - bodyRx * 0.62;
  const hy = bodyY - bodyRy * 0.5;
  const cuerpo = [];
  cuerpo.push(elip(50 - 7, bodyY + bodyRy - 1, 4.5, 6, P.body));
  cuerpo.push(elip(50 + 7, bodyY + bodyRy - 1, 4.5, 6, P.body));
  cuerpo.push(elip(50, bodyY, bodyRx, bodyRy, P.body));
  cuerpo.push(elip(50 - bodyRx * 0.32, bodyY - bodyRy * 0.36, bodyRx * 0.4, bodyRy * 0.4, P.bodyHi, 0.45));
  cuerpo.push(elip(50, bodyY + 3, bodyRx * 0.55, bodyRy * 0.66, P.belly));
  cuerpo.push(circ(hx, hy, headR, P.body));
  cuerpo.push(path(`M${50 - bodyRx * 0.4},${bodyY + 2} q-4,2 -3,6`, { stroke: P.body, strokeWidth: 3.4, fill: 'none', strokeLinecap: 'round' }));
  if (s === 2) cuerpo.push(circ(50 + bodyRx * 0.3, bodyY, 1.7, GOLD));

  const plates = [3, 4, 5][s];
  const apendice = [];
  apendice.push(path(`M${50 + bodyRx * 0.7},${bodyY + 3} q16,0 22,-6 q-6,10 -20,9Z`, { fill: P.body }));
  for (let i = 0; i < plates; i += 1) {
    const t = i / (plates - 1);
    const px = 50 - bodyRx * 0.5 + t * (bodyRx * 1.3);
    const py = bodyY - bodyRy * 0.86 - Math.sin(t * Math.PI) * 3;
    const ph = 5 + Math.sin(t * Math.PI) * (s + 2);
    apendice.push(path(`M${px},${py} l-3,${ph} l6,0Z`, { fill: P.dark }));
  }

  const ojos = [...ojoDulce(hx - 1, hy - 1, 2.4, P.dark)];
  const resto = [
    sonrisa(hx, hy + headR * 0.5, 4, P.dark, 1.5),
    circ(hx - headR * 0.7, hy + headR * 0.4, 2.2, CORAL_SOFT, 0.7),
  ];
  return { shadow: [sombra(50, 89, bodyRx + 4)], cuerpo, apendice, cara: { ojos, resto } };
}

// ── Huevo — especie propia (estilo Pou): se queda huevo, gana decoración ─────
function huevo(s, P) {
  const w = 20;
  const topY = 20;
  const botY = 88;
  const midY = (topY + botY) / 2;
  const cuerpo = [];
  if (s === 2) cuerpo.push(path(`M${50 - 9},${topY + 2} l2,-8 l4,5 l3,-8 l3,8 l4,-5 l2,8Z`, { fill: GOLD }));
  cuerpo.push(path(`M50,${topY} C${50 + w * 0.9},${topY} ${50 + w},${midY - 6} ${50 + w},${midY + 8} C${50 + w},${botY - 6} ${50 + w * 0.55},${botY} 50,${botY} C${50 - w * 0.55},${botY} ${50 - w},${botY - 6} ${50 - w},${midY + 8} C${50 - w},${midY - 6} ${50 - w * 0.9},${topY} 50,${topY}Z`, { fill: P.body }));
  cuerpo.push(elip(50 - w * 0.34, midY - 8, w * 0.34, w * 0.6, P.bodyHi, 0.6));
  if (s === 1) {
    cuerpo.push(path(`M${50 - w + 2},${midY + 10} l5,-5 l5,5 l5,-5 l5,5 l5,-5 l5,5 l5,-5`, { stroke: P.dark, strokeWidth: 2.4, fill: 'none', strokeLinejoin: 'round' }));
    cuerpo.push(circ(50 - 8, midY + 20, 2, CORAL, 0.85));
    cuerpo.push(circ(50 + 9, midY + 22, 2, P.dark, 0.7));
  }
  if (s === 2) {
    cuerpo.push(path(`M${50 - w + 3},${midY + 8} q${w - 3},9 ${(w - 3) * 2},0`, { stroke: GOLD, strokeWidth: 2.4, fill: 'none' }));
    cuerpo.push(path(`M${50 - w + 3},${midY + 16} q${w - 3},7 ${(w - 3) * 2},0`, { stroke: GOLD, strokeWidth: 1.4, fill: 'none', opacity: 0.7 }));
    cuerpo.push(path(`M50,${midY + 9} l-3,4 l3,4 l3,-4Z`, { fill: CORAL }));
    cuerpo.push(circ(50 - 11, midY + 13, 2, GLOW));
    cuerpo.push(circ(50 + 11, midY + 13, 2, CORAL_SOFT));
    cuerpo.push(circ(50 + w * 0.6, topY + 12, 1.5, '#FFFFFF', 0.85));
  }

  const faceY = midY - 6;
  const ojos = [...ojoDulce(50 - 6, faceY, 2.6, P.dark), ...ojoDulce(50 + 6, faceY, 2.6, P.dark)];
  const resto = [
    sonrisa(50, faceY + 7, 4, P.dark, 1.7),
    circ(50 - 11, faceY + 4, 2.6, CORAL_SOFT, 0.7),
    circ(50 + 11, faceY + 4, 2.6, CORAL_SOFT, 0.7),
  ];
  return { shadow: [sombra(50, 91, w)], cuerpo, apendice: [], cara: { ojos, resto } };
}

const BUILDERS = {
  polluelo,
  'nutria-lunar': nutria,
  'espiritu-calma': espiritu,
  pinguino,
  perro,
  dinosaurio,
  huevo,
};

// Debe coincidir con backend/lib/especies.js (verificado por especies.test.js).
export const ESPECIES = [
  'polluelo', 'nutria-lunar', 'espiritu-calma', 'pinguino', 'perro', 'dinosaurio', 'huevo',
];
export const ESPECIE_POR_DEFECTO = 'polluelo';

// Construye la silueta de una especie en una etapa evolutiva (1|2|3).
// Tolerante: especie desconocida cae en la por defecto; etapa se clampa a 1..3.
export function dibujarEspecie(especie, etapa, paleta) {
  const builder = BUILDERS[especie] ?? BUILDERS[ESPECIE_POR_DEFECTO];
  const s = Math.max(0, Math.min(2, (Number(etapa) || 1) - 1));
  return builder(s, paleta);
}
