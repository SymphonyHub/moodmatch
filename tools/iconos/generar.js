// Fuente vectorial de la identidad de app de MoodMatch (Fase 9, Prioridad 3):
// burbuja de diálogo minimalista con "onda de calma" — índigo dominante,
// burbuja blanca, onda coral (colorway confirmado por el usuario).
//
// Único lugar donde vive el dibujo: los PNGs de app/assets/ se regeneran con
//   node tools/iconos/generar.js
// y NUNCA se editan a mano. app.json ya referencia estos nombres exactos.
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const INDIGO = '#4A5FC1'; // primary de la marca (theme/themes/sereno.js)
const CORAL = '#F0977A'; // accent del tema nocturno: coral brillante
const BLANCO = '#FFFFFF';

const ASSETS = path.join(__dirname, '..', '..', 'app', 'assets');

// Burbuja: rectángulo redondeado 560×380 (r=130) con colita curva integrada
// que baja del borde inferior izquierdo — swoosh suave, no triángulo duro.
// Bounding box del arte completo: x 232..792, y 272..777.
const BURBUJA = `<path fill="${BLANCO}" d="M 362 272 H 662 A 130 130 0 0 1 792 402 V 522 A 130 130 0 0 1 662 652 H 480 C 474 706 442 748 382 776 C 371 781 359 773 364 762 C 378 730 384 692 384 652 L 362 652 A 130 130 0 0 1 232 522 V 402 A 130 130 0 0 1 362 272 Z"/>`;

// Onda de calma (variante B, elegida por el usuario en la ronda 2): trazo
// caligráfico de grosor variable sobre la senoidal de 2 crestas — 66 px en
// el centro, afinándose hasta puntas finas en los extremos. El contorno se
// calcula muestreando la curva y desplazando por la normal, para que el
// dibujo siga siendo código puro y no un path pegado a mano.
const CURVA_1 = [[352, 462], [402, 398], [462, 398], [512, 462]];
const CURVA_2 = [[512, 462], [562, 526], [622, 526], [672, 462]];

const bez = (c, t) => {
  const u = 1 - t;
  return [
    u * u * u * c[0][0] + 3 * u * u * t * c[1][0] + 3 * u * t * t * c[2][0] + t * t * t * c[3][0],
    u * u * u * c[0][1] + 3 * u * u * t * c[1][1] + 3 * u * t * t * c[2][1] + t * t * t * c[3][1],
  ];
};
const derivada = (c, t) => {
  const u = 1 - t;
  return [
    3 * u * u * (c[1][0] - c[0][0]) + 6 * u * t * (c[2][0] - c[1][0]) + 3 * t * t * (c[3][0] - c[2][0]),
    3 * u * u * (c[1][1] - c[0][1]) + 6 * u * t * (c[2][1] - c[1][1]) + 3 * t * t * (c[3][1] - c[2][1]),
  ];
};

function pathOndaOrganica({ anchoMax = 66, exponente = 0.55, muestras = 64 } = {}) {
  const arriba = [];
  const abajo = [];
  for (let i = 0; i <= muestras; i += 1) {
    const t = i / muestras;
    const [curva, tl] = t < 0.5 ? [CURVA_1, t * 2] : [CURVA_2, (t - 0.5) * 2];
    const [x, y] = bez(curva, tl);
    const [dx, dy] = derivada(curva, tl);
    const largo = Math.hypot(dx, dy) || 1;
    const w = (anchoMax / 2) * Math.sin(Math.PI * t) ** exponente;
    arriba.push([x + (-dy / largo) * w, y + (dx / largo) * w]);
    abajo.push([x - (-dy / largo) * w, y - (dx / largo) * w]);
  }
  const p = (pt) => `${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`;
  return (
    `M ${p(arriba[0])} ` +
    arriba.slice(1).map((pt) => `L ${p(pt)}`).join(' ') +
    ' ' +
    abajo.reverse().map((pt) => `L ${p(pt)}`).join(' ') +
    ' Z'
  );
}

const ONDA = `<path fill="${CORAL}" d="${pathOndaOrganica()}"/>`;

// El centro visual del arte está en (512, 524) por la colita: se recentra y
// escala respecto de ese punto para que la burbuja quede ópticamente centrada.
const arte = (escala) =>
  `<g transform="translate(512 512) scale(${escala}) translate(-512 -524)">${BURBUJA}${ONDA}</g>`;

const svgDoc = (contenido) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${contenido}</svg>`;

const FONDO_INDIGO = `<rect width="1024" height="1024" fill="${INDIGO}"/>`;

const VARIANTES = [
  // Ícono principal (iOS/general): índigo full-bleed, arte apenas ampliado.
  { archivo: 'icon.png', tam: 1024, svg: svgDoc(FONDO_INDIGO + arte(1.06)) },
  // Android adaptive: el arte va en el foreground TRANSPARENTE y debe caber
  // en la zona segura (círculo central del 66%); el fondo es índigo sólido.
  {
    archivo: 'adaptive-icon-foreground.png',
    tam: 1024,
    svg: svgDoc(arte(1)),
    zonaSegura: true,
  },
  { archivo: 'adaptive-icon-background.png', tam: 1024, svg: svgDoc(FONDO_INDIGO) },
  // Splash clásico (resizeMode contain): transparente, el fondo #232A3D lo
  // pone app.json. Arte con aire para que respire centrado en pantalla.
  { archivo: 'splash-icon.png', tam: 1024, svg: svgDoc(arte(0.95)) },
  // Favicon web (app.json lo referencia y no existía hasta este rebrand).
  { archivo: 'favicon.png', tam: 64, svg: svgDoc(FONDO_INDIGO + arte(1.06)) },
];

// La zona segura del adaptive icon es el círculo central de diámetro 66%:
// cualquier píxel con alfa fuera de ese círculo se recorta en algunos
// launchers → error, no advertencia.
function verificarZonaSegura(pixels, tam) {
  const radio = (tam * 0.66) / 2;
  const centro = tam / 2;
  for (let y = 0; y < tam; y += 1) {
    for (let x = 0; x < tam; x += 1) {
      const alfa = pixels[(y * tam + x) * 4 + 3];
      if (alfa === 0) continue;
      const dx = x + 0.5 - centro;
      const dy = y + 0.5 - centro;
      if (Math.sqrt(dx * dx + dy * dy) > radio) {
        throw new Error(
          `pixel visible fuera de la zona segura en (${x}, ${y}) — radio ${radio.toFixed(1)}`,
        );
      }
    }
  }
}

for (const { archivo, tam, svg, zonaSegura } of VARIANTES) {
  const render = new Resvg(svg, { fitTo: { mode: 'width', value: tam } }).render();
  if (render.width !== tam || render.height !== tam) {
    throw new Error(`${archivo}: dimensiones ${render.width}×${render.height}, esperaba ${tam}×${tam}`);
  }
  if (zonaSegura) verificarZonaSegura(render.pixels, tam);
  fs.writeFileSync(path.join(ASSETS, archivo), render.asPng());
  console.log(`✔ ${archivo} (${tam}×${tam})`);
}
console.log('Listo: assets regenerados en app/assets/');
