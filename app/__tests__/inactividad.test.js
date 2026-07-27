import { planInactividad, GESTOS } from '../mascota/animation/inactividad';
import { inactividad, mohin } from '../mascota/animation/movimiento';

const azarFijo = (...valores) => {
  let i = 0;
  return () => valores[Math.min(i++, valores.length - 1)];
};

describe('cada cuánto hace algo sola', () => {
  test('el primer gesto llega pronto', () => {
    const { esperaMs } = planInactividad(0, azarFijo(0.5));
    expect(esperaMs).toBe(inactividad.primeraMs);
  });

  test('las esperas crecen: no insiste', () => {
    const sinJitter = azarFijo(0.5);
    const esperas = [0, 1, 2, 3].map((v) => planInactividad(v, sinJitter).esperaMs);
    for (let i = 1; i < esperas.length; i += 1) {
      expect(esperas[i]).toBeGreaterThan(esperas[i - 1]);
    }
  });

  test('las esperas tienen techo: nunca se va a horas', () => {
    for (const vuelta of [10, 50, 999]) {
      const { esperaMs } = planInactividad(vuelta, azarFijo(0.5));
      expect(esperaMs).toBeLessThanOrEqual(inactividad.maxMs);
    }
    // Y el techo es alto de verdad, no un intervalo corto disfrazado.
    expect(inactividad.maxMs).toBeGreaterThan(inactividad.primeraMs * 3);
  });

  test('el jitter mueve la espera sin desbocarla', () => {
    const corta = planInactividad(0, azarFijo(0)).esperaMs;
    const larga = planInactividad(0, azarFijo(1)).esperaMs;
    expect(corta).toBeLessThan(inactividad.primeraMs);
    expect(larga).toBeGreaterThan(inactividad.primeraMs);
    expect(corta).toBeGreaterThan(inactividad.primeraMs * (1 - inactividad.jitter - 0.01));
    expect(larga).toBeLessThan(inactividad.primeraMs * (1 + inactividad.jitter + 0.01));
  });

  test('una vuelta inválida no rompe el temporizador', () => {
    for (const v of [undefined, null, NaN, -3, 'tres']) {
      const { esperaMs } = planInactividad(v, azarFijo(0.5));
      expect(Number.isFinite(esperaMs)).toBe(true);
      expect(esperaMs).toBeGreaterThan(0);
    }
  });
});

describe('qué gesto hace', () => {
  test('elige de los tres del pool', () => {
    for (const u of [0, 0.4, 0.7, 0.999]) {
      expect(GESTOS).toContain(planInactividad(0, azarFijo(0.5, u)).gesto);
    }
  });

  test('con el tiempo los usa todos, no siempre el mismo', () => {
    const vistos = new Set(
      Array.from({ length: 200 }, () => planInactividad(0).gesto),
    );
    expect(vistos.size).toBe(GESTOS.length);
  });
});

describe('tono: el gesto acompaña, no reclama', () => {
  test('el pool son gestos tranquilos, sin nada de llamar la atención', () => {
    // Si alguien agrega un gesto nuevo, que tenga que pensar dos veces si encaja.
    expect(GESTOS).toEqual(['estirarse', 'bostezar', 'vistazo']);
  });

  test('el primer gesto tarda lo suficiente como para no interrumpir', () => {
    expect(inactividad.primeraMs).toBeGreaterThanOrEqual(12000);
  });

  test('el mohín necesita varios toques seguidos, no uno solo', () => {
    expect(mohin.toques).toBeGreaterThanOrEqual(3);
    expect(mohin.ventanaMs).toBeLessThanOrEqual(4000);
  });
});
