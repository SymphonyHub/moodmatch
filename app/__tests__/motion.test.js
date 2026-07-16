import { durations, easings, springs, PRESS_SCALE, STAGGER_MS } from '../theme/motion';

describe('lenguaje de movimiento', () => {
  test('duraciones calmas y ordenadas (regla: nada > 400 ms)', () => {
    expect(durations.quick).toBeLessThan(durations.base);
    expect(durations.base).toBeLessThan(durations.gentle);
    expect(durations.gentle).toBeLessThanOrEqual(400);
  });

  test('easings son funciones de curva válidas', () => {
    for (const easing of Object.values(easings)) {
      expect(typeof easing).toBe('function');
      expect(easing(0)).toBeCloseTo(0, 5);
      expect(easing(1)).toBeCloseTo(1, 5);
    }
  });

  test('el spring de presión asienta sin rebote fuerte y la escala es sutil', () => {
    expect(springs.press.damping).toBeGreaterThanOrEqual(15);
    expect(PRESS_SCALE).toBeGreaterThan(0.9);
    expect(PRESS_SCALE).toBeLessThan(1);
  });

  test('el spring de desbloqueo también asienta sin rebote fuerte', () => {
    expect(springs.unlock.damping).toBeGreaterThanOrEqual(15);
  });

  test('el escalonado de listas es corto', () => {
    expect(STAGGER_MS).toBeLessThanOrEqual(80);
  });
});
