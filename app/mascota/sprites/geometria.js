// Constructores puros de "nodos" SVG para los sprites de la mascota. Un nodo es
// un objeto plano ({ t, ...attrs }) que el renderer (MascotaSprite) materializa
// en primitivos de react-native-svg. Mantenerlo como datos —y no como JSX— deja
// que el rig de animación agrupe partes (cuerpo/ojos/apéndice) sin conocer cada
// especie. Espeja el estilo geométrico en-código de tools/iconos/generar.js.
//
// Lienzo de referencia: viewBox 0 0 100 100, el "suelo" cerca de y=90.

export const elip = (cx, cy, rx, ry, fill, opacity) =>
  ({ t: 'ellipse', cx, cy, rx, ry, fill, ...(opacity != null ? { opacity } : {}) });

export const circ = (cx, cy, r, fill, opacity) =>
  ({ t: 'circle', cx, cy, r, fill, ...(opacity != null ? { opacity } : {}) });

export const path = (d, attrs = {}) => ({ t: 'path', d, ...attrs });

// Sombra de contacto en el suelo (elipse aplastada). Se dibuja bajo la criatura
// y no forma parte del grupo que respira/salta.
export const sombra = (cx, cy, rx, opacity = 0.12) =>
  elip(cx, cy, rx, rx * 0.22, '#2A1E4A', opacity);

// Ojo dulce: globo + brillo. Devuelto como lista para que el grupo de ojos
// completo lo escale el rig al parpadear.
export const ojoDulce = (cx, cy, r, dark) => [
  elip(cx, cy, r, r * 1.25, dark),
  circ(cx + r * 0.35, cy - r * 0.5, r * 0.42, '#FFFFFF', 0.95),
];

// Ojo sereno (arco): mirada entrecerrada de calma. Al parpadear el rig lo aplana.
export const ojoSereno = (cx, cy, w, dark) => [
  path(`M${cx - w},${cy} Q${cx},${cy + w * 0.9} ${cx + w},${cy}`,
    { stroke: dark, strokeWidth: 2.4, fill: 'none', strokeLinecap: 'round' }),
];

// Boca curva suave.
export const sonrisa = (cx, cy, w, dark, sw = 1.7) =>
  path(`M${cx - w},${cy} Q${cx},${cy + w * 0.8} ${cx + w},${cy}`,
    { stroke: dark, strokeWidth: sw, fill: 'none', strokeLinecap: 'round' });

// Centro geométrico de una lista de ojos (para que el rig escale el parpadeo
// alrededor del punto correcto sin hardcodear coordenadas por especie).
export const centroOjos = (ojos) => {
  const cxs = ojos.filter((n) => n.cx != null).map((n) => n.cx);
  const cys = ojos.filter((n) => n.cy != null).map((n) => n.cy);
  if (!cxs.length) return { x: 50, y: 45 };
  return {
    x: (Math.min(...cxs) + Math.max(...cxs)) / 2,
    y: (Math.min(...cys) + Math.max(...cys)) / 2,
  };
};
