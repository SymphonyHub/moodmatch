// Constructores puros de "nodos" SVG para los sprites de la mascota. Un nodo es
// un objeto plano ({ t, ...attrs }) que el renderer (MascotaSprite) materializa
// en primitivos de react-native-svg. Mantenerlo como datos —y no como JSX— deja
// que el rig de animación agrupe partes (cuerpo/ojos/apéndice) sin conocer cada
// especie. Espeja el estilo geométrico en-código de tools/iconos/generar.js.
//
// Lienzo de referencia: viewBox 0 0 100 100, el "suelo" cerca de y=90.
//
// Además de los primitivos, este módulo fija las REGLAS DE FAMILIA del pulido
// visual (Fase 17, Bloque 1). Las 7 especies las consumen desde acá y no pueden
// divergir por descuido: un solo contorno, un solo ojo, un solo rubor, un solo
// sombreado. Las excepciones deliberadas están marcadas en especies.js.

import { CORAL_SOFT } from './paletas';

export const elip = (cx, cy, rx, ry, fill, opacity) =>
  ({ t: 'ellipse', cx, cy, rx, ry, fill, ...(opacity != null ? { opacity } : {}) });

export const circ = (cx, cy, r, fill, opacity) =>
  ({ t: 'circle', cx, cy, r, fill, ...(opacity != null ? { opacity } : {}) });

export const path = (d, attrs = {}) => ({ t: 'path', d, ...attrs });

// Mezcla atributos extra en un nodo ya construido (contorno, rotación).
export const con = (nodo, attrs) => ({ ...nodo, ...attrs });

// Interpola números redondeados en el `d` de un path, para que las coordenadas
// calculadas no lo llenen de decimales de coma flotante.
export const ruta = (trozos, ...valores) => trozos.reduce((acc, trozo, i) => {
  if (i >= valores.length) return acc + trozo;
  const v = valores[i];
  return acc + trozo + (typeof v === 'number' ? Math.round(v * 100) / 100 : v);
}, '');

// ── Contorno ────────────────────────────────────────────────────────────────
// Dos grosores. La guía de la fase pide uno solo en las 7; con 1.8 uniforme los
// detalles chicos (picos, patas, dedos) se embotan al tamaño real de la tarjeta
// (62 px). Es una desviación deliberada y registrada, no un descuido.
export const contorno = (P) =>
  ({ stroke: P.tonal, strokeWidth: 1.8, strokeLinejoin: 'round', strokeLinecap: 'round' });

export const contornoFino = (P) =>
  ({ stroke: P.tonal, strokeWidth: 1.4, strokeLinejoin: 'round', strokeLinecap: 'round' });

// Trazo suelto del mismo color de línea (bigotes, dedos, pliegues).
export const trazo = (P, strokeWidth = 1.2) =>
  ({ stroke: P.tonal, strokeWidth, fill: 'none', strokeLinecap: 'round' });

// ── Sombreado ───────────────────────────────────────────────────────────────
// Un radial por especie+etapa, declarado una vez en <Defs> y referenciado por
// cada masa. Es lo que hace que la silueta se lea inflada y no plana.
export const gradiente = (id, P) => ({
  t: 'grad', id, hi: P.hi, body: P.body, edge: P.edge,
});
export const relleno = (id) => `url(#${id})`;

// Masa principal: gradiente + contorno grueso.
export const masa = (cx, cy, rx, ry, id, P) => con(elip(cx, cy, rx, ry, relleno(id)), contorno(P));

// Pieza secundaria: color plano + contorno fino.
export const pieza = (cx, cy, rx, ry, fill, P) => con(elip(cx, cy, rx, ry, fill), contornoFino(P));

// Brillo especular: el punto de luz que termina de venderlo como peluche.
export const brillo = (cx, cy, rx = 6.6, ry = 4.6) => con(
  elip(cx, cy, rx, ry, '#FFFFFF', 0.42),
  { rotation: -26, originX: cx, originY: cy },
);

// Sombra de contacto en el suelo (elipse aplastada). Se dibuja bajo la criatura
// y no forma parte del grupo que respira/salta.
export const sombra = (cx, cy, rx, opacity = 0.12) =>
  elip(cx, cy, rx, rx * 0.22, '#2A1E4A', opacity);

// ── Cara ────────────────────────────────────────────────────────────────────
export const R_OJO = 3.2;
export const SEP_OJOS = 7.4;

// Ojo: globo + brillo grande arriba-derecha + reflejo chico abajo-izquierda.
// `achatado` < 1 lo vuelve más ancho que alto: solo el dinosaurio lo usa, para
// que la mirada lea decidida en vez de inocente.
export const ojo = (cx, cy, P, achatado = 1.12, r = R_OJO) => [
  elip(cx, cy, r, r * achatado, P.ink),
  circ(cx + r * 0.36, cy - r * 0.46, r * 0.4, '#FFFFFF', 0.95),
  circ(cx - r * 0.34, cy + r * 0.52, r * 0.17, '#FFFFFF', 0.5),
];

// Separación común, salvo cabezas angostas donde se ajusta al radio.
export const separacion = (radioCabeza) => Math.min(SEP_OJOS, radioCabeza * 0.86);

export const ojos = (cx, cy, P, radioCabeza, achatado) => {
  const d = separacion(radioCabeza);
  return [...ojo(cx - d, cy, P, achatado), ...ojo(cx + d, cy, P, achatado)];
};

// Chapitas de rubor: mismo óvalo y misma opacidad en las 7.
export const rubor = (cx, cy, dx, rx = 4.8, ry = 3.1) => [
  elip(cx - dx, cy, rx, ry, CORAL_SOFT, 0.7),
  elip(cx + dx, cy, rx, ry, CORAL_SOFT, 0.7),
];

// Boca curva suave.
export const sonrisa = (cx, cy, w, P, strokeWidth = 1.9) =>
  path(ruta`M${cx - w},${cy} Q${cx},${cy + w * 0.8} ${cx + w},${cy}`,
    { stroke: P.ink, strokeWidth, fill: 'none', strokeLinecap: 'round' });

// Aleta redondeada: la cresta de cabeza y los bultos del lomo del dinosaurio son
// la misma pieza a distinta escala, para que se lea como el mismo animal.
export const aleta = (px, py, ancho, alto, P) => path(
  ruta`M${px - ancho},${py + 2.4} C${px - ancho * 0.57},${py - alto} ${px + ancho * 0.57},${py - alto} ${px + ancho},${py + 2.4}Z`,
  { fill: P.deep, ...contornoFino(P) },
);

// Centro geométrico de una lista de ojos (para que el rig escale el parpadeo
// alrededor del punto correcto sin hardcodear coordenadas por especie).
export const centroOjos = (ojosNodos) => {
  const cxs = ojosNodos.filter((n) => n.cx != null).map((n) => n.cx);
  const cys = ojosNodos.filter((n) => n.cy != null).map((n) => n.cy);
  if (!cxs.length) return { x: 50, y: 45 };
  return {
    x: (Math.min(...cxs) + Math.max(...cxs)) / 2,
    y: (Math.min(...cys) + Math.max(...cys)) / 2,
  };
};
