import { ESPECIES, ESPECIE_POR_DEFECTO, dibujarEspecie } from '../mascota/sprites/especies';
import { paletaEtapa, CORAL_SOFT } from '../mascota/sprites/paletas';
import { escenaPlana, escenaMascota } from '../mascota/sprites/disenoEtapas';
import { poseDePersonalidad } from '../mascota/sprites/personalidad';

const TIPOS = ['ellipse', 'circle', 'path'];
const nodosValidos = (nodos) => nodos.every((n) => TIPOS.includes(n.t));
const masasDe = (grupo, gid) => grupo.filter((n) => n.fill === `url(#${gid})`);

// Debe coincidir con backend/lib/especies.js (verificado también allí).
const ESPECIES_ESPERADAS = [
  'polluelo', 'nutria-lunar', 'espiritu-calma', 'pinguino', 'perro', 'dinosaurio', 'huevo',
];
const ESPECIES_CON_PARCHE_CLARO = ESPECIES_ESPERADAS.filter((id) => id !== 'espiritu-calma');

describe('catálogo de siluetas', () => {
  test('expone exactamente las 7 especies acordadas', () => {
    expect(ESPECIES).toEqual(ESPECIES_ESPERADAS);
  });

  test.each(ESPECIES)('%s: dibuja las 3 etapas con cuerpo, ojos y nodos válidos', (especie) => {
    for (const etapa of [1, 2, 3]) {
      const g = dibujarEspecie(especie, etapa, paletaEtapa(etapa));
      expect(g.cuerpo.length).toBeGreaterThan(0);
      expect(g.cara.ojos.length).toBeGreaterThan(0);
      expect(nodosValidos(g.cuerpo)).toBe(true);
      expect(nodosValidos(g.cara.ojos)).toBe(true);
      expect(nodosValidos(g.apendice)).toBe(true);
      expect(nodosValidos(g.contorno ?? [])).toBe(true);
    }
  });

  test('una especie desconocida cae en la por defecto sin romper', () => {
    const g = dibujarEspecie('marciano', 1, paletaEtapa(1));
    const def = dibujarEspecie(ESPECIE_POR_DEFECTO, 1, paletaEtapa(1));
    expect(g.cuerpo.length).toBe(def.cuerpo.length);
  });

  test('la etapa se clampa a 1..3', () => {
    expect(() => dibujarEspecie('huevo', 0, paletaEtapa(0))).not.toThrow();
    expect(() => dibujarEspecie('huevo', 9, paletaEtapa(9))).not.toThrow();
  });
});

// Las reglas de familia del pulido visual (Fase 17) se verifican acá, no se
// confían al ojo: son lo único que impide que las 7 vuelvan a divergir.
describe('reglas de familia', () => {
  test.each(ESPECIES)('%s: declara su gradiente y lo referencia en el cuerpo', (especie) => {
    for (const etapa of [1, 2, 3]) {
      const g = dibujarEspecie(especie, etapa, paletaEtapa(etapa));
      expect(g.defs).toHaveLength(1);
      expect(g.defs[0].t).toBe('grad');
      expect(masasDe(g.cuerpo, g.defs[0].id).length).toBeGreaterThan(0);
    }
  });

  test('el id del gradiente distingue especie y etapa', () => {
    const ids = new Set();
    for (const especie of ESPECIES) {
      for (const etapa of [1, 2, 3]) ids.add(dibujarEspecie(especie, etapa, paletaEtapa(etapa)).defs[0].id);
    }
    expect(ids.size).toBe(ESPECIES.length * 3);
  });

  test.each(ESPECIES)('%s: toda masa lleva el mismo contorno tonal', (especie) => {
    for (const etapa of [1, 2, 3]) {
      const P = paletaEtapa(etapa);
      const g = dibujarEspecie(especie, etapa, P);
      for (const m of masasDe(g.cuerpo, g.defs[0].id)) {
        const separado = (g.contorno ?? []).find((n) => n.d === m.d);
        const borde = separado ?? m;
        expect(borde.stroke).toBe(P.tonal);
        expect(borde.strokeWidth).toBe(1.8);
      }
    }
  });

  test.each(ESPECIES)('%s: la masa adulta es opaca y no deja contornos cerrados huérfanos', (especie) => {
    const g = dibujarEspecie(especie, 3, paletaEtapa(3));
    for (const m of masasDe(g.cuerpo, g.defs[0].id)) {
      expect(m.opacity ?? 1).toBe(1);
    }
    const cerradosSinRelleno = g.cuerpo.filter(
      (n) => n.t === 'path' && n.fill === 'none' && /Z\s*$/i.test(n.d),
    );
    expect(cerradosSinRelleno).toEqual([]);
  });

  test.each(ESPECIES_CON_PARCHE_CLARO)('%s: el parche claro adulto es sólido', (especie) => {
    const P = paletaEtapa(3);
    const parches = dibujarEspecie(especie, 3, P).cuerpo.filter((n) => n.fill === P.belly);
    expect(parches.length).toBeGreaterThan(0);
    expect(parches.every((n) => (n.opacity ?? 1) === 1)).toBe(true);
  });

  test.each(ESPECIES)('%s: lleva rubor y ojos con brillo', (especie) => {
    const g = dibujarEspecie(especie, 1, paletaEtapa(1));
    expect(g.cara.resto.some((n) => n.fill === CORAL_SOFT && n.opacity === 0.7)).toBe(true);
    expect(g.cara.ojos.filter((n) => n.fill === '#FFFFFF').length).toBeGreaterThanOrEqual(2);
  });

  test('ninguna silueta se sale del lienzo de 100×100', () => {
    for (const especie of ESPECIES) {
      for (const etapa of [1, 2, 3]) {
        const nodos = escenaPlana({ especie, etapa });
        for (const nodo of nodos) {
          if (nodo.rx != null) {
            expect(nodo.cx - nodo.rx).toBeGreaterThanOrEqual(-1);
            expect(nodo.cx + nodo.rx).toBeLessThanOrEqual(101);
          }
          if (typeof nodo.d === 'string') {
            for (const [, x, y] of nodo.d.matchAll(/[MLCQ]\s?(-?[\d.]+),(-?[\d.]+)/g)) {
              expect(Number(x)).toBeGreaterThanOrEqual(-1);
              expect(Number(x)).toBeLessThanOrEqual(101);
              expect(Number(y)).toBeGreaterThanOrEqual(-1);
              expect(Number(y)).toBeLessThanOrEqual(101);
            }
          }
        }
      }
    }
  });
});

describe('escena compuesta', () => {
  test('escenaPlana abre con las definiciones y sigue con formas dibujables', () => {
    const nodos = escenaPlana({ especie: 'perro', etapa: 2 });
    expect(Array.isArray(nodos)).toBe(true);
    expect(nodos.length).toBeGreaterThan(0);
    expect(nodos[0].t).toBe('grad');
    expect(nodosValidos(nodos.slice(1))).toBe(true);
  });

  test('el accesorio de color va en el cuerpo y el de cabeza al frente', () => {
    const sin = escenaMascota({ especie: 'perro', etapa: 3 });
    const con = escenaMascota({
      especie: 'perro', etapa: 3, accesorioCabeza: 'corona', accesorioColor: 'lunares',
    });
    expect(con.frente.length).toBeGreaterThan(0); // corona
    expect(con.cuerpo.length).toBeGreaterThan(sin.cuerpo.length); // + lunares
  });

  test('el pingüino adulto ordena base, guatita, rostro y contorno exterior', () => {
    const P = paletaEtapa(3);
    const plano = escenaPlana({ especie: 'pinguino', etapa: 3 });
    const gid = plano[0].id;
    const rellenoIndex = plano.findIndex((n) => n.fill === `url(#${gid})`);
    const relleno = plano[rellenoIndex];
    const baseIndex = plano.findIndex(
      (n) => n.t === 'path' && n.d === relleno.d && n.fill === P.body,
    );
    const guatitaIndex = plano.findIndex((n) => n.fill === P.belly);
    const rostroIndex = plano.findIndex(
      (n) => n.t === 'ellipse' && n.cy === 40 && n.fill === P.ink,
    );
    const contornoIndex = plano.findIndex(
      (n) => n.t === 'path' && n.d === relleno.d && n.fill === 'none',
    );

    expect(plano[baseIndex].opacity).toBeUndefined();
    expect(plano[guatitaIndex].opacity ?? 1).toBe(1);
    expect(baseIndex).toBeLessThan(rellenoIndex);
    expect(rellenoIndex).toBeLessThan(guatitaIndex);
    expect(guatitaIndex).toBeLessThan(rostroIndex);
    expect(rostroIndex).toBeLessThan(contornoIndex);
    expect(plano[contornoIndex]).toMatchObject({
      stroke: P.tonal, strokeWidth: 1.8, fill: 'none',
    });
    expect(plano.some((n) => n.stroke === P.deep && n.d?.includes('Q50,59'))).toBe(false);
  });
});

describe('personalidad → pose', () => {
  test('cada arquetipo modula la pose; desconocido cae en curiosa', () => {
    expect(poseDePersonalidad('más animada').rebote).toBeGreaterThan(1);
    expect(poseDePersonalidad('más tranquila').rebote).toBeLessThan(1);
    expect(poseDePersonalidad('lo-que-sea')).toEqual(poseDePersonalidad('curiosa'));
  });
});
