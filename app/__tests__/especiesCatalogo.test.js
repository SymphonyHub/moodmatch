import {
  ESPECIES, especiePorId, nombreEspecie, emojiEspecie,
} from '../mascota/especiesCatalogo';

describe('catálogo de especies (provisional)', () => {
  test('tiene las 7 especies del catálogo cerrado', () => {
    expect(ESPECIES).toHaveLength(7);
  });

  test('cada especie tiene id, nombre y emoji únicos', () => {
    const ids = ESPECIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    ESPECIES.forEach((e) => {
      expect(typeof e.id).toBe('string');
      expect(e.id.length).toBeGreaterThan(0);
      expect(typeof e.nombre).toBe('string');
      expect(typeof e.emoji).toBe('string');
    });
  });

  test('resuelve nombre y emoji por id, con fallback seguro', () => {
    expect(especiePorId('polluelo')?.nombre).toBe('Polluelo');
    expect(nombreEspecie('nutria-lunar')).toBe('Nutria lunar');
    expect(nombreEspecie('inexistente')).toBe('Mascota');
    expect(emojiEspecie('inexistente')).toBe('🐾');
    expect(especiePorId('inexistente')).toBeNull();
  });
});
