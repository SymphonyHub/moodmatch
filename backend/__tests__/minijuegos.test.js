const {
  COOLDOWN_MINIJUEGO_MS,
  ERRORES_MINIJUEGO,
  PREFIJO_MINIJUEGO,
  REGLAS_MINIJUEGO,
  SEGMENTOS_MARCADOR,
  SESION_MINIJUEGO_TTL_MS,
  TIPOS_MINIJUEGO,
  crearSesionMinijuego,
  errorMinijuego,
  estadoCooldownMinijuego,
  marcadorMinijuego,
  prefijoMarcadorMinijuego,
  recompensaMinijuego,
  validarPayloadCompletar,
  validarPuntuacionMinijuego,
  validarTipoMinijuego,
  verificarSesionMinijuego,
} = require('../lib/minijuegos');

describe('catalogo y validacion de minijuegos', () => {
  test('el catalogo esta cerrado a los dos tipos acordados', () => {
    expect(TIPOS_MINIJUEGO).toEqual(['ATRAPALA', 'RITMO_CARINO']);
    expect(REGLAS_MINIJUEGO).toEqual({
      ATRAPALA: { puntuacionMinima: 0, puntuacionMaxima: 8, duracionMinimaMs: 3000 },
      RITMO_CARINO: { puntuacionMinima: 0, puntuacionMaxima: 10, duracionMinimaMs: 3000 },
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

describe('sesion de partida firmada', () => {
  const SECRETO = 'secreto-de-prueba-minijuegos';
  const INICIO = new Date('2026-07-27T15:30:00.000Z');
  const contexto = {
    usuarioId: 4, amistadId: 7, tipo: 'ATRAPALA', secreto: SECRETO,
  };
  const enMs = (ms) => new Date(INICIO.getTime() + ms);
  const emitir = (extra = {}) => crearSesionMinijuego({
    ...contexto, ahora: INICIO, nonce: 'a1b2c3d4', ...extra,
  });

  test('emite un ticket con el instante y el limite del servidor', () => {
    const emitida = emitir();

    expect(emitida.iniciadoEn).toBe('2026-07-27T15:30:00.000Z');
    expect(emitida.expiraEn).toBe(new Date(INICIO.getTime() + SESION_MINIJUEGO_TTL_MS).toISOString());
    expect(emitida.duracionMinimaMs).toBe(REGLAS_MINIJUEGO.ATRAPALA.duracionMinimaMs);
    expect(emitida.sesion.split('.')).toHaveLength(3);
    expect(emitida.sesion.startsWith('v1.')).toBe(true);
    expect(emitida.sesion).not.toContain(SECRETO);
  });

  test('el ticket es reproducible con el mismo nonce y unico sin el', () => {
    expect(emitir().sesion).toBe(emitir().sesion);
    expect(crearSesionMinijuego({ ...contexto, ahora: INICIO }).sesion)
      .not.toBe(crearSesionMinijuego({ ...contexto, ahora: INICIO }).sesion);
  });

  test('una partida que respeta el piso de duracion se acepta', () => {
    const { sesion } = emitir();
    const ahora = enMs(7412);

    expect(verificarSesionMinijuego(sesion, { ...contexto, ahora })).toEqual({
      valida: true,
      iniciadoEn: '2026-07-27T15:30:00.000Z',
      duracionMs: 7412,
      nonce: 'a1b2c3d4',
    });
  });

  test('el limite exacto de duracion minima ya es una partida valida', () => {
    const { sesion } = emitir();
    const minima = REGLAS_MINIJUEGO.ATRAPALA.duracionMinimaMs;

    expect(verificarSesionMinijuego(sesion, { ...contexto, ahora: enMs(minima) }).valida).toBe(true);
    expect(verificarSesionMinijuego(sesion, { ...contexto, ahora: enMs(minima - 1) }))
      .toEqual({ valida: false, motivo: 'SESION_DEMASIADO_RAPIDA' });
  });

  test('un reporte instantaneo no cuenta como partida jugada', () => {
    const { sesion } = emitir();
    expect(verificarSesionMinijuego(sesion, { ...contexto, ahora: INICIO }))
      .toEqual({ valida: false, motivo: 'SESION_DEMASIADO_RAPIDA' });
  });

  test('un reloj que retrocede tampoco abre la puerta', () => {
    const { sesion } = emitir();
    expect(verificarSesionMinijuego(sesion, { ...contexto, ahora: enMs(-60_000) }))
      .toEqual({ valida: false, motivo: 'SESION_DEMASIADO_RAPIDA' });
  });

  test('el ticket caduca despues del TTL, no justo en el', () => {
    const { sesion } = emitir();

    expect(verificarSesionMinijuego(sesion, { ...contexto, ahora: enMs(SESION_MINIJUEGO_TTL_MS) }).valida)
      .toBe(true);
    expect(verificarSesionMinijuego(sesion, { ...contexto, ahora: enMs(SESION_MINIJUEGO_TTL_MS + 1) }))
      .toEqual({ valida: false, motivo: 'SESION_EXPIRADA' });
  });

  test('retrasar el inicio para fingir una partida larga invalida la firma', () => {
    const { sesion } = emitir();
    const [version, cuerpo, firma] = sesion.split('.');
    const datos = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8'));
    const falsificado = Buffer.from(
      JSON.stringify({ ...datos, i: datos.i - 10 * 60 * 1000 }),
      'utf8',
    ).toString('base64url');

    expect(verificarSesionMinijuego(`${version}.${falsificado}.${firma}`, {
      ...contexto, ahora: INICIO,
    })).toEqual({ valida: false, motivo: 'SESION_FIRMA' });
  });

  test('una firma alterada o firmada con otro secreto se rechaza', () => {
    const { sesion } = emitir();
    const [version, cuerpo, firma] = sesion.split('.');
    const otraFirma = `${firma.slice(0, -1)}${firma.endsWith('A') ? 'B' : 'A'}`;

    expect(verificarSesionMinijuego(`${version}.${cuerpo}.${otraFirma}`, { ...contexto, ahora: enMs(5000) }))
      .toEqual({ valida: false, motivo: 'SESION_FIRMA' });
    expect(verificarSesionMinijuego(sesion, { ...contexto, ahora: enMs(5000), secreto: 'otro-secreto' }))
      .toEqual({ valida: false, motivo: 'SESION_FIRMA' });
  });

  test.each([
    ['otro usuario', { usuarioId: 9 }],
    ['otra amistad', { amistadId: 8 }],
    ['otro tipo', { tipo: 'RITMO_CARINO' }],
  ])('un ticket emitido para %s no sirve aqui', (_, cambio) => {
    const { sesion } = emitir();
    expect(verificarSesionMinijuego(sesion, { ...contexto, ...cambio, ahora: enMs(5000) }))
      .toEqual({ valida: false, motivo: 'SESION_VINCULO' });
  });

  test('el id acepta numero o cadena numerica sin romper el vinculo', () => {
    const { sesion } = crearSesionMinijuego({ ...contexto, amistadId: '7', ahora: INICIO });
    expect(verificarSesionMinijuego(sesion, { ...contexto, amistadId: 7, ahora: enMs(5000) }).valida)
      .toBe(true);
  });

  test.each([
    ['ausente', undefined, 'SESION_AUSENTE'],
    ['vacia', '', 'SESION_AUSENTE'],
    ['no textual', 12345, 'SESION_AUSENTE'],
    ['sin las tres partes', 'v1.solo-cuerpo', 'SESION_FORMATO'],
    ['de otra version', 'v2.cuerpo.firma', 'SESION_FORMATO'],
    ['con cuerpo vacio', 'v1..firma', 'SESION_FORMATO'],
  ])('una sesion %s se rechaza sin excepcion', (_, sesion, motivo) => {
    expect(verificarSesionMinijuego(sesion, { ...contexto, ahora: enMs(5000) }))
      .toEqual({ valida: false, motivo });
  });

  test('un contexto de servidor invalido es error de programacion, no un 400', () => {
    const { sesion } = emitir();
    expect(() => verificarSesionMinijuego(sesion, { ...contexto, tipo: 'OTRO', ahora: INICIO }))
      .toThrow(TypeError);
    expect(() => verificarSesionMinijuego(sesion, { ...contexto, secreto: '', ahora: INICIO }))
      .toThrow(TypeError);
    expect(() => verificarSesionMinijuego(sesion, { ...contexto, ahora: INICIO.getTime() }))
      .toThrow(TypeError);
    expect(() => crearSesionMinijuego({ ...contexto, usuarioId: 0, ahora: INICIO })).toThrow(TypeError);
    expect(() => crearSesionMinijuego({ ...contexto, amistadId: 'siete', ahora: INICIO })).toThrow(TypeError);
    expect(() => crearSesionMinijuego({ ...contexto, ahora: INICIO, nonce: 'zz' })).toThrow(TypeError);
  });
});

describe('validarPayloadCompletar - esquema unico de entrada', () => {
  const sesion = 'v1.cuerpo.firma';

  test('acepta el payload completo y solo conserva los campos del contrato', () => {
    expect(validarPayloadCompletar({ puntuacion: 8, sesion, sobra: 'x' }, 'ATRAPALA'))
      .toEqual({ ok: true, valor: { puntuacion: 8, sesion } });
    expect(validarPayloadCompletar({ puntuacion: 0, sesion }, 'RITMO_CARINO'))
      .toEqual({ ok: true, valor: { puntuacion: 0, sesion } });
  });

  test.each([
    ['body ausente', undefined, 'PAYLOAD_INVALIDO'],
    ['body no objeto', 'puntuacion=8', 'PAYLOAD_INVALIDO'],
    ['body en arreglo', [8], 'PAYLOAD_INVALIDO'],
    ['puntuacion fuera de rango', { puntuacion: 9, sesion }, 'PUNTUACION_INVALIDA'],
    ['puntuacion textual', { puntuacion: '8', sesion }, 'PUNTUACION_INVALIDA'],
    ['puntuacion decimal', { puntuacion: 2.5, sesion }, 'PUNTUACION_INVALIDA'],
    ['sesion ausente', { puntuacion: 8 }, 'SESION_AUSENTE'],
    ['sesion vacia', { puntuacion: 8, sesion: '' }, 'SESION_AUSENTE'],
  ])('rechaza %s sin corregirlo', (_, body, motivo) => {
    expect(validarPayloadCompletar(body, 'ATRAPALA')).toEqual({ ok: false, motivo });
  });

  test('exige que la ruta valide el tipo antes de llamar', () => {
    expect(() => validarPayloadCompletar({ puntuacion: 8, sesion }, 'OTRO')).toThrow(TypeError);
  });
});

describe('errorMinijuego - una sola respuesta por motivo', () => {
  test('los fallos de ticket comparten codigo publico y no delatan la comprobacion', () => {
    const agrupados = [
      'SESION_AUSENTE', 'SESION_FORMATO', 'SESION_FIRMA', 'SESION_VINCULO', 'SESION_DEMASIADO_RAPIDA',
    ].map(errorMinijuego);

    agrupados.forEach((error) => {
      expect(error).toBe(ERRORES_MINIJUEGO.SESION_INVALIDA);
      expect(error.status).toBe(400);
    });
    expect(errorMinijuego('SESION_EXPIRADA')).toBe(ERRORES_MINIJUEGO.SESION_EXPIRADA);
  });

  test.each([
    ['TIPO_DESCONOCIDO', 400],
    ['AMISTAD_INVALIDA', 400],
    ['PAYLOAD_INVALIDO', 400],
    ['PUNTUACION_INVALIDA', 400],
    ['SESION_EXPIRADA', 400],
    ['MASCOTA_NO_ENCONTRADA', 404],
    ['EN_DESCANSO', 429],
  ])('%s responde con %i', (motivo, status) => {
    expect(errorMinijuego(motivo).status).toBe(status);
  });

  test('conserva la copia acordada del 404 y del descanso', () => {
    expect(errorMinijuego('MASCOTA_NO_ENCONTRADA').mensaje).toBe('Mascota no encontrada');
    expect(errorMinijuego('EN_DESCANSO').mensaje)
      .toBe('Este minijuego está tomando una pausa. Podrás volver a jugar más adelante.');
  });

  test('ningun mensaje culpa, apura ni acusa de hacer trampa', () => {
    const prohibidas = [
      'trampa', 'tramposo', 'hiciste', 'inválido', 'invalido', 'error', 'prohibido',
      'no puedes', 'fallaste', 'demasiado rápido', 'rápido', 'apúrate', 'sospechos',
    ];
    Object.values(ERRORES_MINIJUEGO).forEach(({ mensaje }) => {
      const texto = mensaje.toLowerCase();
      prohibidas.forEach((palabra) => expect(texto).not.toContain(palabra));
    });
  });

  test('un motivo desconocido no se convierte en una respuesta silenciosa', () => {
    expect(() => errorMinijuego('OTRO')).toThrow(TypeError);
    expect(() => errorMinijuego(undefined)).toThrow(TypeError);
  });
});
