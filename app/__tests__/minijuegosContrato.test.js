import {
  CODIGO_DESCANSO,
  RECOMPENSAS,
  TIPOS_RECOMPENSA,
  esEstadoCooldown,
  interpretarErrorMinijuego,
  normalizarEstadosMinijuego,
  recompensasVisibles,
  validarRespuestaCompletar,
  validarRespuestaIniciar,
} from '../mascota/minijuegos/contrato';
import { TIPOS_MINIJUEGO } from '../mascota/minijuegos/logica';

const estados = {
  ATRAPALA: { puedeJugar: false, disponibleEn: '2026-07-28T12:00:00.000Z' },
  RITMO_CARINO: { puedeJugar: true, disponibleEn: null },
};

const completar = {
  mascota: {
    id: 'pet-1', amistadId: 7, energia: 66, monedas: 4, minijuegos: estados,
  },
  minijuego: {
    tipo: 'ATRAPALA',
    puntuacion: 8,
    completadoEn: '2026-07-27T12:00:00.000Z',
    disponibleEn: '2026-07-28T12:00:00.000Z',
  },
  recompensa: { energia: 16, carino: 0, monedas: 3 },
};

const contexto = { tipo: 'ATRAPALA', puntuacion: 8 };

describe('tipos de recompensa', () => {
  test('son la unica fuente y cubren lo que devuelve el backend', () => {
    expect(TIPOS_RECOMPENSA).toEqual(['energia', 'carino', 'monedas']);
    expect(Object.keys(completar.recompensa).sort()).toEqual([...TIPOS_RECOMPENSA].sort());
    expect(RECOMPENSAS.every(({ icono, etiqueta }) => Boolean(icono) && Boolean(etiqueta))).toBe(true);
  });

  test('solo se muestran las recompensas que suman algo', () => {
    expect(recompensasVisibles({ energia: 16, carino: 0, monedas: 3 })).toEqual([
      { clave: 'energia', icono: 'flash', texto: '+16 energía' },
      { clave: 'monedas', icono: 'leaf', texto: '+3 semillitas' },
    ]);
    expect(recompensasVisibles({ energia: 0, carino: 5, monedas: 1 })).toEqual([
      { clave: 'carino', icono: 'heart', texto: '+5 cariño' },
      { clave: 'monedas', icono: 'leaf', texto: '+1 semillitas' },
    ]);
  });

  test('una recompensa ausente o vacia no rompe la pantalla', () => {
    expect(recompensasVisibles(null)).toEqual([]);
    expect(recompensasVisibles({ energia: 0, carino: 0, monedas: 0 })).toEqual([]);
  });
});

describe('estados de cooldown', () => {
  test('acepta las dos formas coherentes del contrato', () => {
    expect(esEstadoCooldown({ puedeJugar: true, disponibleEn: null })).toBe(true);
    expect(esEstadoCooldown({ puedeJugar: false, disponibleEn: '2026-07-28T12:00:00.000Z' })).toBe(true);
  });

  test.each([
    ['disponible con fecha', { puedeJugar: true, disponibleEn: '2026-07-28T12:00:00.000Z' }],
    ['en descanso sin fecha', { puedeJugar: false, disponibleEn: null }],
    ['fecha ilegible', { puedeJugar: false, disponibleEn: 'mañana' }],
    ['sin bandera', { disponibleEn: null }],
    ['nulo', null],
  ])('rechaza un estado %s', (_, estado) => {
    expect(esEstadoCooldown(estado)).toBe(false);
  });

  test('el detalle trae los dos tipos o no se considera disponible', () => {
    expect(normalizarEstadosMinijuego(estados)).toEqual(estados);
    expect(Object.keys(normalizarEstadosMinijuego(estados))).toEqual([...TIPOS_MINIJUEGO]);
    expect(normalizarEstadosMinijuego({ ATRAPALA: estados.ATRAPALA })).toBeNull();
    expect(normalizarEstadosMinijuego(undefined)).toBeNull();
  });
});

describe('validarRespuestaIniciar', () => {
  const inicio = {
    sesion: 'v1.cuerpo.firma',
    expiraEn: '2026-07-27T13:00:00.000Z',
    duracionMinimaMs: 3000,
  };

  test('conserva solo los campos del contrato', () => {
    expect(validarRespuestaIniciar({ ...inicio, extra: 'x' })).toEqual(inicio);
  });

  test.each([
    ['sin ticket', { ...inicio, sesion: '' }],
    ['con ticket no textual', { ...inicio, sesion: 42 }],
    ['sin limite', { ...inicio, expiraEn: null }],
    ['con duracion minima decimal', { ...inicio, duracionMinimaMs: 1.5 }],
    ['vacia', {}],
  ])('rechaza una apertura %s', (_, data) => {
    expect(() => validarRespuestaIniciar(data)).toThrow('Respuesta inválida del minijuego');
  });
});

describe('validarRespuestaCompletar', () => {
  test('acepta la respuesta acordada y la devuelve tal cual', () => {
    expect(validarRespuestaCompletar(completar, contexto)).toBe(completar);
  });

  test.each([
    ['la puntuacion no es la reportada', { minijuego: { ...completar.minijuego, puntuacion: 7 } }],
    ['el tipo no es el jugado', { minijuego: { ...completar.minijuego, tipo: 'RITMO_CARINO' } }],
    ['falta una recompensa', { recompensa: { energia: 16, monedas: 3 } }],
    ['una recompensa es negativa', { recompensa: { energia: -1, carino: 0, monedas: 3 } }],
    ['la energia supera el tope de producto', {
      mascota: { ...completar.mascota, energia: 101 },
    }],
    ['el juego jugado sigue disponible', {
      mascota: {
        ...completar.mascota,
        minijuegos: { ...estados, ATRAPALA: { puedeJugar: true, disponibleEn: null } },
      },
    }],
  ])('rechaza un 201 donde %s', (_, parche) => {
    expect(() => validarRespuestaCompletar({ ...completar, ...parche }, contexto))
      .toThrow('Respuesta inválida del minijuego');
  });
});

describe('interpretarErrorMinijuego', () => {
  test('el descanso se reconoce por codigo y por status', () => {
    const disponibleEn = '2026-07-28T12:00:00.000Z';
    expect(interpretarErrorMinijuego({ status: 429, disponibleEn })).toMatchObject({
      codigo: CODIGO_DESCANSO,
      disponibleEn,
      reintentable: false,
    });
    expect(interpretarErrorMinijuego({ codigo: 'EN_DESCANSO', status: 400 }).codigo)
      .toBe(CODIGO_DESCANSO);
  });

  test('un ticket rechazado invita a jugar otra vez, no a reintentar el guardado', () => {
    const guion = interpretarErrorMinijuego({ status: 400, codigo: 'SESION_INVALIDA' });
    expect(guion.reintentable).toBe(false);
    expect(guion.requiereNuevaPartida).toBe(true);
  });

  test('un ticket caducado se explica aparte del rechazado', () => {
    const guion = interpretarErrorMinijuego({ status: 400, codigo: 'SESION_EXPIRADA' });
    expect(guion.codigo).toBe('SESION_EXPIRADA');
    expect(guion.requiereNuevaPartida).toBe(true);
  });

  test.each([
    ['un corte de red', { message: 'Network request failed' }],
    ['un 500 pasajero', { status: 500 }],
    ['un 503 pasajero', { status: 503 }],
  ])('%s conserva el resultado local y permite reintentar', (_, error) => {
    expect(interpretarErrorMinijuego(error)).toMatchObject({
      codigo: 'CONEXION',
      reintentable: true,
    });
  });

  test.each([
    [404, 'MASCOTA_NO_ENCONTRADA'],
    [401, 'AUTENTICACION'],
    [403, 'AUTENTICACION'],
    [400, 'DESCONOCIDO'],
  ])('un %i sin codigo cae en %s', (status, codigo) => {
    expect(interpretarErrorMinijuego({ status }).codigo).toBe(codigo);
  });

  test('un codigo que este cliente no conoce no se muestra crudo', () => {
    const guion = interpretarErrorMinijuego({ status: 400, codigo: 'ALGO_NUEVO' });
    expect(guion.codigo).toBe('DESCONOCIDO');
    expect(guion.mensaje).toBeTruthy();
  });

  test('una fecha de disponibilidad ilegible no se propaga a la pantalla', () => {
    expect(interpretarErrorMinijuego({ status: 429, disponibleEn: 'pronto' }).disponibleEn).toBeNull();
  });

  test('nunca se muestra el texto crudo del backend', () => {
    const guion = interpretarErrorMinijuego({
      status: 400,
      message: 'ValidationError: puntuacion must be an integer',
    });
    expect(guion.mensaje).not.toContain('ValidationError');
    expect(guion.titulo).not.toContain('ValidationError');
  });

  test('ninguna copia culpa, apura ni acusa de hacer trampa', () => {
    const prohibidas = [
      'trampa', 'tramposo', 'hiciste mal', 'inválido', 'invalido', 'no puedes',
      'fallaste', 'apúrate', 'rápido', 'sospechos', 'error',
    ];
    const codigos = [
      { status: 429 },
      { status: 400, codigo: 'SESION_INVALIDA' },
      { status: 400, codigo: 'SESION_EXPIRADA' },
      { status: 404 },
      { status: 401 },
      { status: 500 },
      { status: 400 },
    ];
    codigos.forEach((error) => {
      const { titulo, mensaje } = interpretarErrorMinijuego(error);
      const texto = `${titulo} ${mensaje}`.toLowerCase();
      prohibidas.forEach((palabra) => expect(texto).not.toContain(palabra));
    });
  });
});
