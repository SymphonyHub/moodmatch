// Catálogo cerrado de las 7 especies de mascota. Cada especie es un builder puro
// que, dada la etapa (0..2), la paleta de esa etapa y el id de su gradiente,
// devuelve la silueta como grupos de nodos SVG:
//
//   { shadow, cuerpo, apendice, cara: { ojos, resto } }
//
// Convención estructural compartida por TODAS las especies, para que el rig de
// animación (MascotaAnimada) sea único y no conozca especies:
//   · shadow    → sombra de contacto (no se mueve con el salto/respiración)
//   · cuerpo    → masa principal (respira y salta como un todo)
//   · apendice  → parte secundaria "blandita" (cresta/cola/oreja/voluta) que el
//                 rig balancea con leve desfase; se dibuja DETRÁS del cuerpo;
//                 [] si la especie es rígida (huevo)
//   · cara.ojos → globos de los ojos (el rig los aplana al parpadear)
//   · cara.resto→ rubor, nariz, boca y marcas que no parpadean
//
// Las siluetas se diferencian por FORMA, no por color: todas usan la misma
// paleta (paletas.js) y las mismas reglas de familia (geometria.js). Se
// profundizan al evolucionar (0→2). El `huevo` es especie propia: no eclosiona,
// solo gana decoración.
//
// Fase 17, Bloque 1: pulido visual cerrado tras cinco checkpoints con el usuario.
// Cada especie lleva rasgos que la hacen reconocible por sí sola (el criterio es
// "que se lea ese animal", no "criatura pastel redonda"); están anotados en el
// comentario de cada builder. Dos excepciones deliberadas a las reglas comunes:
//   · el dinosaurio usa ojo achatado, ceja y separación propia — sin eso no hay
//     carácter de terópodo, y era o eso o dejarlo genérico;
//   · el espíritu y el huevo no se miden por parecido a una especie real, porque
//     uno no es un animal y el otro es un objeto: su identidad es la silueta.

import {
  elip, circ, path, con, ruta, sombra, brillo, masa, pieza, relleno, gradiente,
  contorno, contornoFino, trazo, ojo, ojos, rubor, sonrisa, aleta, separacion,
} from './geometria';
import { CORAL, GOLD, GLOW } from './paletas';

// Ensanche global sobre los radios horizontales, fijado en el checkpoint 3.
const ANCHO = 1.08;

// ── Polluelo — pico coral ancho, cresta de plumas y patas de tres dedos ─────
function polluelo(s, P, gid) {
  const R = [24, 24.5, 25][s];
  const RX = R * ANCHO;
  const cy = 60;
  const cuerpo = [];
  for (const g of [-1, 1]) {
    const fx = 50 + g * 9.5;
    cuerpo.push(path(ruta`M${fx - 5.6},85.4 q0,-3.4 5.6,-3.4 q5.6,0 5.6,3.4 q0,2.8 -5.6,2.8 q-5.6,0 -5.6,-2.8Z`,
      { fill: CORAL, ...contornoFino(P) }));
  }
  cuerpo.push(path(ruta`M${50 - RX + 4},57 q-10,3 -8,13 q1.5,4 6,1 q-1,-7 2,-12Z`, { fill: P.edge, ...contornoFino(P) }));
  cuerpo.push(path(ruta`M${50 + RX - 4},57 q10,3 8,13 q-1.5,4 -6,1 q1,-7 -2,-12Z`, { fill: P.edge, ...contornoFino(P) }));
  cuerpo.push(masa(50, cy, RX, R * 0.97, gid, P));
  cuerpo.push(elip(50, cy + R * 0.3, RX * 0.6, R * 0.56, P.belly, 0.7));
  cuerpo.push(brillo(50 - RX * 0.4, cy - R * 0.46, 6.6, 4.5));
  if (s === 2) {
    cuerpo.push(path(ruta`M${50 + RX * 0.5},${cy - R * 0.58} l1.1,2.6 l2.6,1.1 l-2.6,1.1 l-1.1,2.6 l-1.1,-2.6 l-2.6,-1.1 l2.6,-1.1Z`,
      { fill: GOLD }));
  }
  cuerpo.push(path(ruta`M${50 - 4.6},68 q4.6,-2.8 9.2,0 q-4.6,5.6 -9.2,0Z`, { fill: CORAL, ...contornoFino(P) }));

  const plumas = [2, 3, 3][s];
  const apendice = [];
  for (let i = 0; i < plumas; i += 1) {
    const dx = (i - (plumas - 1) / 2) * 6.6;
    const h = 8 + s * 1.6 + (plumas === 3 && i === 1 ? 3.2 : 0);
    apendice.push(path(ruta`M${50 + dx},${cy - R * 0.97 + 3} c-4.2,-2 -4.6,-${h + 3} 0,-${h} c4.6,-${h + 3} 4.2,2 0,${h + 3}Z`,
      { fill: P.edge, ...contornoFino(P) }));
  }

  return {
    shadow: [sombra(50, 90.5, RX * 0.9)],
    cuerpo,
    apendice,
    cara: { ojos: ojos(50, 60.5, P, RX), resto: rubor(50, 68, RX * 0.6) },
  };
}

// ── Nutria lunar — bigotes, hocico plano con labio en "M" y cola de timón ────
function nutria(s, P, gid) {
  const hR = [21, 20.5, 20][s];
  const hRX = hR * 1.06;
  const hY = [47, 46, 45][s];
  const bRx = [20, 20, 19.5][s] * ANCHO;
  const bRy = [16, 17, 18][s];
  const bY = 70;
  const oR = [6.2, 5.9, 5.6][s];
  const mcy = hY + hR * 0.46;
  const mrx = hRX * 0.62;
  const ny = hY + hR * 0.33;
  const my = ny + 4.2;

  const cuerpo = [];
  cuerpo.push(pieza(50 - 8.5, 84.5, 5.4, 3.4, P.edge, P));
  cuerpo.push(pieza(50 + 8.5, 84.5, 5.4, 3.4, P.edge, P));
  cuerpo.push(masa(50, bY, bRx, bRy, gid, P));
  cuerpo.push(elip(50, bY + 2, bRx * 0.58, bRy * 0.66, P.belly, 0.75));
  // orejas chicas y bajas, contra el costado de la cabeza
  for (const g of [-1, 1]) {
    cuerpo.push(con(circ(50 + g * hRX * 0.78, hY - hR * 0.5, oR, P.edge), contornoFino(P)));
    cuerpo.push(circ(50 + g * hRX * 0.78, hY - hR * 0.5, oR * 0.5, P.deep, 0.5));
  }
  cuerpo.push(masa(50, hY, hRX, hR, gid, P));
  cuerpo.push(brillo(50 - hRX * 0.4, hY - hR * 0.42));
  // creciente lunar: tenue ya en la etapa 1, dorado recién al evolucionar
  cuerpo.push(path(ruta`M48,${hY - hR * 0.56} a4.6,4.6 0 1 0 3.4,7.8 a3.5,3.5 0 1 1 -3.4,-7.8Z`,
    s === 2 ? { fill: GOLD } : { fill: P.deep, opacity: 0.42 }));
  cuerpo.push(elip(50, mcy, mrx, hR * 0.28, P.belly, 0.9));

  const tx = 50 + bRx * 0.7;
  const ty = bY + 2;
  const tl = [1, 1.06, 1.12][s];
  const apendice = [path(
    ruta`M${tx},${ty - 6} C${tx + 10 * tl},${ty - 8} ${tx + 18 * tl},${ty - 7} ${tx + 21 * tl},${ty - 3.5} C${tx + 23 * tl},${ty - 0.5} ${tx + 22 * tl},${ty + 3} ${tx + 19 * tl},${ty + 4} C${tx + 13 * tl},${ty + 6} ${tx + 6 * tl},${ty + 7} ${tx},${ty + 6}Z`,
    { fill: P.edge, ...contornoFino(P) },
  )];

  const resto = [
    ...rubor(50, hY + hR * 0.4, hRX * 0.64),
    elip(50, ny, 3.4, 2.4, P.ink),
    path(ruta`M50,${ny + 2.1} L50,${my} M50,${my} q-3.6,4 -7.2,0.6 M50,${my} q3.6,4 7.2,0.6`,
      { stroke: P.ink, strokeWidth: 1.9, fill: 'none', strokeLinecap: 'round' }),
  ];
  // bigotes: cruzan la silueta a propósito, es lo que los hace leerse
  for (const g of [-1, 1]) {
    const ox = 50 + g * mrx * 0.72;
    [[-2.4, -3], [0, -0.4], [2.4, 2.6]].forEach(([alto, caida]) => {
      const oy = mcy + alto;
      resto.push(path(ruta`M${ox},${oy} Q${ox + g * 8},${oy + caida * 0.35} ${ox + g * 15},${oy + caida}`, trazo(P, 1.2)));
    });
  }

  return {
    shadow: [sombra(50, 90.5, bRx * 0.95)],
    cuerpo,
    apendice,
    cara: { ojos: ojos(50, hY + 1, P, hR), resto },
  };
}

// ── Espíritu de calma — ruedo ondulado, volutas y flota; no es un animal ─────
function espiritu(s, P, gid) {
  const w = [20, 21, 22][s] * ANCHO;
  const top = [32, 30, 29][s];
  const bot = 80;
  const mid = (top + bot) / 2;
  const lobulo = (w * 2) / 3;
  const fy = 58.5;

  const cuerpo = [];
  if (s === 2) {
    cuerpo.push({
      t: 'ellipse', cx: 50, cy: mid, rx: w + 8, ry: w + 11,
      fill: 'none', stroke: GLOW, strokeWidth: 1.4, opacity: 0.5, strokeDasharray: '2 5',
    });
  }
  cuerpo.push(path(
    ruta`M50,${top} C${50 + w * 0.92},${top} ${50 + w},${top + 13} ${50 + w},${top + 25} L${50 + w},72 c-1.4,9 -${lobulo - 2},9 -${lobulo},0 c-1.4,9 -${lobulo - 2},9 -${lobulo},0 c-1.4,9 -${lobulo - 2},9 -${lobulo},0 L${50 - w},${top + 25} C${50 - w},${top + 13} ${50 - w * 0.92},${top} 50,${top}Z`,
    { fill: relleno(gid), ...contorno(P) },
  ));
  cuerpo.push(brillo(50 - w * 0.38, top + 11, 6.6, 4.6));
  if (s === 2) {
    cuerpo.push(circ(50 - w - 6, top + 5, 2.4, GLOW, 0.85));
    cuerpo.push(circ(50 + w + 5, mid + 6, 1.8, GLOW, 0.75));
  }

  const apendice = s >= 1 ? [
    path(ruta`M${50 - w + 2},56 q-10,1 -8.6,-8 q4,7 8.6,8Z`, { fill: P.edge, opacity: 0.9, ...contornoFino(P) }),
    path(ruta`M${50 + w - 2},56 q10,1 8.6,-8 q-4,7 -8.6,8Z`, { fill: P.edge, opacity: 0.9, ...contornoFino(P) }),
  ] : [];

  return {
    shadow: [sombra(50, 92.5, w * 0.52, 0.1)],
    cuerpo,
    apendice,
    // ojos-punto con brillo, no arcos: la consistencia con las 7 pesó más que
    // la excepción (decisión del usuario en el checkpoint 1).
    cara: {
      ojos: ojos(50, fy, P, w, 0.88),
      resto: [
        ...rubor(50, fy + 5.5, 14, 4.6, 3),
        path(ruta`M${50 - 3.2},${fy + 7} q3.2,3.4 6.4,0`,
          { stroke: P.ink, strokeWidth: 1.9, fill: 'none', strokeLinecap: 'round' }),
      ],
    },
  };
}

// ── Pingüino — cuerpo de bolo, antifaz, penacho y barbijo ───────────────────
function pinguino(s, P, gid) {
  const top = 24;
  const bot = 80;
  const wH = [12.5, 12.5, 12][s];
  const wB = [19.5, 20, 20.5][s];

  const cuerpo = [];
  for (const g of [-1, 1]) {
    // patas abiertas hacia afuera
    cuerpo.push(path(
      ruta`M${50 + g * 4},${bot - 4} C${50 + g * 4},${bot + 3} ${50 + g * 12},${bot + 5} ${50 + g * 17},${bot + 6.4} C${50 + g * 19},${bot + 8} ${50 + g * 16},${bot + 9} ${50 + g * 11},${bot + 8.6} C${50 + g * 6},${bot + 8} ${50 + g * 2},${bot + 4} ${50 + g * 4},${bot - 4}Z`,
      { fill: CORAL, ...contornoFino(P) },
    ));
    cuerpo.push(path(ruta`M${50 + g * 10.5},${bot + 5.6} l${g * 0.6},2.6 M${50 + g * 14},${bot + 6.2} l${g * 0.4},2.4`, trazo(P, 1.2)));
    // aletas planas, caídas hacia atrás
    cuerpo.push(path(
      ruta`M${50 + g * (wH + 2.5)},45 C${50 + g * (wB + 3.5)},50 ${50 + g * (wB + 3.5)},60 ${50 + g * (wB - 1)},66 C${50 + g * (wB - 4)},62 ${50 + g * (wB - 6)},52 ${50 + g * (wH + 1)},47Z`,
      { fill: P.edge, ...contornoFino(P) },
    ));
  }
  cuerpo.push(path(
    ruta`M50,${top} C${50 + wH * 0.86},${top} ${50 + wH},${top + 7} ${50 + wH * 1.04},${top + 14} C${50 + wB * 0.82},${top + 24} ${50 + wB},${top + 30} ${50 + wB},${top + 38} C${50 + wB},${bot - 4} ${50 + wB * 0.66},${bot} 50,${bot} C${50 - wB * 0.66},${bot} ${50 - wB},${bot - 4} ${50 - wB},${top + 38} C${50 - wB},${top + 30} ${50 - wB * 0.82},${top + 24} ${50 - wH * 1.04},${top + 14} C${50 - wH},${top + 7} ${50 - wH * 0.86},${top} 50,${top}Z`,
    { fill: relleno(gid), ...contorno(P) },
  ));
  cuerpo.push(elip(50, 58, wB * 0.72, 19, P.belly, 0.85));
  cuerpo.push(brillo(50 - wH * 0.5, top + 9, 5.8, 4.2));
  cuerpo.push(path(ruta`M${50 - 12},53 Q50,59 ${50 + 12},53`,
    { stroke: P.deep, strokeWidth: 2, fill: 'none', opacity: 0.8, strokeLinecap: 'round' }));

  // Penacho: detrás del cuerpo, así solo asoman las puntas. Cada pluma sube y
  // barre hacia atrás y abajo, y las tres abren en abanico con largos y alturas
  // distintos — rectas y paralelas se leían como antenas de insecto.
  // [x0, y0, control1, control2, punta], con x reflejado por lado.
  const PLUMAS = [
    [6, 33, 13, 27, 20, 25, 25, 25.5],
    [7, 35.4, 15, 31, 22.5, 30, 28, 31.5],
    [7.5, 37.6, 15, 35.4, 22, 36.4, 26.5, 39.5],
  ];
  const largo = [1, 1.05, 1.1][s];
  const apendice = [];
  for (const g of [-1, 1]) {
    for (const [x0, y0, c1x, c1y, c2x, c2y, x1, y1] of PLUMAS) {
      apendice.push(path(
        ruta`M${50 + g * x0},${y0} C${50 + g * c1x * largo},${c1y} ${50 + g * c2x * largo},${c2y} ${50 + g * x1 * largo},${y1}`,
        { stroke: s === 2 ? GOLD : P.deep, strokeWidth: 2.4, fill: 'none', strokeLinecap: 'round' },
      ));
    }
  }

  const d = separacion(wH);
  const anillo = {
    fill: 'none', stroke: P.deep, strokeWidth: 2, opacity: 0.72, strokeLinecap: 'round',
  };
  const resto = [
    ...rubor(50, 47, 11, 4.2, 2.9),
    con(elip(50 - d, 40, 5.6, 5), anillo),
    con(elip(50 + d, 40, 5.6, 5), anillo),
    path(ruta`M${50 - d + 5.6},40 L${50 + d - 5.6},40`, anillo),
    // pico de cuña hacia abajo: lo que más lo separa del polluelo
    path(ruta`M${50 - 5},46 Q50,44.6 ${50 + 5},46 Q${50 + 2.2},51.6 50,52.4 Q${50 - 2.2},51.6 ${50 - 5},46Z`,
      { fill: CORAL, ...contornoFino(P) }),
  ];

  return {
    shadow: [sombra(50, 90, wB + 1.5)],
    cuerpo,
    apendice,
    cara: { ojos: ojos(50, 40, P, wH), resto },
  };
}

// ── Perro — mancha sobre un ojo, orejas caídas y hocico claro ───────────────
function perro(s, P, gid) {
  const hR = [19, 18.5, 18][s];
  const hRX = hR * 1.06;
  const hY = [47, 46, 45][s];
  const bRx = [18, 18.5, 18][s] * ANCHO;
  const bRy = [16, 17, 18][s];
  const bY = 69;
  const largoOreja = [17, 16, 15][s];

  const cuerpo = [];
  cuerpo.push(pieza(50 - 8.5, 85, 5.6, 3.6, P.edge, P));
  cuerpo.push(pieza(50 + 8.5, 85, 5.6, 3.6, P.edge, P));
  cuerpo.push(masa(50, bY, bRx, bRy, gid, P));
  cuerpo.push(elip(50, bY + 2, bRx * 0.56, bRy * 0.68, P.belly, 0.75));
  cuerpo.push(masa(50, hY, hRX, hR, gid, P));
  // mancha de cachorro: un solo ojo y descentrada. Va del lado opuesto al
  // brillo especular, si no la luz de peluche cae encima y la apaga.
  const k = hR / 19;
  const p = (dx, dy) => ruta`${50 + dx * k},${hY + dy * k}`;
  cuerpo.push(path(
    `M${p(2.5, -12)} C${p(6, -15.2)} ${p(11.5, -14.2)} ${p(14, -10)} C${p(16, -6)} ${p(15.2, 0)} ${p(11.6, 2.6)} C${p(8, 5)} ${p(3.4, 3.2)} ${p(1.8, -1)} C${p(0.6, -4.4)} ${p(0.6, -9)} ${p(2.5, -12)}Z`,
    { fill: P.deep, ...contornoFino(P) },
  ));
  cuerpo.push(brillo(50 - hRX * 0.4, hY - hR * 0.42));
  if (s === 2) {
    cuerpo.push(path(ruta`M${50 - hR * 0.66},${hY + hR * 0.94} q${hR * 0.66},7 ${hR * 1.32},0`,
      { stroke: CORAL, strokeWidth: 3.2, fill: 'none', strokeLinecap: 'round' }));
    cuerpo.push(circ(50, hY + hR + 2.4, 2.6, GOLD));
  }
  cuerpo.push(elip(50, hY + hR * 0.42, hRX * 0.54, hR * 0.4, P.belly, 0.9));

  const apendice = [];
  for (const g of [-1, 1]) {
    apendice.push(path(
      ruta`M${50 + g * hRX * 0.66},${hY - hR * 0.52} q${g * 11},1 ${g * 8.5},${largoOreja} q${-g * 6},3 ${-g * 9.5},-4Z`,
      { fill: P.deep, ...contornoFino(P) },
    ));
  }
  if (s >= 1) {
    apendice.push(path(ruta`M${50 + bRx * 0.86},${bY - 2} q12,-4 10,-12 q-1,8 -10,7Z`,
      { fill: P.edge, ...contornoFino(P) }));
  }

  const resto = [
    ...rubor(50, hY + hR * 0.4, hRX * 0.64),
    elip(50, hY + hR * 0.24, 3.1, 2.4, P.ink),
  ];
  if (s >= 1) resto.push(path(ruta`M${50 - 2.8},${hY + hR * 0.52} q2.8,5.4 5.6,0Z`, { fill: CORAL, ...contornoFino(P) }));
  else resto.push(sonrisa(50, hY + hR * 0.5, 3.6, P));

  return {
    shadow: [sombra(50, 90.5, bRx + 2)],
    cuerpo,
    apendice,
    cara: { ojos: ojos(50, hY - 0.5, P, hR), resto },
  };
}

// ── Dinosaurio — terópodo: mandíbula protagonista, cresta, brazos cortos ────
// Única especie con excepciones a la cara común, y a propósito: ojo achatado,
// ceja de ángulo suave y separación de 19 (el hocico va entre los ojos). Sin
// eso queda igual al perro. La ceja es suave a pedido: decidida, no hostil.
function dinosaurio(s, P, gid) {
  const hx = 47;
  const hY = [42, 41.5, 41][s];
  const hRX = [18.5, 19, 19.5][s];
  const hRY = [16.5, 17, 17.5][s];
  const bY = 70;
  const bRx = [19, 19.5, 20][s];
  const bRy = [15.5, 16, 16.5][s];
  const sepOjos = 9.5;
  const ey = hY - 4;

  const cuerpo = [];
  // piernas fuertes: muslo que asoma a los lados y pie de tres dedos
  for (const g of [-1, 1]) {
    cuerpo.push(pieza(50 + g * 12, 77, 8.5, 10, P.edge, P));
    cuerpo.push(pieza(50 + g * 13.5, 85.5, 8, 4.2, P.edge, P));
    cuerpo.push(path(
      ruta`M${50 + g * 13.5 - 2.7},86.6 L${50 + g * 13.5 - 2.7},88.8 M${50 + g * 13.5 + 2.7},86.6 L${50 + g * 13.5 + 2.7},88.8`,
      trazo(P, 1.3),
    ));
  }
  // cresta baja del lomo: bultos de columna, no placas (una fila de placas lee
  // estegosaurio y pelea con el brief de terópodo)
  for (const u of [0.55, 0.72, 0.88]) {
    cuerpo.push(aleta(50 + u * bRx, bY - bRy * Math.sqrt(1 - u * u), 3, 4 + s * 0.5, P));
  }
  cuerpo.push(masa(50, bY, bRx, bRy, gid, P));
  cuerpo.push(elip(50, bY + 3, bRx * 0.55, bRy * 0.62, P.belly, 0.7));
  // brazos cortos con garras, por delante del pecho
  for (const g of [-1, 1]) {
    const ax = 50 + g * (bRx - 2.5);
    cuerpo.push(path(ruta`M${ax},64 q${g * 7},1 ${g * 7.5},6 q${-g * 3.5},2 ${-g * 7.5},-2Z`,
      { fill: P.edge, ...contornoFino(P) }));
    cuerpo.push(path(ruta`M${ax + g * 6.4},69.4 l${g * 2.4},-1.3 M${ax + g * 5.4},70.8 l${g * 2.4},-1.1`, trazo(P, 1.2)));
  }
  // cresta de cabeza: la misma aleta del lomo, visible también de frente
  for (let i = 0; i < 3; i += 1) {
    cuerpo.push(aleta(hx + (i - 1) * 6.4, hY - hRY * 0.9, 3.6, (i === 1 ? 8.5 : 6.8) + s * 0.8, P));
  }
  cuerpo.push(masa(hx, hY, hRX, hRY, gid, P));
  cuerpo.push(brillo(hx - hRX * 0.42, hY - hRY * 0.44, 6.4, 4.6));
  if (s === 2) cuerpo.push(circ(hx + hRX * 0.6, hY - hRY * 0.58, 2, GOLD));
  // hocico como masa propia con su contorno: es lo que le da presencia de mandíbula
  cuerpo.push(masa(hx, 51.5, 13.5, 10.5, gid, P));
  cuerpo.push(elip(hx - 4.2, 44.5, 1.5, 1.1, P.ink, 0.65));
  cuerpo.push(elip(hx + 4.2, 44.5, 1.5, 1.1, P.ink, 0.65));

  const tx = 50 + bRx * 0.6;
  const ty = bY + 1;
  const apendice = [path(
    ruta`M${tx},${ty - 9} C${tx + 14},${ty - 12} ${tx + 24},${ty - 15} ${tx + 27},${ty - 21} C${tx + 30},${ty - 15} ${tx + 24},${ty - 4} ${tx + 16},${ty + 4} C${tx + 10},${ty + 8} ${tx + 2},${ty + 9} ${tx},${ty + 8}Z`,
    { fill: P.edge, ...contornoFino(P) },
  )];

  // fauces abiertas: boca rellena, cuatro dientes arriba, dos colmillos abajo y
  // lengua coral, que es lo que la mantiene tierna
  const resto = [...rubor(hx, 48, 8.2, 3.9, 2.7)];
  resto.push(path(ruta`M${hx - 11.5},52 C${hx - 10.5},62 ${hx + 10.5},62 ${hx + 11.5},52Z`, { fill: P.ink }));
  resto.push(elip(hx, 57, 5, 2.1, CORAL));
  for (let i = 0; i < 4; i += 1) {
    const td = hx - 7.5 + i * 5;
    resto.push(path(ruta`M${td - 2.1},52 L${td - 0.35},55 Q${td},55.7 ${td + 0.35},55 L${td + 2.1},52Z`, { fill: '#FFFFFF' }));
  }
  for (const g of [-1, 1]) {
    resto.push(path(ruta`M${hx + g * 5 - 1.6},57.5 L${hx + g * 5},54.3 L${hx + g * 5 + 1.6},57.5Z`, { fill: '#FFFFFF' }));
  }
  for (const g of [-1, 1]) {
    resto.push(path(ruta`M${hx + g * (sepOjos + 4.4)},${ey - 5.8} L${hx + g * (sepOjos - 3.4)},${ey - 4.3}`,
      { stroke: P.deep, strokeWidth: 2.5, fill: 'none', strokeLinecap: 'round' }));
  }

  return {
    shadow: [sombra(50, 90.5, bRx + 3)],
    cuerpo,
    apendice,
    cara: { ojos: [...ojo(hx - sepOjos, ey, P, 0.9), ...ojo(hx + sepOjos, ey, P, 0.9)], resto },
  };
}

// ── Huevo — especie propia (estilo Pou): se queda huevo, gana decoración ─────
function huevo(s, P, gid) {
  const w = [21, 21.5, 22][s] * ANCHO;
  const top = 22;
  const bot = 88;
  const mid = (top + bot) / 2;

  const cuerpo = [];
  if (s === 2) {
    cuerpo.push(path(ruta`M${50 - 9.5},${top + 1} l2,-8.5 l4.2,5.2 l3.3,-8.4 l3.3,8.4 l4.2,-5.2 l2,8.5Z`,
      { fill: GOLD, ...contornoFino(P) }));
  }
  cuerpo.push(path(
    ruta`M50,${top} C${50 + w * 0.9},${top} ${50 + w},${mid - 6} ${50 + w},${mid + 8} C${50 + w},${bot - 6} ${50 + w * 0.55},${bot} 50,${bot} C${50 - w * 0.55},${bot} ${50 - w},${bot - 6} ${50 - w},${mid + 8} C${50 - w},${mid - 6} ${50 - w * 0.9},${top} 50,${top}Z`,
    { fill: relleno(gid), ...contorno(P) },
  ));
  cuerpo.push(elip(50, mid + 17, w * 0.62, 12, P.belly, 0.5));
  cuerpo.push(brillo(50 - w * 0.36, mid - 12, 6.6, 4.8));
  if (s === 1) {
    cuerpo.push(path(ruta`M${50 - 18.5},${mid + 14} l5.3,-5 l5.3,5 l5.3,-5 l5.3,5 l5.3,-5 l5.3,5 l5.3,-5`,
      { stroke: P.deep, strokeWidth: 2.4, fill: 'none', strokeLinejoin: 'round', strokeLinecap: 'round' }));
    cuerpo.push(circ(50 - 8, mid + 24, 2.1, CORAL, 0.85));
    cuerpo.push(circ(50 + 9, mid + 26, 2.1, P.deep, 0.7));
  }
  if (s === 2) {
    cuerpo.push(path(ruta`M${50 - w + 4},${mid + 12} q${w - 4},9 ${(w - 4) * 2},0`, { stroke: GOLD, strokeWidth: 2.6, fill: 'none' }));
    cuerpo.push(path(ruta`M${50 - w + 4},${mid + 20} q${w - 4},7 ${(w - 4) * 2},0`, { stroke: GOLD, strokeWidth: 1.5, fill: 'none', opacity: 0.7 }));
    cuerpo.push(path(ruta`M50,${mid + 13} l-3.2,4.2 l3.2,4.2 l3.2,-4.2Z`, { fill: CORAL }));
    cuerpo.push(circ(50 - 11.5, mid + 17, 2.1, GLOW));
    cuerpo.push(circ(50 + 11.5, mid + 17, 2.1, CORAL, 0.7));
  }

  return {
    shadow: [sombra(50, 90.5, w * 0.92)],
    cuerpo,
    apendice: [],
    cara: {
      ojos: ojos(50, 54, P, w),
      resto: [...rubor(50, 60.5, 14.5, 4.7, 3.05), sonrisa(50, 61.5, 4.2, P)],
    },
  };
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

// Id del gradiente de sombreado. Determinista por especie+etapa: dos sprites
// iguales en pantalla comparten la misma definición en vez de colisionar.
export const idGradiente = (especie, etapa) => `mm-${especie}-${etapa}`;

// Construye la silueta de una especie en una etapa evolutiva (1|2|3).
// Tolerante: especie desconocida cae en la por defecto; etapa se clampa a 1..3.
export function dibujarEspecie(especie, etapa, paleta) {
  const id = BUILDERS[especie] ? especie : ESPECIE_POR_DEFECTO;
  const s = Math.max(0, Math.min(2, (Number(etapa) || 1) - 1));
  const gid = idGradiente(id, s + 1);
  return { defs: [gradiente(gid, paleta)], ...BUILDERS[id](s, paleta, gid) };
}
