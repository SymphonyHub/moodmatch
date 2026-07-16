// Smoke del hook useCrisisShield: el árbol de imports resuelve bajo jest-expo
// y los exports públicos existen. La lógica se testea sin render en
// crisisShield.test.js (patrón del repo: núcleo puro + hook fino).
import { useCrisisShield, evaluarEscudo } from '../features/emociones/useCrisisShield';

describe('useCrisisShield (smoke)', () => {
  test('exporta el hook y el núcleo puro', () => {
    expect(typeof useCrisisShield).toBe('function');
    expect(typeof evaluarEscudo).toBe('function');
  });
});
