import {
  CATALOGO_ACCESORIOS_BASE,
  dibujarAccesorioBase,
  variantesDe,
} from '../mascota/sprites/accesorios/catalogoBase';
import { TRAZOS_ACCESORIOS } from '../mascota/sprites/accesorios/trazos.generado';
import { ESPECIES } from '../mascota/sprites/especies';

const CON_SVG = ['lentes-sol', 'sombrero-fiesta', 'gorrito-noche'];

// Reconstruye la caja que el accesorio ocupa en el lienzo 0 0 100 100 a partir
// del transform EMITIDO, no de la fórmula que lo produjo: si el cálculo cambia,
// esta prueba lo mide igual.
function cajaEnLienzo(nodo, arte) {
  const m = /^translate\((-?[\d.]+), (-?[\d.]+)\) scale\((-?[\d.]+)\) translate\((-?[\d.]+), (-?[\d.]+)\)$/
    .exec(nodo.transform);
  expect(m).not.toBeNull();
  const [x, y, s, tx, ty] = m.slice(1).map(Number);
  const proyectar = (px, py) => [x + s * (px + tx), y + s * (py + ty)];
  const [x0, y0] = proyectar(arte.cx - arte.ancho / 2, arte.cy - arte.alto / 2);
  const [x1, y1] = proyectar(arte.cx + arte.ancho / 2, arte.cy + arte.alto / 2);
  return {
    izq: x0, der: x1, arriba: y0, abajo: y1, ancho: x1 - x0, alto: y1 - y0, escala: s,
  };
}

describe('arte importado de accesorios', () => {
  test('el archivo generado cubre los diseños que el catálogo declara', () => {
    for (const { id, variantes } of CATALOGO_ACCESORIOS_BASE) {
      if (!CON_SVG.includes(id)) {
        expect(TRAZOS_ACCESORIOS[id]).toBeUndefined();
        continue;
      }
      expect(TRAZOS_ACCESORIOS[id]).toHaveLength(variantes);
    }
    expect(Object.keys(TRAZOS_ACCESORIOS).sort()).toEqual([...CON_SVG].sort());
  });

  test('cada variante trae bbox finito y nodos de path con relleno', () => {
    for (const id of CON_SVG) {
      for (const arte of TRAZOS_ACCESORIOS[id]) {
        for (const clave of ['ancho', 'alto', 'cx', 'cy']) {
          expect(Number.isFinite(arte[clave])).toBe(true);
        }
        expect(arte.ancho).toBeGreaterThan(0);
        expect(arte.alto).toBeGreaterThan(0);
        expect(arte.nodos.length).toBeGreaterThan(0);
        for (const nodo of arte.nodos) {
          expect(nodo.t).toBe('path');
          // El importador normaliza a comandos absolutos: M/L/C/Z y nada más.
          expect(nodo.d).toMatch(/^M-?[\d.]/);
          expect(nodo.d).not.toMatch(/[AaHhVvSsQqTtmlcz]/);
          expect(nodo.fill).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
      }
    }
  });

  test('el bbox declarado contiene de verdad a todos los puntos del path', () => {
    for (const id of CON_SVG) {
      for (const arte of TRAZOS_ACCESORIOS[id]) {
        const numeros = arte.nodos
          .flatMap((n) => n.d.match(/-?[\d.]+/g) ?? [])
          .map(Number);
        const xs = numeros.filter((_, i) => i % 2 === 0);
        const ys = numeros.filter((_, i) => i % 2 === 1);
        // 0.1 de tolerancia: el importador redondea a un decimal.
        expect(Math.min(...xs)).toBeGreaterThanOrEqual(arte.cx - arte.ancho / 2 - 0.1);
        expect(Math.max(...xs)).toBeLessThanOrEqual(arte.cx + arte.ancho / 2 + 0.1);
        expect(Math.min(...ys)).toBeGreaterThanOrEqual(arte.cy - arte.alto / 2 - 0.1);
        expect(Math.max(...ys)).toBeLessThanOrEqual(arte.cy + arte.alto / 2 + 0.1);
      }
    }
  });
});

describe('encaje del accesorio sobre la silueta', () => {
  test('ninguna combinación se sale del lienzo de la mascota', () => {
    for (const id of CON_SVG) {
      for (let v = 0; v < variantesDe(id); v += 1) {
        for (const especie of ESPECIES) {
          const [nodo] = dibujarAccesorioBase({ id, especie, variante: v, origen: 'trazo' });
          const caja = cajaEnLienzo(nodo, TRAZOS_ACCESORIOS[id][v]);
          // Márgenes exactos, sin holgura: hoy las 42 combinaciones caen dentro
          // del lienzo, así que un accesorio nuevo que se salga se ve acá.
          expect({ id, especie, fuera: caja.izq < 0 || caja.der > 100 })
            .toEqual({ id, especie, fuera: false });
          expect({ id, especie, fuera: caja.arriba < 0 || caja.abajo > 100 })
            .toEqual({ id, especie, fuera: false });
        }
      }
    }
  });

  test('respeta la caja de diseño: nada más ancho ni más alto de lo declarado', () => {
    for (const id of CON_SVG) {
      for (let v = 0; v < variantesDe(id); v += 1) {
        for (const especie of ESPECIES) {
          const [nodo] = dibujarAccesorioBase({ id, especie, variante: v, origen: 'trazo' });
          const caja = cajaEnLienzo(nodo, TRAZOS_ACCESORIOS[id][v]);
          // scale de la especie llega hasta 1.12, y la caja mayor es 28x23.
          expect(caja.ancho).toBeLessThanOrEqual(28 * 1.12 + 0.5);
          expect(caja.alto).toBeLessThanOrEqual(23 * 1.12 + 0.5);
          expect(caja.ancho).toBeGreaterThan(6);
          expect(caja.alto).toBeGreaterThan(4);
        }
      }
    }
  });

  test('las dos variantes de un diseño quedan a la misma altura de apoyo', () => {
    // No comparten bbox (son siluetas distintas), pero el punto de apoyo sí debe
    // coincidir: un gorro y su variante se calzan igual de hondo en la cabeza.
    for (const id of ['sombrero-fiesta', 'gorrito-noche']) {
      for (const especie of ESPECIES) {
        const cajas = [0, 1].map((v) => {
          const [nodo] = dibujarAccesorioBase({ id, especie, variante: v, origen: 'trazo' });
          return cajaEnLienzo(nodo, TRAZOS_ACCESORIOS[id][v]);
        });
        expect(Math.abs(cajas[0].abajo - cajas[1].abajo)).toBeLessThan(0.6);
      }
    }
  });
});
