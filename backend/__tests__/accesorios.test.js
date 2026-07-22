const {
  ACCESORIOS, CATEGORIAS, derivarDesbloqueados, puedeEquipar,
} = require('../lib/accesorios');

describe('catálogo de accesorios', () => {
  test('cada accesorio es de una categoría válida y tiene una regla de desbloqueo', () => {
    for (const a of ACCESORIOS) {
      expect(CATEGORIAS).toContain(a.categoria);
      expect(typeof a.nivel === 'number' || typeof a.hito === 'string').toBe(true);
    }
  });
});

describe('derivarDesbloqueados', () => {
  test('nivel 0 sin hitos: nada desbloqueado', () => {
    expect(derivarDesbloqueados(0, [])).toEqual([]);
  });

  test('desbloquea por umbral de nivel de cariño', () => {
    const en12 = derivarDesbloqueados(12, []);
    expect(en12).toContain('gorrito'); // nivel 6
    expect(en12).toContain('lunares'); // nivel 10
    expect(en12).not.toContain('bufanda'); // nivel 16
    expect(en12).not.toContain('corona'); // nivel 36
  });

  test('la flor se desbloquea por el hito de completar un reto', () => {
    const sinReto = derivarDesbloqueados(50, [{ hito: 'Ahora se llama Nube' }]);
    expect(sinReto).not.toContain('flor');
    const conReto = derivarDesbloqueados(50, [{ hito: 'Completaron un reto y llegaron a 20 cariño' }]);
    expect(conReto).toContain('flor');
  });

  test('tolera historial no-array', () => {
    expect(() => derivarDesbloqueados(40, null)).not.toThrow();
  });
});

describe('puedeEquipar', () => {
  const desbloqueados = ['gorrito', 'lunares'];
  test('acepta un id desbloqueado de la categoría correcta', () => {
    expect(puedeEquipar('gorrito', 'cabeza', desbloqueados)).toBe(true);
    expect(puedeEquipar('lunares', 'color', desbloqueados)).toBe(true);
  });
  test('rechaza id no desbloqueado, categoría equivocada o inexistente', () => {
    expect(puedeEquipar('corona', 'cabeza', desbloqueados)).toBe(false); // no desbloqueado
    expect(puedeEquipar('gorrito', 'color', desbloqueados)).toBe(false); // categoría equivocada
    expect(puedeEquipar('inexistente', 'cabeza', desbloqueados)).toBe(false);
  });
  test('null (desequipar) siempre es válido', () => {
    expect(puedeEquipar(null, 'cabeza', desbloqueados)).toBe(true);
    expect(puedeEquipar(null, 'color', [])).toBe(true);
  });
});
