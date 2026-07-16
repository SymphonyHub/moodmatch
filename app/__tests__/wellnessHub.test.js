// Lógica pura del Wellness Hub (wellness/hubLogic.js): regla de bloqueo de la
// pestaña "Con amigos" según el contrato de useFriendsCount, y la forma de
// HUB_TABS que los agentes B y C referencian por id.
import { HUB_TABS, lockStateFor } from '../wellness/hubLogic';

describe('lockStateFor — contrato de friendsCount', () => {
  test('null es DESCONOCIDO (cargando/sin sesión), jamás bloqueado', () => {
    expect(lockStateFor(null)).toBe('unknown');
    expect(lockStateFor(null)).not.toBe('locked');
  });

  test('undefined también es desconocido, jamás bloqueado', () => {
    expect(lockStateFor(undefined)).toBe('unknown');
  });

  test('bloquea ÚNICAMENTE con 0 amigos confirmados', () => {
    expect(lockStateFor(0)).toBe('locked');
  });

  test('desbloquea con 1 o más amigos', () => {
    expect(lockStateFor(1)).toBe('unlocked');
    expect(lockStateFor(5)).toBe('unlocked');
    expect(lockStateFor(99)).toBe('unlocked');
  });
});

describe('HUB_TABS — contrato de pestañas del Hub', () => {
  test('son exactamente 2, con ids estables para los agentes B y C', () => {
    expect(HUB_TABS.map((t) => t.id)).toEqual(['para-mi', 'con-amigos']);
  });

  test('cada pestaña tiene etiqueta visible', () => {
    for (const tab of HUB_TABS) {
      expect(typeof tab.label).toBe('string');
      expect(tab.label.length).toBeGreaterThan(0);
    }
  });
});
