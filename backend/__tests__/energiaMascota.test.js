const {
  calcularEnergiaActual,
  desgastarEnergia,
  estadoEnergia,
  presentarEnergia,
  recuperarEnergia,
} = require('../lib/energiaMascota');

describe('energia de la mascota', () => {
  const ahora = new Date('2026-07-27T12:00:00.000Z');

  test('parte de 50 y se desgasta 10 por cada dia completo sin cuidado', () => {
    expect(calcularEnergiaActual({}, ahora)).toBe(50);
    expect(calcularEnergiaActual({
      energia: 50,
      createdAt: '2026-07-24T12:00:00.000Z',
    }, ahora)).toBe(20);
  });

  test('usa el cuidado mas reciente como inicio del desgaste', () => {
    expect(calcularEnergiaActual({
      energia: 50,
      createdAt: '2026-07-20T12:00:00.000Z',
      ultimoCuidadoUsuario1: '2026-07-26T11:59:59.000Z',
    }, ahora)).toBe(40);
  });

  test('el desgaste no baja de cero y la recuperacion no supera cien', () => {
    expect(desgastarEnergia(5, 10)).toBe(0);
    expect(recuperarEnergia(90)).toBe(100);
  });

  test('la energia baja usa un estado de sueno y una pose de siesta neutrales', () => {
    expect(estadoEnergia(20)).toEqual({
      estado: 'con_sueno',
      cansada: true,
      pose: 'siesta',
    });
    expect(presentarEnergia({ energia: 21 }, ahora).estadoEnergia).toEqual({
      estado: 'activa',
      cansada: false,
      pose: 'normal',
    });
  });
});
