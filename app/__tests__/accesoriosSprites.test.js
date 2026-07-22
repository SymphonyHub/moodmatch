import { CATALOGO_ACCESORIOS, dibujarAccesorios } from '../mascota/sprites/accesorios';
import { ESPECIES } from '../mascota/sprites/especies';
import { paletaEtapa } from '../mascota/sprites/paletas';

// Ids que el backend puede desbloquear (backend/lib/accesorios.js ACCESORIOS).
// El frontend DEBE saber renderizar todos: si el backend agrega uno, este test
// falla hasta que el catálogo visual lo cubra (paridad front/back).
const IDS_BACKEND = {
  cabeza: ['gorrito', 'bufanda', 'corona', 'flor'],
  color: ['lunares', 'estrellas', 'aura'],
};

describe('paridad de accesorios front/back', () => {
  test('el catálogo visual cubre exactamente los ids del backend', () => {
    const porCategoria = { cabeza: [], color: [] };
    for (const a of CATALOGO_ACCESORIOS) porCategoria[a.categoria].push(a.id);
    expect(porCategoria.cabeza.sort()).toEqual([...IDS_BACKEND.cabeza].sort());
    expect(porCategoria.color.sort()).toEqual([...IDS_BACKEND.color].sort());
  });

  test('cada accesorio de cabeza se dibuja en toda especie', () => {
    for (const id of IDS_BACKEND.cabeza) {
      for (const especie of ESPECIES) {
        const { cabeza } = dibujarAccesorios({ especie, paleta: paletaEtapa(2), cabeza: id });
        expect(cabeza.length).toBeGreaterThan(0);
      }
    }
  });

  test('cada patrón de color se dibuja en toda especie', () => {
    for (const id of IDS_BACKEND.color) {
      for (const especie of ESPECIES) {
        const { color } = dibujarAccesorios({ especie, paleta: paletaEtapa(2), color: id });
        expect(color.length).toBeGreaterThan(0);
      }
    }
  });

  test('sin accesorios equipados no dibuja overlays', () => {
    const r = dibujarAccesorios({ especie: 'perro', paleta: paletaEtapa(1) });
    expect(r.cabeza).toEqual([]);
    expect(r.color).toEqual([]);
  });
});
