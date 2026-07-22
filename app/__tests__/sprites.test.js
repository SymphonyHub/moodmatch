import { ESPECIES, ESPECIE_POR_DEFECTO, dibujarEspecie } from '../mascota/sprites/especies';
import { paletaEtapa } from '../mascota/sprites/paletas';
import { escenaPlana, escenaMascota } from '../mascota/sprites/disenoEtapas';
import { poseDePersonalidad } from '../mascota/sprites/personalidad';

const TIPOS = ['ellipse', 'circle', 'path'];
const nodosValidos = (nodos) => nodos.every((n) => TIPOS.includes(n.t));

// Debe coincidir con backend/lib/especies.js (verificado también allí).
const ESPECIES_ESPERADAS = [
  'polluelo', 'nutria-lunar', 'espiritu-calma', 'pinguino', 'perro', 'dinosaurio', 'huevo',
];

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

describe('escena compuesta', () => {
  test('escenaPlana devuelve una lista de nodos válidos en orden', () => {
    const nodos = escenaPlana({ especie: 'perro', etapa: 2 });
    expect(Array.isArray(nodos)).toBe(true);
    expect(nodos.length).toBeGreaterThan(0);
    expect(nodosValidos(nodos)).toBe(true);
  });

  test('el accesorio de color va en el cuerpo y el de cabeza al frente', () => {
    const sin = escenaMascota({ especie: 'perro', etapa: 3 });
    const con = escenaMascota({
      especie: 'perro', etapa: 3, accesorioCabeza: 'corona', accesorioColor: 'lunares',
    });
    expect(con.frente.length).toBeGreaterThan(0); // corona
    expect(con.cuerpo.length).toBeGreaterThan(sin.cuerpo.length); // + lunares
  });
});

describe('personalidad → pose', () => {
  test('cada arquetipo modula la pose; desconocido cae en curiosa', () => {
    expect(poseDePersonalidad('más animada').rebote).toBeGreaterThan(1);
    expect(poseDePersonalidad('más tranquila').rebote).toBeLessThan(1);
    expect(poseDePersonalidad('lo-que-sea')).toEqual(poseDePersonalidad('curiosa'));
  });
});
