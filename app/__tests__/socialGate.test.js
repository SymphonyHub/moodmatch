import { gateState, GATE } from '../features/wellness/socialGate';

describe('gateState — regla de bloqueo de "Con amigos"', () => {
  test('null es DESCONOCIDO, no candado (contrato de FriendsCountContext)', () => {
    expect(gateState(null)).toBe(GATE.CARGANDO);
  });

  test('undefined y valores no numéricos tampoco bloquean', () => {
    expect(gateState(undefined)).toBe(GATE.CARGANDO);
    expect(gateState('3')).toBe(GATE.CARGANDO);
  });

  test('solo el 0 confirmado bloquea', () => {
    expect(gateState(0)).toBe(GATE.BLOQUEADO);
  });

  test('1 o más amigos desbloquea', () => {
    expect(gateState(1)).toBe(GATE.DESBLOQUEADO);
    expect(gateState(42)).toBe(GATE.DESBLOQUEADO);
  });
});
