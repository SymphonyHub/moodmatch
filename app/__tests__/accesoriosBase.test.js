import { CATALOGO_ACCESORIOS } from '../mascota/sprites/accesorios';
import {
  ACCESORIOS_BASE_EQUIPABLES,
  CATALOGO_ACCESORIOS_BASE,
  accesorioBase,
  dibujarAccesorioBase,
  dibujarAccesorioEquipable,
  esAccesorioBase,
  varianteValida,
  variantesDe,
} from '../mascota/sprites/accesorios/catalogoBase';
import { ESPECIES } from '../mascota/sprites/especies';
import { paletaEtapa } from '../mascota/sprites/paletas';
import {
  IDS_ACCESORIOS_BASE,
  POSICIONES_ACCESORIOS,
  posicionAccesorio,
} from '../mascota/sprites/posicionAccesorios';

const DISENOS = ['lentes-sol', 'sombrero-fiesta', 'gorrito-noche', 'lazo'];
const TIPOS_SVG = ['circle', 'ellipse', 'path'];

describe('catálogo de diseños base', () => {
  test('declara los cuatro diseños y sus posiciones por especie', () => {
    expect(IDS_ACCESORIOS_BASE).toEqual(DISENOS);
    expect(CATALOGO_ACCESORIOS_BASE.map((item) => item.id)).toEqual(DISENOS);
  });

  test('cada especie define x, y y escala para cada diseño', () => {
    expect(Object.keys(POSICIONES_ACCESORIOS).sort()).toEqual([...ESPECIES].sort());
    for (const especie of ESPECIES) {
      expect(Object.keys(POSICIONES_ACCESORIOS[especie]).sort()).toEqual([...DISENOS].sort());
      for (const id of DISENOS) {
        const pos = posicionAccesorio(especie, id);
        expect(pos).toEqual(expect.objectContaining({
          x: expect.any(Number), y: expect.any(Number), scale: expect.any(Number),
        }));
        expect(pos.x).toBeGreaterThanOrEqual(0);
        expect(pos.x).toBeLessThanOrEqual(100);
        expect(pos.y).toBeGreaterThanOrEqual(0);
        expect(pos.y).toBeLessThanOrEqual(100);
        // Cota de cordura, no de diseño: atrapa un 0 o un 12 por dedazo. El
        // piso baja a 0.6 porque el lazo del pingüino va a 0.64 a propósito
        // (cabeza angosta y ojos altos; al tamaño de las demás caía en el ojo).
        expect(pos.scale).toBeGreaterThan(0.6);
        expect(pos.scale).toBeLessThan(1.3);
      }
    }
  });

  test('varianteValida cae a 0 fuera de rango y respeta las que existen', () => {
    expect(variantesDe('lentes-sol')).toBe(2);
    expect(variantesDe('lazo')).toBe(1);
    expect(variantesDe('no-existe')).toBe(1);
    expect(varianteValida('lentes-sol', 1)).toBe(1);
    expect(varianteValida('lentes-sol', 2)).toBe(0);
    expect(varianteValida('lazo', 1)).toBe(0);
    expect(varianteValida('lentes-sol', -1)).toBe(0);
    expect(varianteValida('lentes-sol', 'x')).toBe(0);
  });
});

describe('dibujo en código (origen "codigo")', () => {
  // Es la salida de emergencia si el arte importado no funciona sobre la
  // silueta: tiene que seguir produciendo geometría válida y contenida.
  test.each(DISENOS)('%s produce nodos SVG planos y dentro del lienzo', (id) => {
    for (const especie of ESPECIES) {
      for (const etapa of [1, 2, 3]) {
        const nodos = dibujarAccesorioBase({
          id, especie, paleta: paletaEtapa(etapa), origen: 'codigo',
        });
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
});

describe('variantes de color', () => {
  // El origen 'codigo' resuelve por id de DISEÑO, así que si el dibujante no
  // mira la variante, "Lentes dorados" sale idéntico a "Lentes redondos" y el
  // vestidor muestra dos casillas iguales. Pasó al cambiar ORIGEN_POR_DEFECTO.
  test.each([
    ['lentes-sol', 'lentes-sol-b'],
    ['sombrero-fiesta', 'sombrero-fiesta-b'],
    ['gorrito-noche', 'gorrito-noche-b'],
  ])('%s y %s se dibujan distinto', (base, alterna) => {
    for (const especie of ESPECIES) {
      const a = dibujarAccesorioEquipable({ id: base, especie });
      const b = dibujarAccesorioEquipable({ id: alterna, especie });
      expect(a.length).toBeGreaterThan(0);
      expect(JSON.stringify(b)).not.toEqual(JSON.stringify(a));
    }
  });
});

describe('dibujo desde arte importado (origen "trazo")', () => {
  test('los tres diseños con SVG salen como UN grupo con transform', () => {
    for (const id of ['lentes-sol', 'sombrero-fiesta', 'gorrito-noche']) {
      for (const especie of ESPECIES) {
        for (let v = 0; v < variantesDe(id); v += 1) {
          const nodos = dibujarAccesorioBase({ id, especie, variante: v, origen: 'trazo' });
          expect(nodos).toHaveLength(1);
          expect(nodos[0].t).toBe('g');
          expect(nodos[0].transform).toMatch(/^translate\(.+\) scale\(.+\) translate\(.+\)$/);
          expect(nodos[0].transform).not.toMatch(/NaN|Infinity/);
          expect(nodos[0].hijos.length).toBeGreaterThan(0);
          for (const hijo of nodos[0].hijos) {
            expect(hijo.t).toBe('path');
            expect(hijo.d).toMatch(/^M-?\d/);
            expect(hijo.fill).toMatch(/^#[0-9A-Fa-f]{6}$/);
          }
        }
      }
    }
  });

  test('el lazo no tiene SVG de origen, así que cae al dibujo en código', () => {
    const nodos = dibujarAccesorioBase({ id: 'lazo', especie: 'perro', origen: 'trazo' });
    expect(nodos.length).toBeGreaterThanOrEqual(5);
    expect(nodos.every((n) => TIPOS_SVG.includes(n.t))).toBe(true);
  });
});

describe('catálogo equipable base', () => {
  test('cada id equipable apunta a un diseño y una variante que existen', () => {
    for (const item of ACCESORIOS_BASE_EQUIPABLES) {
      expect(DISENOS).toContain(item.diseno);
      expect(item.variante).toBeLessThan(variantesDe(item.diseno));
      expect(item.nombre.length).toBeGreaterThan(0);
      expect(item.descripcion.length).toBeGreaterThan(0);
    }
  });

  test('cubre las seis piezas de arte importado más el lazo, sin repetir', () => {
    const ids = ACCESORIOS_BASE_EQUIPABLES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    const pares = ACCESORIOS_BASE_EQUIPABLES.map((a) => `${a.diseno}#${a.variante}`);
    expect(new Set(pares).size).toBe(pares.length);
    expect(ids).toHaveLength(7);
  });

  test('todos entran al catálogo equipable general como accesorios de cabeza', () => {
    for (const item of ACCESORIOS_BASE_EQUIPABLES) {
      const visual = CATALOGO_ACCESORIOS.find((a) => a.id === item.id);
      expect(visual).toBeDefined();
      expect(visual.categoria).toBe('cabeza');
      expect(esAccesorioBase(item.id)).toBe(true);
    }
    expect(esAccesorioBase('corona')).toBe(false);
    expect(esAccesorioBase(null)).toBe(false);
  });

  test('cada id equipable dibuja algo en las 7 especies', () => {
    for (const item of ACCESORIOS_BASE_EQUIPABLES) {
      for (const especie of ESPECIES) {
        expect(dibujarAccesorioEquipable({ id: item.id, especie }).length).toBeGreaterThan(0);
      }
    }
  });

  test('accesorioBase resuelve por id y devuelve null si no existe', () => {
    expect(accesorioBase('lentes-sol-b')).toEqual(
      expect.objectContaining({ diseno: 'lentes-sol', variante: 1 }),
    );
    expect(accesorioBase('corona')).toBeNull();
  });
});

describe('entradas inválidas', () => {
  test('tolera especie desconocida y rechaza ids fuera del catálogo', () => {
    expect(posicionAccesorio('desconocida', 'lentes-sol'))
      .toEqual(POSICIONES_ACCESORIOS.polluelo['lentes-sol']);
    expect(posicionAccesorio('perro', 'no-existe')).toBeNull();
    expect(dibujarAccesorioBase({ id: 'no-existe', especie: 'perro' })).toEqual([]);
    expect(dibujarAccesorioEquipable({ id: 'no-existe', especie: 'perro' })).toEqual([]);
    // Un id de DISEÑO no es equipable por sí solo si no está en la lista.
    expect(dibujarAccesorioEquipable({ id: 'sombrero-fiesta-z', especie: 'perro' })).toEqual([]);
  });
});
