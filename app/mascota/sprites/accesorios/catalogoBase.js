// Catálogo VISUAL base de accesorios de Bloque 4. Devuelve nodos del mismo
// pipeline SVG-in-code que las siluetas ({ t, ...attrs }); todavía no forma parte
// del catálogo equipable ni declara precios/desbloqueos.
import {
  circ, con, contornoFino, elip, path, ruta,
} from '../geometria';
import {
  CORAL, CORAL_SOFT, GOLD, paletaEtapa,
} from '../paletas';
import { posicionAccesorio } from '../posicionAccesorios';

const punto = ({ x, y, scale }) => ({
  x: (dx = 0) => x + dx * scale,
  y: (dy = 0) => y + dy * scale,
  n: (valor) => valor * scale,
});

function lentesSol(pos, P) {
  const p = punto(pos);
  const nodos = [
    path(ruta`M${p.x(-12.5)},${p.y(-1.5)} L${p.x(-17)},${p.y(-3.8)} M${p.x(12.5)},${p.y(-1.5)} L${p.x(17)},${p.y(-3.8)}`, {
      stroke: P.deep, strokeWidth: p.n(1.8), fill: 'none', strokeLinecap: 'round',
    }),
  ];

  for (const lado of [-1, 1]) {
    const cx = p.x(lado * 7.2);
    nodos.push(con(elip(cx, p.y(), p.n(6.2), p.n(4.8), P.deep), contornoFino(P)));
    nodos.push(elip(cx, p.y(0.2), p.n(4.9), p.n(3.6), P.ink));
    nodos.push(elip(
      cx - p.n(1.7), p.y(-1.2), p.n(1.8), p.n(0.75), P.belly, 0.65,
    ));
  }
  nodos.push(path(ruta`M${p.x(-1.3)},${p.y(-0.8)} Q${p.x()},${p.y(-2.8)} ${p.x(1.3)},${p.y(-0.8)}`, {
    stroke: P.deep, strokeWidth: p.n(1.8), fill: 'none', strokeLinecap: 'round',
  }));
  return nodos;
}

function sombreroFiesta(pos, P) {
  const p = punto(pos);
  return [
    path(ruta`M${p.x(-8.5)},${p.y(1.5)} L${p.x()},${p.y(-20)} L${p.x(8.5)},${p.y(1.5)}Z`, {
      fill: P.deep, ...contornoFino(P),
    }),
    path(ruta`M${p.x(-5.5)},${p.y(-6)} Q${p.x()},${p.y(-2.5)} ${p.x(5.5)},${p.y(-6)}`, {
      stroke: P.hi, strokeWidth: p.n(2.2), fill: 'none', strokeLinecap: 'round',
    }),
    circ(p.x(-1.8), p.y(-12), p.n(1.5), GOLD),
    circ(p.x(3.2), p.y(-8.8), p.n(1.25), CORAL_SOFT),
    path(ruta`M${p.x(-10)},${p.y(1)} Q${p.x()},${p.y(5)} ${p.x(10)},${p.y(1)} L${p.x(9.5)},${p.y(4)} Q${p.x()},${p.y(7)} ${p.x(-9.5)},${p.y(4)}Z`, {
      fill: CORAL_SOFT, ...contornoFino(P),
    }),
    con(circ(p.x(), p.y(-21), p.n(2.7), GOLD), contornoFino(P)),
  ];
}

function gorritoNoche(pos, P) {
  const p = punto(pos);
  return [
    path(ruta`M${p.x(-9)},${p.y()} C${p.x(-8)},${p.y(-11)} ${p.x(-2)},${p.y(-18)} ${p.x(5)},${p.y(-17)} C${p.x(11)},${p.y(-16)} ${p.x(12)},${p.y(-10)} ${p.x(17)},${p.y(-9)} C${p.x(12)},${p.y(-6.5)} ${p.x(8)},${p.y(-5)} ${p.x(6)},${p.y()}Z`, {
      fill: P.edge, ...contornoFino(P),
    }),
    path(ruta`M${p.x(-2.5)},${p.y(-12.5)} a${p.n(4)},${p.n(4)} 0 1 0 ${p.n(4)},${p.n(6)} a${p.n(3.2)},${p.n(3.2)} 0 1 1 -${p.n(4)},-${p.n(6)}Z`, {
      fill: GOLD,
    }),
    path(ruta`M${p.x(-10)},${p.y(-1)} Q${p.x()},${p.y(2.5)} ${p.x(10)},${p.y(-1)} L${p.x(10)},${p.y(3)} Q${p.x()},${p.y(6)} ${p.x(-10)},${p.y(3)}Z`, {
      fill: P.belly, ...contornoFino(P),
    }),
    con(circ(p.x(18), p.y(-9), p.n(3), P.hi), contornoFino(P)),
    circ(p.x(17.2), p.y(-10), p.n(1), '#FFFFFF', 0.62),
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

export const CATALOGO_ACCESORIOS_BASE = [
  { id: 'lentes-sol', nombre: 'Lentes de sol', zona: 'rostro' },
  { id: 'sombrero-fiesta', nombre: 'Sombrero de fiesta', zona: 'cabeza' },
  { id: 'gorrito-noche', nombre: 'Gorrito de noche', zona: 'cabeza' },
  { id: 'lazo', nombre: 'Lazo / moño', zona: 'cabeza' },
];

export function dibujarAccesorioBase({ id, especie, paleta = paletaEtapa(2) }) {
  const pos = posicionAccesorio(especie, id);
  const dibujar = DIBUJANTES[id];
  return pos && dibujar ? dibujar(pos, paleta) : [];
}
