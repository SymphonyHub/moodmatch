import crypto from 'crypto';
import { escenaMascota, escenaPlana } from '../mascota/sprites/disenoEtapas';
import { parpados, ROL_RUBOR, centroDe } from '../mascota/sprites/geometria';
import { ESPECIES } from '../mascota/sprites/especies';
import { paletaEtapa } from '../mascota/sprites/paletas';
import { expresiones } from '../mascota/animation/movimiento';

const ETAPAS = [1, 2, 3];
const cada = ESPECIES.flatMap((especie) => ETAPAS.map((etapa) => [especie, etapa]));

// ── Regresión de silueta ────────────────────────────────────────────────────
// Las 7 siluetas ya están aprobadas en dispositivo. Estos hashes se generaron
// con el código ANTERIOR al sistema de expresiones y se verificó que el nuevo
// produce exactamente los mismos: sin expresión, la geometría no se mueve ni un
// decimal. Si este test falla, la silueta cambió — y si el cambio es a
// propósito, hay que regenerar el hash y volver a probar en el teléfono.
const HASH_SILUETA = {
  'polluelo-1': '99db800c2959',
  'polluelo-2': '1f408dccfba2',
  'polluelo-3': '929369a13b75',
  'nutria-lunar-1': 'df7e9923a3c7',
  'nutria-lunar-2': '9269400a10b0',
  'nutria-lunar-3': '4ddeb4c350b7',
  'espiritu-calma-1': 'b25930823eb8',
  'espiritu-calma-2': 'be2e0d1c7eed',
  'espiritu-calma-3': 'cf0340bc7474',
  'pinguino-1': '861571dca297',
  'pinguino-2': '37556d7681b5',
  'pinguino-3': '96552b40ba3f',
  'perro-1': '79510a7cc17b',
  'perro-2': '4e2036693238',
  'perro-3': 'b68521dfe673',
  'dinosaurio-1': 'af1ef25fea00',
  'dinosaurio-2': '4d54b0a65ebe',
  'dinosaurio-3': '1d49c116c924',
  'huevo-1': 'f39c81b5acb5',
  'huevo-2': 'f559ec3e20ff',
  'huevo-3': 'c0f2cd65fb68',
};

const hashDe = (nodos) => crypto
  .createHash('sha256')
  // `rol` es metadato para el rig, no geometría: no entra en el hash.
  .update(JSON.stringify(nodos.map(({ rol, ...n }) => n)))
  .digest('hex')
  .slice(0, 12);

describe('la silueta aprobada no se mueve', () => {
  test.each(cada)('%s etapa %i dibuja exactamente lo mismo que antes', (especie, etapa) => {
    expect(hashDe(escenaPlana({ especie, etapa }))).toBe(HASH_SILUETA[`${especie}-${etapa}`]);
  });

  test('sin expresión no se agrega ni un nodo de gesto', () => {
    for (const [especie, etapa] of cada) {
      expect(escenaMascota({ especie, etapa }).cara.gesto).toEqual([]);
    }
  });
});

// ── Párpados ────────────────────────────────────────────────────────────────
describe('los párpados salen de los ojos de cada especie', () => {
  const FORMAS = ['medio', 'arco', 'ceno'];

  test.each(cada)('%s etapa %i acepta las 3 formas sin romperse', (especie, etapa) => {
    for (const forma of FORMAS) {
      const escena = escenaMascota({ especie, etapa, parpado: forma });
      // Dos ojos → dos trazos, en las 7 especies, sin que ninguna los declare.
      expect(escena.cara.gesto).toHaveLength(2);
      for (const nodo of escena.cara.gesto) {
        expect(nodo.t).toBe('path');
        expect(nodo.d).toMatch(/^M-?\d/);
        // Nada de coordenadas rotas: un NaN acá dibujaría un path vacío.
        expect(nodo.d).not.toMatch(/NaN|undefined/);
      }
    }
  });

  test.each(cada)('%s etapa %i deja el gesto dentro del lienzo', (especie, etapa) => {
    for (const forma of FORMAS) {
      const { cara } = escenaMascota({ especie, etapa, parpado: forma });
      const numeros = cara.gesto.flatMap((n) => n.d.match(/-?\d+(\.\d+)?/g).map(Number));
      for (const v of numeros) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  test('cada forma dibuja algo distinto de las demás', () => {
    const escena = escenaMascota({ especie: 'perro', etapa: 2 });
    const dibujos = FORMAS.map((f) => JSON.stringify(parpados(escena.cara.ojos, f, paletaEtapa(2))));
    expect(new Set(dibujos).size).toBe(FORMAS.length);
  });

  test('sin paleta o sin ojos no inventa nada', () => {
    expect(parpados([], 'medio', paletaEtapa(1))).toEqual([]);
    expect(parpados([{ t: 'ellipse', cx: 50, cy: 40, rx: 3, ry: 3 }], 'medio')).toEqual([]);
    expect(parpados(undefined, 'ninguno', paletaEtapa(1))).toEqual([]);
  });
});

// ── El rubor sale aparte para que el rig pueda modularlo ─────────────────────
describe('el rubor queda en su propio grupo', () => {
  test.each(cada)('%s etapa %i tiene sus dos chapitas marcadas', (especie, etapa) => {
    const { cara } = escenaMascota({ especie, etapa });
    expect(cara.rubor).toHaveLength(2);
    expect(cara.rubor.every((n) => n.rol === ROL_RUBOR)).toBe(true);
    // Y no quedaron duplicadas en el resto de la cara.
    expect(cara.resto.some((n) => n.rol === ROL_RUBOR)).toBe(false);
  });

  test('el centro del rubor cae entre las dos mejillas', () => {
    const { cara } = escenaMascota({ especie: 'huevo', etapa: 1 });
    const centro = centroDe(cara.rubor);
    expect(centro.x).toBeCloseTo(50, 1);
    expect(centro.y).toBeCloseTo(cara.rubor[0].cy, 5);
  });
});

// ── Coherencia del catálogo con la geometría ────────────────────────────────
test('toda expresión del catálogo pide una forma de párpado que existe', () => {
  const FORMAS_VALIDAS = ['ninguno', 'medio', 'arco', 'ceno'];
  for (const [nombre, receta] of Object.entries(expresiones)) {
    expect(FORMAS_VALIDAS).toContain(receta.parpado);
    expect(receta.energia).toBeGreaterThan(0);
    expect(receta.energia).toBeLessThanOrEqual(1);
    expect(receta.ojo).toBeGreaterThan(0);
    expect(receta.rubor).toBeGreaterThan(0);
    // Nada de inclinaciones que den vuelta a la mascota.
    expect(Math.abs(receta.inclinacionDeg)).toBeLessThanOrEqual(5);
    expect(nombre).toMatch(/^[a-z]+$/);
  }
});
