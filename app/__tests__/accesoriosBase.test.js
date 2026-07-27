import { CATALOGO_ACCESORIOS } from '../mascota/sprites/accesorios';
import {
  CATALOGO_ACCESORIOS_BASE,
  dibujarAccesorioBase,
} from '../mascota/sprites/accesorios/catalogoBase';
import { ESPECIES } from '../mascota/sprites/especies';
import { paletaEtapa } from '../mascota/sprites/paletas';
import {
  IDS_ACCESORIOS_BASE,
  POSICIONES_ACCESORIOS,
  posicionAccesorio,
} from '../mascota/sprites/posicionAccesorios';

const IDS_ESPERADOS = ['lentes-sol', 'sombrero-fiesta', 'gorrito-noche', 'lazo'];
const TIPOS_SVG = ['circle', 'ellipse', 'path'];

describe('catálogo visual base de accesorios', () => {
  test('declara los cuatro diseños pedidos sin habilitarlos en el catálogo equipable', () => {
    expect(IDS_ACCESORIOS_BASE).toEqual(IDS_ESPERADOS);
    expect(CATALOGO_ACCESORIOS_BASE.map((item) => item.id)).toEqual(IDS_ESPERADOS);

    const equipables = CATALOGO_ACCESORIOS.map((item) => item.id);
    for (const id of IDS_ESPERADOS) expect(equipables).not.toContain(id);
  });

  test('cada especie define x, y y escala para cada accesorio', () => {
    expect(Object.keys(POSICIONES_ACCESORIOS).sort()).toEqual([...ESPECIES].sort());
    for (const especie of ESPECIES) {
      expect(Object.keys(POSICIONES_ACCESORIOS[especie]).sort()).toEqual([...IDS_ESPERADOS].sort());
      for (const id of IDS_ESPERADOS) {
        const pos = posicionAccesorio(especie, id);
        expect(pos).toEqual(expect.objectContaining({
          x: expect.any(Number), y: expect.any(Number), scale: expect.any(Number),
        }));
        expect(pos.x).toBeGreaterThanOrEqual(0);
        expect(pos.x).toBeLessThanOrEqual(100);
        expect(pos.y).toBeGreaterThanOrEqual(0);
        expect(pos.y).toBeLessThanOrEqual(100);
        expect(pos.scale).toBeGreaterThan(0.7);
        expect(pos.scale).toBeLessThan(1.3);
      }
    }
  });

  test.each(IDS_ESPERADOS)('%s produce nodos SVG válidos en las 7 especies', (id) => {
    for (const especie of ESPECIES) {
      for (const etapa of [1, 2, 3]) {
        const nodos = dibujarAccesorioBase({ id, especie, paleta: paletaEtapa(etapa) });
        expect(nodos.length).toBeGreaterThanOrEqual(5);
        for (const nodo of nodos) {
          expect(TIPOS_SVG).toContain(nodo.t);
          expect(JSON.stringify(nodo)).not.toMatch(/NaN|undefined/);
          for (const valor of Object.values(nodo)) {
            if (typeof valor === 'number') expect(Number.isFinite(valor)).toBe(true);
          }
          if (nodo.t === 'path') {
            expect(typeof nodo.d).toBe('string');
            expect(nodo.d).toMatch(/^M-?\d/);
          }
          if (nodo.t === 'circle') expect(nodo.r).toBeGreaterThan(0);
          if (nodo.t === 'ellipse') {
            expect(nodo.rx).toBeGreaterThan(0);
            expect(nodo.ry).toBeGreaterThan(0);
          }
          if (nodo.cx != null) {
            const rx = nodo.rx ?? nodo.r ?? 0;
            const ry = nodo.ry ?? nodo.r ?? 0;
            const borde = (nodo.strokeWidth ?? 0) / 2;
            expect(nodo.cx - rx - borde).toBeGreaterThanOrEqual(-1);
            expect(nodo.cx + rx + borde).toBeLessThanOrEqual(101);
            expect(nodo.cy - ry - borde).toBeGreaterThanOrEqual(-1);
            expect(nodo.cy + ry + borde).toBeLessThanOrEqual(101);
          }
        }
      }
    }
  });

  test('tolera especie desconocida y rechaza ids fuera del catálogo visual', () => {
    expect(posicionAccesorio('desconocida', 'lentes-sol'))
      .toEqual(POSICIONES_ACCESORIOS.polluelo['lentes-sol']);
    expect(posicionAccesorio('perro', 'no-existe')).toBeNull();
    expect(dibujarAccesorioBase({ id: 'no-existe', especie: 'perro' })).toEqual([]);
  });
});
