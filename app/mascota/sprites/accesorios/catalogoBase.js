// Catálogo VISUAL base de accesorios. Devuelve nodos del mismo pipeline
// SVG-in-code que las siluetas ({ t, ...attrs }).
//
// Dos orígenes de dibujo para el mismo id:
//
//   'codigo' → el dibujo geométrico de este archivo, en el estilo plano de la
//              mascota y con color derivado de la paleta de la etapa. Es el
//              origen por defecto.
//   'trazo'  → arte importado de app/mascota/assets/accesorios/*.svg, convertido
//              a nodos por tools/mascota/importarAccesorios.js.
//
// Por qué 'codigo' y no el arte real, que era el default al importarlo: las
// ilustraciones vienen a 1024×1024 con paleta propia y saturada (naranja fuego,
// amarillo eléctrico, contorno negro y brillos especulares) y la mascota es
// plana, con el color saliendo de la etapa evolutiva. Sobre la silueta se leían
// como calcomanías pegadas. Además el arte arrastra dos defectos de origen: los
// lentes traen placas grises del fondo de la ilustración, y la segunda variante
// del gorro de noche es directamente un frasco con "Zz", no un gorro.
//
// El arte se conserva y el camino 'trazo' sigue entero: si más adelante se
// recortan bien esas piezas, alcanza con volver a cambiar esta constante.
//
// `lazo` no tiene SVG de origen, así que siempre se dibuja en código.
import {
  circ, con, contornoFino, elip, grupo, path, ruta,
} from '../geometria';
import {
  CORAL, CORAL_SOFT, GOLD, paletaEtapa,
} from '../paletas';
import { posicionAccesorio } from '../posicionAccesorios';
import { TRAZOS_ACCESORIOS } from './trazos.generado';

export const ORIGEN_POR_DEFECTO = 'codigo';

// Caja de diseño de cada accesorio, en unidades del lienzo 0 0 100 100. El arte
// se ajusta DENTRO de la caja conservando su proporción (encaje "contain"): así
// una ilustración ancha —los lentes— no se estira, y una alta —el gorro de
// fiesta— no se sale por arriba del lienzo.
//
// `anclaje` dice qué punto del arte cae sobre el punto de la especie:
//   'centro' → el centro del arte (lentes: se posan sobre los ojos)
//   'base'   → el borde inferior (gorros: se apoyan sobre la coronilla)
//
// `hundir` son las unidades que el borde inferior baja por debajo del punto de
// apoyo. Sin eso el gorro toca la coronilla en un solo punto y se lee flotando.
const CAJAS = {
  'lentes-sol': { anchoMax: 27, altoMax: 14, anclaje: 'centro' },
  'sombrero-fiesta': {
    anchoMax: 22, altoMax: 23, anclaje: 'base', hundir: 2.5,
  },
  'gorrito-noche': {
    anchoMax: 28, altoMax: 21, anclaje: 'base', hundir: 3,
  },
};

const redondear = (n, decimales = 4) => {
  const f = 10 ** decimales;
  return Math.round(n * f) / f;
};

// Monta el arte importado sobre el lienzo de la silueta. No reescribe el path
// data: calcula el transform del grupo que lo contiene. Cada variante trae su
// propia caja, así que se asienta según su silueta real y no según la de al lado.
function montarTrazo(id, pos, variante) {
  const trazos = TRAZOS_ACCESORIOS[id];
  const caja = CAJAS[id];
  if (!trazos?.length || !caja) return [];

  const arte = trazos[variante] ?? trazos[0];
  if (!arte?.nodos?.length) return [];

  const escala = redondear(
    Math.min(caja.anchoMax / arte.ancho, caja.altoMax / arte.alto) * pos.scale,
    5,
  );
  // Los gorros se apoyan por su borde inferior, no por su centro; `hundir` mete
  // ese borde unas unidades dentro de la cabeza para que se lea calzado y no
  // posado encima. Va en unidades del lienzo, así que se divide por la escala
  // para expresarlo en el sistema de coordenadas del arte.
  const refY = caja.anclaje === 'base'
    ? arte.cy + arte.alto / 2 - (caja.hundir ?? 0) / escala
    : arte.cy;
  const transform = `translate(${redondear(pos.x, 2)}, ${redondear(pos.y, 2)}) `
    + `scale(${escala}) translate(${redondear(-arte.cx, 2)}, ${redondear(-refY, 2)})`;

  return [grupo(transform, arte.nodos)];
}

// ── Dibujo en código ────────────────────────────────────────────────────────
const punto = ({ x, y, scale }) => ({
  x: (dx = 0) => x + dx * scale,
  y: (dy = 0) => y + dy * scale,
  n: (valor) => valor * scale,
});

// Las variantes NO son un recoloreo automático: cada una cambia lo que la hace
// reconocible por su nombre ("Lentes dorados" tiene marco dorado, "Gorro de
// confeti" tiene serpentina). Un filtro de tono sobre el mismo dibujo daría dos
// piezas que en la casilla del vestidor se ven iguales.
function lentesSol(pos, P, variante = 0) {
  const p = punto(pos);
  const marco = variante === 1 ? GOLD : P.deep;
  const nodos = [
    path(ruta`M${p.x(-12.5)},${p.y(-1.5)} L${p.x(-17)},${p.y(-3.8)} M${p.x(12.5)},${p.y(-1.5)} L${p.x(17)},${p.y(-3.8)}`, {
      stroke: marco, strokeWidth: p.n(1.8), fill: 'none', strokeLinecap: 'round',
    }),
  ];

  for (const lado of [-1, 1]) {
    const cx = p.x(lado * 7.2);
    nodos.push(con(elip(cx, p.y(), p.n(6.2), p.n(4.8), marco), contornoFino(P)));
    nodos.push(elip(cx, p.y(0.2), p.n(4.9), p.n(3.6), P.ink));
    nodos.push(elip(
      cx - p.n(1.7), p.y(-1.2), p.n(1.8), p.n(0.75), P.belly, 0.65,
    ));
  }
  nodos.push(path(ruta`M${p.x(-1.3)},${p.y(-0.8)} Q${p.x()},${p.y(-2.8)} ${p.x(1.3)},${p.y(-0.8)}`, {
    stroke: marco, strokeWidth: p.n(1.8), fill: 'none', strokeLinecap: 'round',
  }));
  return nodos;
}

function sombreroFiesta(pos, P, variante = 0) {
  const p = punto(pos);
  const cono = path(ruta`M${p.x(-8.5)},${p.y(1.5)} L${p.x()},${p.y(-20)} L${p.x(8.5)},${p.y(1.5)}Z`, {
    fill: P.deep, ...contornoFino(P),
  });
  const ruedo = path(ruta`M${p.x(-10)},${p.y(1)} Q${p.x()},${p.y(5)} ${p.x(10)},${p.y(1)} L${p.x(9.5)},${p.y(4)} Q${p.x()},${p.y(7)} ${p.x(-9.5)},${p.y(4)}Z`, {
    fill: CORAL_SOFT, ...contornoFino(P),
  });
  const pompon = con(circ(p.x(), p.y(-21), p.n(2.7), GOLD), contornoFino(P));

  // Serpentina en zigzag bajando el cono, más una estrellita: es lo que el
  // nombre "Gorro de confeti" promete y lo que lo separa del de fiesta.
  if (variante === 1) {
    const estrella = ruta`M${p.x(-3.4)},${p.y(-8)} l${p.n(0.9)},${p.n(-2.2)} l${p.n(2.2)},${p.n(-0.9)} l${p.n(-2.2)},${p.n(-0.9)} l${p.n(-0.9)},${p.n(-2.2)} l${p.n(-0.9)},${p.n(2.2)} l${p.n(-2.2)},${p.n(0.9)} l${p.n(2.2)},${p.n(0.9)}Z`;
    return [
      cono,
      path(ruta`M${p.x(-4.6)},${p.y(-14)} Q${p.x(1)},${p.y(-12.4)} ${p.x(-3.2)},${p.y(-10)} Q${p.x(3.2)},${p.y(-7.6)} ${p.x(-2.2)},${p.y(-5)} Q${p.x(4.4)},${p.y(-2.6)} ${p.x(-1.4)},${p.y(-0.4)}`, {
        stroke: CORAL, strokeWidth: p.n(1.7), fill: 'none', strokeLinecap: 'round',
      }),
      path(estrella, { fill: GOLD }),
      circ(p.x(4.2), p.y(-11.5), p.n(1.2), P.hi),
      ruedo,
      pompon,
    ];
  }

  return [
    cono,
    path(ruta`M${p.x(-5.5)},${p.y(-6)} Q${p.x()},${p.y(-2.5)} ${p.x(5.5)},${p.y(-6)}`, {
      stroke: P.hi, strokeWidth: p.n(2.2), fill: 'none', strokeLinecap: 'round',
    }),
    circ(p.x(-1.8), p.y(-12), p.n(1.5), GOLD),
    circ(p.x(3.2), p.y(-8.8), p.n(1.25), CORAL_SOFT),
    ruedo,
    pompon,
  ];
}

// v0 "Gorro de lana": vuelta tejida con puntadas, sin luna. v1 "Gorro
// dormilón": la misma caída, con la luna dorada. Comparten silueta a propósito
// —son el mismo gorro— pero se distinguen de un vistazo en la casilla.
function gorritoNoche(pos, P, variante = 0) {
  const p = punto(pos);
  const caida = path(ruta`M${p.x(-9)},${p.y()} C${p.x(-8)},${p.y(-11)} ${p.x(-2)},${p.y(-18)} ${p.x(5)},${p.y(-17)} C${p.x(11)},${p.y(-16)} ${p.x(12)},${p.y(-10)} ${p.x(17)},${p.y(-9)} C${p.x(12)},${p.y(-6.5)} ${p.x(8)},${p.y(-5)} ${p.x(6)},${p.y()}Z`, {
    fill: P.edge, ...contornoFino(P),
  });
  const vuelta = path(ruta`M${p.x(-10)},${p.y(-1)} Q${p.x()},${p.y(2.5)} ${p.x(10)},${p.y(-1)} L${p.x(10)},${p.y(3)} Q${p.x()},${p.y(6)} ${p.x(-10)},${p.y(3)}Z`, {
    fill: P.belly, ...contornoFino(P),
  });
  const pompon = [
    con(circ(p.x(18), p.y(-9), p.n(3), P.hi), contornoFino(P)),
    circ(p.x(17.2), p.y(-10), p.n(1), '#FFFFFF', 0.62),
  ];

  if (variante === 1) {
    return [
      caida,
      path(ruta`M${p.x(-2.5)},${p.y(-12.5)} a${p.n(4)},${p.n(4)} 0 1 0 ${p.n(4)},${p.n(6)} a${p.n(3.2)},${p.n(3.2)} 0 1 1 -${p.n(4)},-${p.n(6)}Z`, {
        fill: GOLD,
      }),
      vuelta,
      ...pompon,
    ];
  }

  return [
    caida,
    // Puntadas de lana: dos hileras de "v" siguiendo la curva del gorro.
    path(ruta`M${p.x(-5.5)},${p.y(-8.5)} l${p.n(2)},${p.n(2)} l${p.n(2)},${p.n(-2)} M${p.x(0.5)},${p.y(-11)} l${p.n(2)},${p.n(2)} l${p.n(2)},${p.n(-2)}`, {
      stroke: P.deep, strokeWidth: p.n(1.2), fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', opacity: 0.7,
    }),
    vuelta,
    path(ruta`M${p.x(-6)},${p.y(0.6)} l0,${p.n(2.6)} M${p.x(-2)},${p.y(1.4)} l0,${p.n(2.6)} M${p.x(2)},${p.y(1.4)} l0,${p.n(2.6)} M${p.x(6)},${p.y(0.6)} l0,${p.n(2.6)}`, {
      stroke: P.edge, strokeWidth: p.n(1.1), fill: 'none', strokeLinecap: 'round', opacity: 0.75,
    }),
    ...pompon,
  ];
}

function lazo(pos, P) {
  const p = punto(pos);
  return [
    path(ruta`M${p.x(-2)},${p.y(2)} L${p.x(-6)},${p.y(11)} L${p.x()},${p.y(7)} L${p.x(6)},${p.y(11)} L${p.x(2)},${p.y(2)}Z`, {
      fill: CORAL, ...contornoFino(P),
    }),
    path(ruta`M${p.x(-1.5)},${p.y()} C${p.x(-5)},${p.y(-6)} ${p.x(-11)},${p.y(-7)} ${p.x(-11)},${p.y(-1)} C${p.x(-11)},${p.y(5)} ${p.x(-5)},${p.y(5)} ${p.x(-1.5)},${p.y(1)}Z`, {
      fill: CORAL_SOFT, ...contornoFino(P),
    }),
    path(ruta`M${p.x(1.5)},${p.y()} C${p.x(5)},${p.y(-6)} ${p.x(11)},${p.y(-7)} ${p.x(11)},${p.y(-1)} C${p.x(11)},${p.y(5)} ${p.x(5)},${p.y(5)} ${p.x(1.5)},${p.y(1)}Z`, {
      fill: CORAL_SOFT, ...contornoFino(P),
    }),
    elip(p.x(-6.2), p.y(-2), p.n(2.4), p.n(1), P.belly, 0.48),
    elip(p.x(6.2), p.y(-2), p.n(2.4), p.n(1), P.belly, 0.48),
    con(circ(p.x(), p.y(), p.n(3), CORAL), contornoFino(P)),
  ];
}

const DIBUJANTES = {
  'lentes-sol': lentesSol,
  'sombrero-fiesta': sombreroFiesta,
  'gorrito-noche': gorritoNoche,
  lazo,
};

// ── Catálogo de DISEÑOS ─────────────────────────────────────────────────────
// Un diseño es un dibujo con su anclaje. `variantes` es cuántas versiones de
// color trajo el arte de origen; el dibujo en código tiene una sola.
export const CATALOGO_ACCESORIOS_BASE = [
  {
    id: 'lentes-sol', nombre: 'Lentes de sol', zona: 'rostro', variantes: 2,
  },
  {
    id: 'sombrero-fiesta', nombre: 'Sombrero de fiesta', zona: 'cabeza', variantes: 2,
  },
  {
    id: 'gorrito-noche', nombre: 'Gorrito de noche', zona: 'cabeza', variantes: 2,
  },
  {
    id: 'lazo', nombre: 'Lazo / moño', zona: 'cabeza', variantes: 1,
  },
];

export const variantesDe = (id) =>
  CATALOGO_ACCESORIOS_BASE.find((a) => a.id === id)?.variantes ?? 1;

// Normaliza el índice de variante al rango que el diseño realmente tiene.
export function varianteValida(id, variante) {
  const total = variantesDe(id);
  const v = Math.trunc(Number(variante));
  return Number.isFinite(v) && v >= 0 && v < total ? v : 0;
}

// ── Catálogo EQUIPABLE ──────────────────────────────────────────────────────
// Cada variante de color es un id propio y no un atributo aparte. La razón es
// concreta: la mascota guarda el accesorio equipado en una columna por ranura
// (MascotaAmistad.accesorioCabeza), así que un segundo campo "variante" pediría
// una migración. Con un id por variante, el arte nuevo entra sin tocar el schema.
//
// Los ids DEBEN coincidir con backend/lib/accesorios.js (paridad verificada en
// accesoriosSprites.test.js). Los nombres son los que ve la persona.
export const ACCESORIOS_BASE_EQUIPABLES = [
  {
    id: 'lazo', diseno: 'lazo', variante: 0, nombre: 'Lazo', descripcion: 'Un moñito coral',
  },
  {
    id: 'lentes-sol', diseno: 'lentes-sol', variante: 0, nombre: 'Lentes redondos', descripcion: 'Para los días de sol',
  },
  {
    id: 'lentes-sol-b', diseno: 'lentes-sol', variante: 1, nombre: 'Lentes dorados', descripcion: 'Imposible pasar desapercibida',
  },
  {
    id: 'sombrero-fiesta', diseno: 'sombrero-fiesta', variante: 0, nombre: 'Gorro de fiesta', descripcion: 'Hoy se celebra',
  },
  {
    id: 'sombrero-fiesta-b', diseno: 'sombrero-fiesta', variante: 1, nombre: 'Gorro de confeti', descripcion: 'Con serpentina y una estrellita',
  },
  {
    id: 'gorrito-noche', diseno: 'gorrito-noche', variante: 0, nombre: 'Gorro de lana', descripcion: 'Abriga hasta las orejas',
  },
  {
    id: 'gorrito-noche-b', diseno: 'gorrito-noche', variante: 1, nombre: 'Gorro dormilón', descripcion: 'Para las siestas largas',
  },
];

const EQUIPABLE_POR_ID = new Map(ACCESORIOS_BASE_EQUIPABLES.map((a) => [a.id, a]));

export const esAccesorioBase = (id) => EQUIPABLE_POR_ID.has(id);

export const accesorioBase = (id) => EQUIPABLE_POR_ID.get(id) ?? null;

// Dibuja por id EQUIPABLE (resuelve diseño + variante). Es la puerta que usa
// sprites/accesorios.js para los ids del catálogo base.
export function dibujarAccesorioEquipable({
  id, especie, paleta = paletaEtapa(2), origen = ORIGEN_POR_DEFECTO,
}) {
  const item = EQUIPABLE_POR_ID.get(id);
  if (!item) return [];
  return dibujarAccesorioBase({
    id: item.diseno, especie, paleta, variante: item.variante, origen,
  });
}

// Dibuja por id de DISEÑO, eligiendo la variante a mano. Lo usan las vistas
// previas y las pruebas.
export function dibujarAccesorioBase({
  id, especie, paleta = paletaEtapa(2), variante = 0, origen = ORIGEN_POR_DEFECTO,
}) {
  const pos = posicionAccesorio(especie, id);
  if (!pos) return [];

  const v = varianteValida(id, variante);
  if (origen === 'trazo' && TRAZOS_ACCESORIOS[id]) {
    return montarTrazo(id, pos, v);
  }
  const dibujar = DIBUJANTES[id];
  return dibujar ? dibujar(pos, paleta, v) : [];
}
