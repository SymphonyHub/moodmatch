const {
  CARINO_POR_REGALO,
  COOLDOWN_REGALO_MS,
  estadoRegalo,
  marcadorRegalo,
  rachaBlanda,
} = require('../lib/interaccionesSociales');

describe('estadoRegalo — límite de un regalo por semana', () => {
  const ahora = new Date('2026-07-21T12:00:00.000Z');

  test('sin regalos previos se puede regalar', () => {
    expect(estadoRegalo(null, ahora)).toEqual({ puedeRegalar: true, disponibleEn: null });
  });

  test('dentro de la semana no se puede, e informa desde cuándo', () => {
    const hace2Dias = ahora.getTime() - 2 * 24 * 60 * 60 * 1000;
    const estado = estadoRegalo(hace2Dias, ahora);
    expect(estado.puedeRegalar).toBe(false);
    expect(new Date(estado.disponibleEn).getTime()).toBe(hace2Dias + COOLDOWN_REGALO_MS);
  });

  test('pasada la semana se vuelve a poder', () => {
    const hace8Dias = ahora.getTime() - 8 * 24 * 60 * 60 * 1000;
    expect(estadoRegalo(hace8Dias, ahora).puedeRegalar).toBe(true);
  });

  test('el regalo suma un empujón pequeño de cariño', () => {
    expect(CARINO_POR_REGALO).toBeGreaterThan(0);
    expect(CARINO_POR_REGALO).toBeLessThan(10);
  });

  test('el marcador de regalo lleva el prefijo esperado', () => {
    expect(marcadorRegalo(123)).toBe('__MASCOTA_REGALO__:123');
  });
});

describe('rachaBlanda — racha compartida calculada al vuelo', () => {
  const ahora = new Date('2026-07-21T20:00:00.000Z');
  const dia = (offset) => new Date(Date.UTC(2026, 6, 21 - offset, 9, 0, 0)).toISOString();

  test('sin cuidados: racha en cero, no viva', () => {
    expect(rachaBlanda({}, ahora)).toEqual({ dias: 0, viva: false, cuidadaHoy: false });
  });

  test('cuidada hoy por una persona: racha viva de 1 día', () => {
    const r = rachaBlanda({ ultimoCuidadoUsuario1: dia(0) }, ahora);
    expect(r).toEqual({ dias: 1, viva: true, cuidadaHoy: true });
  });

  test('cuidada hoy y ayer (uno cada día): racha de 2', () => {
    const r = rachaBlanda({ ultimoCuidadoUsuario1: dia(0), ultimoCuidadoUsuario2: dia(1) }, ahora);
    expect(r).toEqual({ dias: 2, viva: true, cuidadaHoy: true });
  });

  test('cuidada solo ayer: viva pero aún no cuidada hoy', () => {
    const r = rachaBlanda({ ultimoCuidadoUsuario1: dia(1) }, ahora);
    expect(r).toEqual({ dias: 1, viva: true, cuidadaHoy: false });
  });

  test('último cuidado hace 3 días: racha en pausa', () => {
    const r = rachaBlanda({ ultimoCuidadoUsuario1: dia(3) }, ahora);
    expect(r).toEqual({ dias: 0, viva: false, cuidadaHoy: false });
  });

  test('hoy y antier (no consecutivo): solo cuenta el tramo desde hoy', () => {
    const r = rachaBlanda({ ultimoCuidadoUsuario1: dia(0), ultimoCuidadoUsuario2: dia(2) }, ahora);
    expect(r).toEqual({ dias: 1, viva: true, cuidadaHoy: true });
  });

  test('ambos el mismo día: cuenta como un día', () => {
    const r = rachaBlanda({ ultimoCuidadoUsuario1: dia(0), ultimoCuidadoUsuario2: dia(0) }, ahora);
    expect(r.dias).toBe(1);
    expect(r.viva).toBe(true);
  });
});
