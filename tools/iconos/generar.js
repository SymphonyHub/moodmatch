// Fuente vectorial de la identidad de app de MoodMatch (Fase 10, Prioridad 1):
// ícono v2 "Eclipse de vínculo" — dos anillos entrelazados sobre índigo. El
// anillo blanco tiene grosor de fase lunar (grueso a la izquierda, afinándose
// a la derecha → se lee como creciente = calma / "Hora Azul"); el anillo coral
// lo abraza por abajo con tejido real sobre-bajo (= vínculo / comunidad).
// Colorway confirmado en Fase 9; variante elegida por el usuario en Fase 10.
//
// Único lugar donde vive el dibujo: los PNGs de app/assets/ se regeneran con
//   node tools/iconos/generar.js
// y NUNCA se editan a mano. app.json ya referencia estos nombres exactos.
// (El ícono v1 "burbuja de diálogo" queda recuperable en el historial de git.)
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const INDIGO = '#4A5FC1'; // primary de la marca (theme/themes/sereno.js)
const CORAL = '#F0977A'; // accent del tema nocturno: coral brillante
const BLANCO = '#FFFFFF';

const ASSETS = path.join(__dirname, '..', '..', 'app', 'assets');

// ── helpers geométricos ────────────────────────────────────────────────
// Ángulos en grados de pantalla: 0=derecha, 90=abajo, 180=izquierda (y crece
// hacia abajo, como en SVG).
const rad = (deg) => (deg * Math.PI) / 180;
const polar = (cx, cy, r, deg) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];
const fmt = (pts) => pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ');
const cerrado = (pts) => `M ${fmt(pts)} Z`;

// Anillo cerrado de grosor variable: dos contornos concéntricos con fill-rule
// evenodd (el hueco queda transparente). Devuelve el path y los puntos del
// contorno EXTERIOR (para el cálculo de bounding box).
function anillo(cx, cy, r, anchoDe, n = 140) {
  const ext = [];
  const int = [];
  for (let i = 0; i < n; i += 1) {
    const deg = (i / n) * 360;
    const w = anchoDe(deg) / 2;
    ext.push(polar(cx, cy, r + w, deg));
    int.push(polar(cx, cy, r - w, deg));
  }
  return { d: `${cerrado(ext)} ${cerrado(int.reverse())}`, borde: ext };
}

// Arco muestreado degIni→degFin (grados, con signo).
function arco(cx, cy, r, degIni, degFin, n = 64) {
  const pts = [];
  for (let i = 0; i <= n; i += 1) pts.push(polar(cx, cy, r, degIni + ((degFin - degIni) * i) / n));
  return pts;
}

// ── El dibujo (Eclipse de vínculo) ─────────────────────────────────────
const LUNA = { cx: 472, cy: 482, R: 205 };
// Grosor de fase lunar: máximo a la izquierda (deg 200), mínimo a la derecha.
const anchoLunar = (deg) => 34 + 74 * (0.5 + 0.5 * Math.cos(rad(deg - 200))) ** 1.15;
const ANILLO_CORAL = { cx: 688, cy: 636, r: 118, grosor: 34 };

function construirArte() {
  const blanco = anillo(LUNA.cx, LUNA.cy, LUNA.R, anchoLunar);
  const { cx, cy, r, grosor } = ANILLO_CORAL;
  // Base del anillo coral (círculo trazado) + el tramo que mira al centro de
  // la luna re-dibujado encima → tejido sobre-bajo real en el cruce.
  const coralBase = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${CORAL}" stroke-width="${grosor}"/>`;
  const encima = arco(cx, cy, r, 195, 275, 48);
  const coralEncima = `<path fill="none" stroke="${CORAL}" stroke-width="${grosor}" stroke-linecap="round" d="M ${fmt(encima)}"/>`;
  const svg = coralBase + `<path fill-rule="evenodd" fill="${BLANCO}" d="${blanco.d}"/>` + coralEncima;

  // Bounding box y radio máximo desde el centro visual, contando el envelope
  // exterior del anillo coral (r + grosor/2). Alimenta el auto-centrado y el
  // escalado que garantiza la zona segura del adaptive icon.
  const puntos = blanco.borde.concat(arco(cx, cy, r + grosor / 2, 0, 360, 72));
  const xs = puntos.map((p) => p[0]);
  const ys = puntos.map((p) => p[1]);
  const centro = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  const radioMax = Math.max(...puntos.map((p) => Math.hypot(p[0] - centro[0], p[1] - centro[1])));
  return { svg, centro, radioMax };
}

const ARTE = construirArte();

// Recentra el arte en el lienzo y lo escala al diámetro objetivo pedido.
const arteAEscala = (diametroObjetivo) => {
  const escala = diametroObjetivo / (2 * ARTE.radioMax);
  return `<g transform="translate(512 512) scale(${escala.toFixed(4)}) translate(${-ARTE.centro[0]} ${-ARTE.centro[1]})">${ARTE.svg}</g>`;
};

const svgDoc = (contenido) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${contenido}</svg>`;
const FONDO_INDIGO = `<rect width="1024" height="1024" fill="${INDIGO}"/>`;

// Diámetros objetivo (fracción del lienzo de 1024):
const D_ICONO = 0.82 * 1024; // lleno, con aire para la máscara redondeada
const D_FOREGROUND = 0.60 * 1024; // dentro de la zona segura (radio 307 < 338)
const D_SPLASH = 0.64 * 1024; // respira centrado en pantalla

const VARIANTES = [
  { archivo: 'icon.png', tam: 1024, svg: svgDoc(FONDO_INDIGO + arteAEscala(D_ICONO)) },
  // Android adaptive: arte en foreground TRANSPARENTE, dentro de la zona
  // segura (círculo central del 66%); fondo índigo sólido aparte.
  {
    archivo: 'adaptive-icon-foreground.png',
    tam: 1024,
    svg: svgDoc(arteAEscala(D_FOREGROUND)),
    zonaSegura: true,
  },
  { archivo: 'adaptive-icon-background.png', tam: 1024, svg: svgDoc(FONDO_INDIGO) },
  // Splash clásico (resizeMode contain): transparente, el fondo #232A3D lo
  // pone app.json.
  { archivo: 'splash-icon.png', tam: 1024, svg: svgDoc(arteAEscala(D_SPLASH)) },
  // Favicon web (app.json lo referencia).
  { archivo: 'favicon.png', tam: 64, svg: svgDoc(FONDO_INDIGO + arteAEscala(D_ICONO)) },
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
