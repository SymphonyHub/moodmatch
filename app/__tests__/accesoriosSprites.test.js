import { ANCLAS, CATALOGO_ACCESORIOS, dibujarAccesorios } from '../mascota/sprites/accesorios';
import { escenaMascota } from '../mascota/sprites/disenoEtapas';
import { ESPECIES } from '../mascota/sprites/especies';
import { paletaEtapa } from '../mascota/sprites/paletas';
// El backend es la autoridad del catálogo y del desbloqueo. Se lee el módulo
// real y no una copia de sus ids: una lista escrita a mano acá se puede olvidar
// de actualizar justo cuando importa, que es cuando el backend cambia.
// eslint-disable-next-line import/no-relative-packages
import { ACCESORIOS as ACCESORIOS_BACKEND } from '../../backend/lib/accesorios';

const idsBackend = (categoria) =>
  ACCESORIOS_BACKEND.filter((a) => a.categoria === categoria).map((a) => a.id).sort();

describe('paridad de accesorios front/back', () => {
  test('el catálogo visual cubre exactamente los ids del backend', () => {
    const porCategoria = { cabeza: [], color: [] };
    for (const a of CATALOGO_ACCESORIOS) porCategoria[a.categoria].push(a.id);
    expect(porCategoria.cabeza.sort()).toEqual(idsBackend('cabeza'));
    expect(porCategoria.color.sort()).toEqual(idsBackend('color'));
  });

  test('la pista de desbloqueo coincide con el nivel que exige el backend', () => {
    for (const a of ACCESORIOS_BACKEND) {
      const visual = CATALOGO_ACCESORIOS.find((v) => v.id === a.id);
      expect(visual).toBeDefined();
      if (typeof a.nivel === 'number') {
        expect(visual.nivel).toBe(a.nivel);
        expect(visual.pista).toBe(`Nivel ${a.nivel} de cariño`);
      } else {
        // Los de hito no anuncian número: la pista describe qué hay que hacer.
        expect(visual.nivel).toBeUndefined();
        expect(visual.pista.length).toBeGreaterThan(0);
      }
    }
  });

  test('cada accesorio de cabeza se dibuja en toda especie', () => {
    for (const id of idsBackend('cabeza')) {
      for (const especie of ESPECIES) {
        const { cabeza } = dibujarAccesorios({ especie, paleta: paletaEtapa(2), cabeza: id });
        expect(cabeza.length).toBeGreaterThan(0);
      }
    }
  });

  test('cada patrón de color se dibuja en toda especie', () => {
    for (const id of idsBackend('color')) {
      for (const especie of ESPECIES) {
        const { color } = dibujarAccesorios({ especie, paleta: paletaEtapa(2), color: id });
        expect(color.length).toBeGreaterThan(0);
      }
    }
  });

  test('un id de color no se equipa en la cabeza ni al revés', () => {
    const r = dibujarAccesorios({
      especie: 'perro', paleta: paletaEtapa(1), cabeza: 'lunares', color: 'lentes-sol',
    });
    expect(r.cabeza).toEqual([]);
    expect(r.color).toEqual([]);
  });

  test('sin accesorios equipados no dibuja overlays', () => {
    const r = dibujarAccesorios({ especie: 'perro', paleta: paletaEtapa(1) });
    expect(r.cabeza).toEqual([]);
    expect(r.color).toEqual([]);
  });
});

// Regresión de un defecto real: la bufanda se dibujaba desde la coronilla con un
// desfase heredado de cuando ese ancla marcaba la cara, y terminaba cruzada sobre
// los ojos —una venda— en las SIETE especies. Lo que se fija acá no es el dibujo
// sino la semántica del punto de apoyo, que es lo que se había perdido.
describe('anclas por especie', () => {
  // El borde inferior del ojo se lee de la escena real, no de una tabla copiada:
  // si una silueta mueve los ojos al pulirla, el test se entera.
  const bordeInferiorOjos = (especie, etapa) => {
    const { cara } = escenaMascota({ especie, etapa });
    const globos = cara.ojos.filter((n) => n.t === 'ellipse' && n.ry != null);
    expect(globos.length).toBeGreaterThan(0);
    return Math.max(...globos.map((o) => o.cy + o.ry));
  };

  test('las siete especies declaran coronilla, cuello y cuerpo', () => {
    expect(Object.keys(ANCLAS).sort()).toEqual([...ESPECIES].sort());
    for (const especie of ESPECIES) {
      const { cabeza, cuello, cuerpo } = ANCLAS[especie];
      expect(cabeza).toHaveLength(2);
      expect(cuello).toHaveLength(2);
      expect(cuerpo).toHaveLength(3);
      for (const valor of [...cabeza, ...cuello, ...cuerpo]) {
        expect(Number.isFinite(valor)).toBe(true);
        expect(valor).toBeGreaterThanOrEqual(0);
        expect(valor).toBeLessThanOrEqual(100);
      }
    }
  });

  test('el cuello va por debajo de la coronilla', () => {
    for (const especie of ESPECIES) {
      const { cabeza, cuello } = ANCLAS[especie];
      expect(cuello[1]).toBeGreaterThan(cabeza[1]);
    }
  });

  test('el cuello queda por debajo de los ojos, con aire para la vuelta', () => {
    // La vuelta de la bufanda se dibuja de cuello-3 a cuello+3; se exige 4 para
    // que no roce el globo del ojo en ninguna etapa.
    for (const especie of ESPECIES) {
      for (const etapa of [1, 2, 3]) {
        expect(ANCLAS[especie].cuello[1] - bordeInferiorOjos(especie, etapa))
          .toBeGreaterThanOrEqual(4);
      }
    }
  });

  test('la coronilla queda por encima de los ojos, para que un gorro no los tape', () => {
    for (const especie of ESPECIES) {
      for (const etapa of [1, 2, 3]) {
        expect(ANCLAS[especie].cabeza[1]).toBeLessThan(bordeInferiorOjos(especie, etapa));
      }
    }
  });

  // El test de arriba fija la tabla; este fija el DIBUJO. Sin él, devolver la
  // bufanda al ancla de coronilla volvería a taparle los ojos sin que nada falle:
  // el ancla de cuello seguiría existiendo, solo que nadie la usaría.
  test('ningún trazo de la bufanda cae sobre los ojos', () => {
    // Todo nodo del dibujo arranca con un `M` absoluto (lo escribe la plantilla
    // con el punto de apoyo ya resuelto), así que el primer par de coordenadas
    // sirve de sonda sin tener que interpretar el resto del path.
    const arranque = (nodo) => (nodo.t === 'path'
      ? Number(/^M(-?[\d.]+),(-?[\d.]+)/.exec(nodo.d)?.[2])
      : nodo.cy);

    for (const especie of ESPECIES) {
      for (const etapa of [1, 2, 3]) {
        const { cabeza } = dibujarAccesorios({
          especie, paleta: paletaEtapa(etapa), cabeza: 'bufanda',
        });
        expect(cabeza.length).toBeGreaterThan(0);
        const ojos = bordeInferiorOjos(especie, etapa);
        for (const nodo of cabeza) {
          const y = arranque(nodo);
          expect(Number.isFinite(y)).toBe(true);
          expect(y).toBeGreaterThan(ojos);
        }
      }
    }
  });

  test('la bufanda declara zona de cuello y el resto no', () => {
    const zonas = Object.fromEntries(CATALOGO_ACCESORIOS.map((a) => [a.id, a.zona]));
    expect(zonas.bufanda).toBe('cuello');
    for (const a of CATALOGO_ACCESORIOS) {
      expect(['cabeza', 'cuello', 'cuerpo']).toContain(a.zona);
      if (a.id !== 'bufanda') expect(a.zona).not.toBe('cuello');
    }
  });
});
