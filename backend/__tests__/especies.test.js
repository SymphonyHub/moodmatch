const { ESPECIES, derivarEspecie } = require('../lib/especies');

// Debe coincidir con app/mascota/sprites/especies.js (ESPECIES). Si cambia el
// catálogo, actualizar ambos lados y esta lista.
const ESPECIES_ESPERADAS = [
  'polluelo', 'nutria-lunar', 'espiritu-calma', 'pinguino', 'perro', 'dinosaurio', 'huevo',
];

describe('catálogo de especies', () => {
  test('son exactamente las 7 especies acordadas, en orden', () => {
    expect(ESPECIES).toEqual(ESPECIES_ESPERADAS);
  });

  test('derivarEspecie es estable por amistad y siempre dentro del catálogo', () => {
    for (let id = 1; id <= 50; id += 1) {
      const especie = derivarEspecie(id);
      expect(ESPECIES).toContain(especie);
      expect(derivarEspecie(id)).toBe(especie); // determinista
    }
  });

  test('reparte entre varias especies (no todas caen en la misma)', () => {
    const vistas = new Set();
    for (let id = 1; id <= 40; id += 1) vistas.add(derivarEspecie(id));
    expect(vistas.size).toBeGreaterThan(3);
  });

  test('ids inválidos caen en la primera especie sin romper', () => {
    expect(derivarEspecie(0)).toBe(ESPECIES[0]);
    expect(derivarEspecie(-3)).toBe(ESPECIES[0]);
    expect(derivarEspecie('x')).toBe(ESPECIES[0]);
  });
});
