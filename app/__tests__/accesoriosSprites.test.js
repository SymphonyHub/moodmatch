import { CATALOGO_ACCESORIOS, dibujarAccesorios } from '../mascota/sprites/accesorios';
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
