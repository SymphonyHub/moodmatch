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

  test('no hay ids repetidos', () => {
    const ids = ACCESORIOS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('el catálogo base entra como accesorios de cabeza desbloqueables por nivel', () => {
    const base = [
      'lazo', 'lentes-sol', 'sombrero-fiesta', 'lentes-sol-b',
      'gorrito-noche', 'sombrero-fiesta-b', 'gorrito-noche-b',
    ];
    for (const id of base) {
      const a = ACCESORIOS.find((x) => x.id === id);
      expect(a).toBeDefined();
      expect(a.categoria).toBe('cabeza');
      expect(typeof a.nivel).toBe('number');
      expect(a.nivel).toBeGreaterThan(0);
    }
  });

  test('los niveles reparten el catálogo en vez de amontonarlo', () => {
    // Que no haya dos accesorios pidiendo el mismo nivel: cada subida de nivel
    // que desbloquea algo desbloquea UNA cosa, y se lee como una recompensa.
    const niveles = ACCESORIOS.filter((a) => typeof a.nivel === 'number').map((a) => a.nivel);
    expect(new Set(niveles).size).toBe(niveles.length);
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

  test('el catálogo base se va abriendo con el nivel', () => {
    expect(derivarDesbloqueados(3, [])).not.toContain('lazo'); // nivel 4
    expect(derivarDesbloqueados(4, [])).toContain('lazo');

    const en12 = derivarDesbloqueados(12, []);
    expect(en12).toContain('lentes-sol'); // nivel 8
    expect(en12).toContain('sombrero-fiesta'); // nivel 12
    expect(en12).not.toContain('lentes-sol-b'); // nivel 18
    expect(en12).not.toContain('gorrito-noche'); // nivel 20

    const en30 = derivarDesbloqueados(30, []);
    expect(en30).toContain('gorrito-noche-b'); // nivel 30
    expect(en30).not.toContain('corona'); // nivel 36
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

  test('una variante no se cuela por tener desbloqueada la otra', () => {
    // 'lentes-sol' y 'lentes-sol-b' son el mismo dibujo en dos colores, pero
    // cada uno se gana por separado: el sufijo no es un alias.
    const soloBase = derivarDesbloqueados(8, []);
    expect(puedeEquipar('lentes-sol', 'cabeza', soloBase)).toBe(true);
    expect(puedeEquipar('lentes-sol-b', 'cabeza', soloBase)).toBe(false);
  });
});
