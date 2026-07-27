const {
  COOLDOWN_MINIJUEGO_MS,
  PREFIJO_MINIJUEGO,
  REGLAS_MINIJUEGO,
  SEGMENTOS_MARCADOR,
  TIPOS_MINIJUEGO,
  estadoCooldownMinijuego,
  marcadorMinijuego,
  prefijoMarcadorMinijuego,
  recompensaMinijuego,
  validarPuntuacionMinijuego,
  validarTipoMinijuego,
} = require('../lib/minijuegos');

describe('catalogo y validacion de minijuegos', () => {
  test('el catalogo esta cerrado a los dos tipos acordados', () => {
    expect(TIPOS_MINIJUEGO).toEqual(['ATRAPALA', 'RITMO_CARINO']);
    expect(REGLAS_MINIJUEGO).toEqual({
      ATRAPALA: { puntuacionMinima: 0, puntuacionMaxima: 8 },
      RITMO_CARINO: { puntuacionMinima: 0, puntuacionMaxima: 10 },
    });
    expect(Object.isFrozen(TIPOS_MINIJUEGO)).toBe(true);
    expect(Object.isFrozen(REGLAS_MINIJUEGO)).toBe(true);
    expect(SEGMENTOS_MARCADOR).toEqual({
      ATRAPALA: 'ATRAPALA',
      RITMO_CARINO: 'RITMO-CARINO',
    });
  });

  test('el tipo se valida de forma exacta, sin normalizacion', () => {
    expect(validarTipoMinijuego('ATRAPALA')).toBe(true);
    expect(validarTipoMinijuego('RITMO_CARINO')).toBe(true);
    expect(validarTipoMinijuego('atrapala')).toBe(false);
    expect(validarTipoMinijuego('OTRO')).toBe(false);
    expect(validarTipoMinijuego(null)).toBe(false);
  });

  test.each([
    ['ATRAPALA', 0],
    ['ATRAPALA', 8],
    ['RITMO_CARINO', 0],
    ['RITMO_CARINO', 10],
  ])('acepta %s con puntuacion limite %i', (tipo, puntuacion) => {
    expect(validarPuntuacionMinijuego(tipo, puntuacion)).toBe(true);
  });

  test.each([
    ['ATRAPALA', -1],
    ['ATRAPALA', 9],
    ['RITMO_CARINO', -1],
    ['RITMO_CARINO', 11],
    ['ATRAPALA', 3.5],
    ['ATRAPALA', '3'],
    ['OTRO', 3],
  ])('rechaza %s con puntuacion %p sin corregirla', (tipo, puntuacion) => {
    expect(validarPuntuacionMinijuego(tipo, puntuacion)).toBe(false);
  });
});

describe('marcador interno de finalizacion', () => {
  test('incluye prefijo, tipo y epoch y es autocontenido', () => {
    expect(PREFIJO_MINIJUEGO).toBe('MASCOTA.MINIJUEGO:');
    expect(marcadorMinijuego('ATRAPALA', 1785166200000))
      .toBe('MASCOTA.MINIJUEGO:ATRAPALA:1785166200000');
    expect(marcadorMinijuego('RITMO_CARINO', 123))
      .toBe('MASCOTA.MINIJUEGO:RITMO-CARINO:123');
    expect(prefijoMarcadorMinijuego('ATRAPALA')).toBe('MASCOTA.MINIJUEGO:ATRAPALA:');
    expect(prefijoMarcadorMinijuego('RITMO_CARINO')).toBe('MASCOTA.MINIJUEGO:RITMO-CARINO:');
    expect(Object.values(SEGMENTOS_MARCADOR).every((segmento) => !/[_%]/.test(segmento))).toBe(true);
  });

  test('no construye marcadores con tipo o epoch invalidos', () => {
    expect(() => marcadorMinijuego('OTRO', 123)).toThrow(TypeError);
    expect(() => prefijoMarcadorMinijuego('OTRO')).toThrow(TypeError);
    expect(() => marcadorMinijuego('ATRAPALA', -1)).toThrow(TypeError);
    expect(() => marcadorMinijuego('ATRAPALA', 1.5)).toThrow(TypeError);
    expect(() => marcadorMinijuego('ATRAPALA', '123')).toThrow(TypeError);
  });
});

describe('estadoCooldownMinijuego - ventana rodante de 24 horas', () => {
  const ahora = new Date('2026-07-27T15:30:00.000Z');

  test('sin finalizacion previa el tipo esta disponible', () => {
    expect(estadoCooldownMinijuego(null, ahora)).toEqual({
      puedeJugar: true,
      disponibleEn: null,
    });
  });

  test('antes de cumplir 24 horas informa el instante exacto de disponibilidad', () => {
    const ultima = ahora.getTime() - 2 * 60 * 60 * 1000;
    expect(estadoCooldownMinijuego(ultima, ahora)).toEqual({
      puedeJugar: false,
      disponibleEn: new Date(ultima + COOLDOWN_MINIJUEGO_MS).toISOString(),
    });
  });

  test('en el limite exacto de 24 horas vuelve a estar disponible', () => {
    const ultima = ahora.getTime() - COOLDOWN_MINIJUEGO_MS;
    expect(estadoCooldownMinijuego(ultima, ahora)).toEqual({
      puedeJugar: true,
      disponibleEn: null,
    });
  });

  test('es rodante y no se reinicia al cambiar el dia UTC', () => {
    const justoAntesDeMedianoche = new Date('2026-07-26T23:59:00.000Z').getTime();
    const despuesDeMedianoche = new Date('2026-07-27T00:01:00.000Z');
    const estado = estadoCooldownMinijuego(justoAntesDeMedianoche, despuesDeMedianoche);
    expect(estado.puedeJugar).toBe(false);
    expect(estado.disponibleEn).toBe('2026-07-27T23:59:00.000Z');
  });

  test('rechaza una fecha de servidor invalida', () => {
    expect(() => estadoCooldownMinijuego(null, new Date('invalida'))).toThrow(TypeError);
    expect(() => estadoCooldownMinijuego(null, Date.now())).toThrow(TypeError);
  });

  test('solo null representa ausencia; un dato persistido corrupto no abre el cooldown', () => {
    expect(() => estadoCooldownMinijuego(undefined, ahora)).toThrow(TypeError);
    expect(() => estadoCooldownMinijuego('1785166200000', ahora)).toThrow(TypeError);
    expect(() => estadoCooldownMinijuego(-1, ahora)).toThrow(TypeError);
    expect(() => estadoCooldownMinijuego(1.5, ahora)).toThrow(TypeError);
  });
});

describe('recompensaMinijuego - deltas nominales', () => {
  test.each([
    [0, { energia: 0, carino: 0, monedas: 1 }],
    [2, { energia: 4, carino: 0, monedas: 1 }],
    [3, { energia: 6, carino: 0, monedas: 2 }],
    [6, { energia: 12, carino: 0, monedas: 3 }],
    [8, { energia: 16, carino: 0, monedas: 3 }],
  ])('ATRAPALA con %i aplica energia doble y hasta 3 monedas', (puntuacion, recompensa) => {
    expect(recompensaMinijuego('ATRAPALA', puntuacion)).toEqual(recompensa);
  });

  test.each([
    [0, { energia: 0, carino: 0, monedas: 1 }],
    [3, { energia: 0, carino: 3, monedas: 1 }],
    [4, { energia: 0, carino: 4, monedas: 2 }],
    [8, { energia: 0, carino: 8, monedas: 3 }],
    [10, { energia: 0, carino: 10, monedas: 3 }],
  ])('RITMO_CARINO con %i aplica carino y hasta 3 monedas', (puntuacion, recompensa) => {
    expect(recompensaMinijuego('RITMO_CARINO', puntuacion)).toEqual(recompensa);
  });

  test('rechaza entradas invalidas en vez de aplicar clamp o coercion', () => {
    expect(() => recompensaMinijuego('ATRAPALA', 9)).toThrow(RangeError);
    expect(() => recompensaMinijuego('RITMO_CARINO', -1)).toThrow(RangeError);
    expect(() => recompensaMinijuego('ATRAPALA', 2.7)).toThrow(RangeError);
    expect(() => recompensaMinijuego('ATRAPALA', '8')).toThrow(RangeError);
    expect(() => recompensaMinijuego('OTRO', 1)).toThrow(TypeError);
  });
});
