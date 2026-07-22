// Tests del endpoint POST /api/chat/respond (CONTRATO-GEMINI.md): contrato de
// request/response, doble escudo de crisis, validador de tono post-respuesta
// y fallback transparente por plantilla (nunca 5xx por el modelo).

// Se conservan las funciones puras reales (pideRelato, senalesDeHistorial):
// el route depende de ellas para decidir, y mockearlas ocultaría el bug.
jest.mock('../lib/gemini', () => ({
  ...jest.requireActual('../lib/gemini'),
  generarRespuesta: jest.fn(),
  extraerMemoria: jest.fn(),
}));

jest.mock('../lib/prisma', () => ({
  user: { findUnique: jest.fn(), update: jest.fn() },
}));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const chatRouter = require('../routes/chat');
const { generarRespuesta, extraerMemoria } = require('../lib/gemini');
const { MENSAJE_CRISIS, validarTono } = require('../lib/tonoCrisis');
const { PLANTILLAS } = require('../lib/plantillas');
const prisma = require('../lib/prisma');
const { memoriaVacia } = require('../lib/memoriaChat');

const token = jwt.sign({ userId: 1 }, 'moodmatch-dev-secret');

const app = express();
app.use(express.json());
app.use('/api/chat', chatRouter);

const post = (body) =>
  request(app).post('/api/chat/respond').set('Authorization', `Bearer ${token}`).send(body);

// La actualización de memoria corre fire-and-forget después de responder:
// supertest ya resolvió, así que hay que dejar correr la cola de microtareas
// antes de afirmar sobre ella.
const dejarCorrerSegundoPlano = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue({ memoriaChat: null });
  prisma.user.update.mockResolvedValue({});
  extraerMemoria.mockResolvedValue([]);
});

const VALID_MOODS = ['FELIZ', 'TRISTE', 'ANSIOSO', 'CALMADO', 'ENOJADO', 'NEUTRO'];

describe('validación de entrada', () => {
  test('rechaza sin token con 401', async () => {
    const res = await request(app)
      .post('/api/chat/respond')
      .send({ mood: 'TRISTE', mensaje: 'hola' });
    expect(res.status).toBe(401);
  });

  test('rechaza mood fuera de la lista con 400', async () => {
    const res = await post({ mood: 'EUFORICO', mensaje: 'hola' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mood/i);
  });

  test('rechaza mood ausente con 400', async () => {
    const res = await post({ mensaje: 'hola' });
    expect(res.status).toBe(400);
  });

  test('rechaza mensaje vacío o solo espacios con 400', async () => {
    for (const mensaje of [undefined, '', '   ', 42]) {
      const res = await post({ mood: 'TRISTE', mensaje });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/mensaje/i);
    }
    expect(generarRespuesta).not.toHaveBeenCalled();
  });
});

describe('camino feliz — respuesta de Gemini', () => {
  test.each(VALID_MOODS)('responde fuente gemini con mood %s', async (mood) => {
    generarRespuesta.mockResolvedValue('Te leo, y lo que cuentas tiene sentido.');
    const res = await post({ mood, mensaje: 'hoy fue un día raro' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      respuesta: 'Te leo, y lo que cuentas tiene sentido.',
      fuente: 'gemini',
      terminar: false,
    });
  });

  test('pasa mood, mensaje, historial saneado y esUltimo al wrapper', async () => {
    generarRespuesta.mockResolvedValue('Suena a que fue mucho.');
    const historial = [
      { autor: 'usuario', texto: '😢 Triste' },
      { autor: 'bot', texto: 'Lamento que estés así.' },
      { autor: 'malo', texto: 'se descarta' },
      { autor: 'usuario', texto: '' },
    ];
    await post({ mood: 'TRISTE', mensaje: 'fue un mal día', historial });

    expect(generarRespuesta).toHaveBeenCalledWith({
      mood: 'TRISTE',
      mensaje: 'fue un mal día',
      historial: [
        { autor: 'usuario', texto: '😢 Triste' },
        { autor: 'bot', texto: 'Lamento que estés así.' },
      ],
      esUltimo: false,
      memoria: memoriaVacia(),
    });
  });
});

describe('escudo de crisis — segunda capa', () => {
  test('mensaje con señal de crisis responde MENSAJE_CRISIS por plantilla y NO llama a Gemini', async () => {
    const res = await post({ mood: 'TRISTE', mensaje: 'ya no le veo sentido a la vida' });

    expect(res.status).toBe(200);
    expect(res.body.fuente).toBe('plantilla');
    expect(res.body.respuesta).toBe(MENSAJE_CRISIS);
    expect(generarRespuesta).not.toHaveBeenCalled();
  });

  test('la detección normaliza tildes ("hacerme daño")', async () => {
    const res = await post({ mood: 'ANSIOSO', mensaje: 'A veces pienso en hacerme daño' });
    expect(res.body.respuesta).toBe(MENSAJE_CRISIS);
    expect(generarRespuesta).not.toHaveBeenCalled();
  });
});

describe('validador de tono post-respuesta', () => {
  test('frase de la lista negra universal → fallback por plantilla', async () => {
    generarRespuesta.mockResolvedValue('Tranquilo, no es para tanto.');
    const res = await post({ mood: 'FELIZ', mensaje: 'me pasó algo' });

    expect(res.body.fuente).toBe('plantilla');
    expect(res.body.respuesta).not.toMatch(/no es para tanto/i);
  });

  test('positividad forzada se rechaza en mood difícil pero pasa en FELIZ', async () => {
    generarRespuesta.mockResolvedValue('¡Anímate, sonríe un poco!');

    const triste = await post({ mood: 'TRISTE', mensaje: 'estoy mal' });
    expect(triste.body.fuente).toBe('plantilla');

    const feliz = await post({ mood: 'FELIZ', mensaje: 'estoy contento' });
    expect(feliz.body.fuente).toBe('gemini');
  });

  test('teléfonos o recursos de crisis del modelo → fallback (esa pieza es de MENSAJE_CRISIS)', async () => {
    for (const texto of [
      'Puedes llamar al 600 360 7777.',
      'Marca *4141 si lo necesitas.',
      'Llama a Salud Responde.',
      'Busca una línea de ayuda.',
    ]) {
      generarRespuesta.mockResolvedValue(texto);
      const res = await post({ mood: 'TRISTE', mensaje: 'estoy mal' });
      expect(res.body.fuente).toBe('plantilla');
    }
  });

  test('respuesta desmedidamente larga → fallback (garantía de brevedad)', async () => {
    generarRespuesta.mockResolvedValue('palabra '.repeat(100));
    const res = await post({ mood: 'NEUTRO', mensaje: 'hola' });
    expect(res.body.fuente).toBe('plantilla');
  });
});

describe('fallo del modelo — nunca 5xx', () => {
  test('Gemini lanza (error, timeout o key ausente) → 200 por plantilla', async () => {
    generarRespuesta.mockRejectedValue(new Error('Timeout de Gemini'));
    const res = await post({ mood: 'ANSIOSO', mensaje: 'no me puedo concentrar' });

    expect(res.status).toBe(200);
    expect(res.body.fuente).toBe('plantilla');
    expect(typeof res.body.respuesta).toBe('string');
    expect(res.body.respuesta.length).toBeGreaterThan(0);
  });

  test('Gemini devuelve vacío → 200 por plantilla', async () => {
    generarRespuesta.mockResolvedValue('');
    const res = await post({ mood: 'CALMADO', mensaje: 'todo tranquilo' });
    expect(res.body.fuente).toBe('plantilla');
  });
});

describe('terminar — tope de MAX_INTERCAMBIOS (4, como el reducer)', () => {
  const turnoUsuario = (texto) => ({ autor: 'usuario', texto });
  const turnoBot = (texto) => ({ autor: 'bot', texto });

  test('con 2 turnos previos del usuario (3er intercambio) → terminar false', async () => {
    generarRespuesta.mockResolvedValue('Te sigo leyendo.');
    const res = await post({
      mood: 'TRISTE',
      mensaje: 'sigo dándole vueltas',
      historial: [turnoBot('hola'), turnoUsuario('😢 Triste'), turnoBot('te leo'), turnoUsuario('fue un mal día')],
    });
    expect(res.body.terminar).toBe(false);
    expect(generarRespuesta).toHaveBeenCalledWith(expect.objectContaining({ esUltimo: false }));
  });

  test('con 3 turnos previos del usuario (4º intercambio) → terminar true y esUltimo true', async () => {
    generarRespuesta.mockResolvedValue('Gracias por contarme.');
    const res = await post({
      mood: 'TRISTE',
      mensaje: 'creo que eso era todo',
      historial: [
        turnoUsuario('😢 Triste'),
        turnoBot('te leo'),
        turnoUsuario('fue un mal día'),
        turnoBot('suena pesado'),
        turnoUsuario('sí, bastante'),
        turnoBot('tiene sentido'),
      ],
    });
    expect(res.body.terminar).toBe(true);
    expect(generarRespuesta).toHaveBeenCalledWith(expect.objectContaining({ esUltimo: true }));
  });

  test('terminar se calcula sobre el historial completo, aunque supere los 8 turnos', async () => {
    generarRespuesta.mockResolvedValue('Cierro contigo.');
    const historial = [];
    for (let i = 0; i < 10; i++) {
      historial.push(turnoUsuario(`mensaje ${i}`), turnoBot(`respuesta ${i}`));
    }
    const res = await post({ mood: 'NEUTRO', mensaje: 'y eso', historial });
    expect(res.body.terminar).toBe(true);
  });

  test('historial malformado (no array) se trata como vacío', async () => {
    generarRespuesta.mockResolvedValue('Cuéntame más.');
    const res = await post({ mood: 'NEUTRO', mensaje: 'hola', historial: 'no soy un array' });
    expect(res.status).toBe(200);
    expect(res.body.terminar).toBe(false);
  });
});

describe('continuar — conversación extendida (Fase 9)', () => {
  const turnoUsuario = (texto) => ({ autor: 'usuario', texto });
  const turnoBot = (texto) => ({ autor: 'bot', texto });

  const historialLargo = () => {
    const historial = [];
    for (let i = 0; i < 10; i++) {
      historial.push(turnoUsuario(`mensaje ${i}`), turnoBot(`respuesta ${i}`));
    }
    return historial;
  };

  test('con continuar:true nunca fuerza el cierre, aun con historial largo', async () => {
    generarRespuesta.mockResolvedValue('Te sigo leyendo con calma.');
    const res = await post({
      mood: 'TRISTE',
      mensaje: 'sigo pensando en eso',
      historial: historialLargo(),
      continuar: true,
    });
    expect(res.body.terminar).toBe(false);
    expect(generarRespuesta).toHaveBeenCalledWith(expect.objectContaining({ esUltimo: false }));
  });

  test('el fallback por plantilla en modo continuar usa la variante seguir (nunca cierre)', async () => {
    generarRespuesta.mockRejectedValue(new Error('Timeout de Gemini'));
    const res = await post({
      mood: 'ANSIOSO',
      mensaje: 'todavía me da vueltas',
      historial: historialLargo(),
      continuar: true,
    });
    expect(res.body.fuente).toBe('plantilla');
    expect(res.body.terminar).toBe(false);
    expect(PLANTILLAS.ANSIOSO.seguir).toContain(res.body.respuesta);
  });

  test('la segunda capa del escudo de crisis sigue activa con continuar:true', async () => {
    const res = await post({
      mood: 'TRISTE',
      mensaje: 'ya no le veo sentido a la vida',
      historial: historialLargo(),
      continuar: true,
    });
    expect(res.body.respuesta).toBe(MENSAJE_CRISIS);
    expect(res.body.terminar).toBe(false);
    expect(generarRespuesta).not.toHaveBeenCalled();
  });

  test('continuar no booleano o ausente conserva el tope actual', async () => {
    generarRespuesta.mockResolvedValue('Gracias por contarme.');
    for (const continuar of [undefined, 'true', 1]) {
      const res = await post({
        mood: 'NEUTRO',
        mensaje: 'y eso',
        historial: historialLargo(),
        continuar,
      });
      expect(res.body.terminar).toBe(true);
    }
  });
});

describe('memoria entre sesiones (Fase 15) — lectura e inyección', () => {
  const memoriaGuardada = {
    version: 1,
    actualizada: new Date().toISOString(),
    apodo: 'Fran',
    preferencias: { sugerirHub: true, humor: 'neutro' },
    notas: [{ t: 'Tiene un gato que se llama Suco.', d: '2026-07-20' }],
  };

  test('la memoria guardada se sanea y viaja al wrapper', async () => {
    prisma.user.findUnique.mockResolvedValue({ memoriaChat: memoriaGuardada });
    generarRespuesta.mockResolvedValue('¿Cómo anda Suco?');
    await post({ mood: 'NEUTRO', mensaje: 'hola de nuevo' });

    const { memoria } = generarRespuesta.mock.calls[0][0];
    expect(memoria.apodo).toBe('Fran');
    expect(memoria.notas).toEqual([{ t: 'Tiene un gato que se llama Suco.', d: '2026-07-20' }]);
  });

  test('un JSON corrupto o de otro shape degrada a memoria vacía, no rompe el turno', async () => {
    prisma.user.findUnique.mockResolvedValue({ memoriaChat: { notas: 'no soy un array', xd: 1 } });
    generarRespuesta.mockResolvedValue('Te leo.');
    const res = await post({ mood: 'NEUTRO', mensaje: 'hola' });

    expect(res.status).toBe(200);
    expect(generarRespuesta.mock.calls[0][0].memoria).toEqual(memoriaVacia());
  });

  test('si la lectura de memoria falla, la conversación sigue igual', async () => {
    prisma.user.findUnique.mockRejectedValue(new Error('no such column'));
    generarRespuesta.mockResolvedValue('Aquí estoy.');
    const res = await post({ mood: 'CALMADO', mensaje: 'todo bien' });

    expect(res.status).toBe(200);
    expect(res.body.fuente).toBe('gemini');
    expect(generarRespuesta.mock.calls[0][0].memoria).toEqual(memoriaVacia());
  });
});

describe('memoria — capa 1: directivas deterministas', () => {
  test('"deja de recordarme lo de Para mí" apaga la sugerencia del hub y se persiste', async () => {
    generarRespuesta.mockResolvedValue('Entendido, no lo menciono más.');
    await post({ mood: 'TRISTE', mensaje: 'deja de recordarme lo de Para mí, por favor' });

    expect(generarRespuesta.mock.calls[0][0].memoria.preferencias.sugerirHub).toBe(false);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { memoriaChat: expect.objectContaining({ preferencias: { sugerirHub: false, humor: 'neutro' } }) },
      }),
    );
  });

  test('la directiva es del mismo turno: ya no hace falta esperar a la sesión siguiente', async () => {
    generarRespuesta.mockResolvedValue('Ok.');
    await post({ mood: 'ANSIOSO', mensaje: 'no me sugieras más actividades' });
    expect(generarRespuesta.mock.calls[0][0].memoria.preferencias.sugerirHub).toBe(false);
  });

  test('"llámame Fran" guarda el apodo', async () => {
    generarRespuesta.mockResolvedValue('Listo, Fran.');
    await post({ mood: 'FELIZ', mensaje: 'llámame Fran mejor' });
    expect(generarRespuesta.mock.calls[0][0].memoria.apodo).toBe('Fran');
  });

  test('un "no me recuerdes" sin referencia al hub no apaga nada', async () => {
    generarRespuesta.mockResolvedValue('Te entiendo.');
    await post({ mood: 'TRISTE', mensaje: 'no me recuerdes a mi ex, por favor' });
    expect(generarRespuesta.mock.calls[0][0].memoria.preferencias.sugerirHub).toBe(true);
  });

  test('sin directiva y con memoria fresca no se escribe nada en la BD', async () => {
    prisma.user.findUnique.mockResolvedValue({
      memoriaChat: { version: 1, actualizada: new Date().toISOString(), notas: [] },
    });
    generarRespuesta.mockResolvedValue('Cuéntame.');
    await post({ mood: 'NEUTRO', mensaje: 'hola' });
    await dejarCorrerSegundoPlano();

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(extraerMemoria).not.toHaveBeenCalled();
  });
});

describe('memoria — capa 2: extractor en segundo plano', () => {
  test('al cerrar la conversación destila notas y las guarda', async () => {
    generarRespuesta.mockResolvedValue('Gracias por contarme.');
    extraerMemoria.mockResolvedValue(['Tiene un gato que se llama Suco.']);
    const historial = [
      { autor: 'usuario', texto: '😢 Triste' },
      { autor: 'bot', texto: 'te leo' },
      { autor: 'usuario', texto: 'mi gato Suco está enfermo' },
      { autor: 'bot', texto: 'suena difícil' },
      { autor: 'usuario', texto: 'sí' },
      { autor: 'bot', texto: 'tiene sentido' },
    ];
    const res = await post({ mood: 'TRISTE', mensaje: 'eso era todo', historial });
    expect(res.body.terminar).toBe(true);

    await dejarCorrerSegundoPlano();
    expect(extraerMemoria).toHaveBeenCalledTimes(1);
    const guardada = prisma.user.update.mock.calls.at(-1)[0].data.memoriaChat;
    expect(guardada.notas).toEqual([
      { t: 'Tiene un gato que se llama Suco.', d: expect.any(String) },
    ]);
  });

  test('una nota del extractor con señales de crisis se descarta antes de guardarse', async () => {
    generarRespuesta.mockResolvedValue('Gracias por contarme.');
    extraerMemoria.mockResolvedValue([
      'Dijo que a veces quiere desaparecer.',
      'Le gusta cocinar los domingos.',
    ]);
    await post({
      mood: 'TRISTE',
      mensaje: 'eso era todo',
      historial: [
        { autor: 'usuario', texto: 'a' },
        { autor: 'usuario', texto: 'b' },
        { autor: 'usuario', texto: 'c' },
      ],
    });

    await dejarCorrerSegundoPlano();
    const guardada = prisma.user.update.mock.calls.at(-1)[0].data.memoriaChat;
    expect(guardada.notas.map((n) => n.t)).toEqual(['Le gusta cocinar los domingos.']);
  });

  test('una nota que infiere causas se descarta', async () => {
    generarRespuesta.mockResolvedValue('Gracias por contarme.');
    extraerMemoria.mockResolvedValue([
      'Probablemente su tristeza viene del trabajo.',
      'Trabaja en una panadería.',
    ]);
    await post({
      mood: 'TRISTE',
      mensaje: 'eso era todo',
      historial: [
        { autor: 'usuario', texto: 'a' },
        { autor: 'usuario', texto: 'b' },
        { autor: 'usuario', texto: 'c' },
      ],
    });

    await dejarCorrerSegundoPlano();
    const guardada = prisma.user.update.mock.calls.at(-1)[0].data.memoriaChat;
    expect(guardada.notas.map((n) => n.t)).toEqual(['Trabaja en una panadería.']);
  });

  test('si el extractor falla, la respuesta ya entregada no se ve afectada', async () => {
    generarRespuesta.mockResolvedValue('Gracias por contarme.');
    extraerMemoria.mockRejectedValue(new Error('Timeout de Gemini'));
    const res = await post({
      mood: 'NEUTRO',
      mensaje: 'eso era todo',
      historial: [
        { autor: 'usuario', texto: 'a' },
        { autor: 'usuario', texto: 'b' },
        { autor: 'usuario', texto: 'c' },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.fuente).toBe('gemini');
    await expect(dejarCorrerSegundoPlano()).resolves.toBeUndefined();
  });
});

describe('memoria — el escudo de crisis corta antes que todo', () => {
  test('un mensaje de crisis no lee, no escribe memoria ni despierta al extractor', async () => {
    const res = await post({ mood: 'TRISTE', mensaje: 'ya no le veo sentido a la vida' });
    await dejarCorrerSegundoPlano();

    expect(res.body.respuesta).toBe(MENSAJE_CRISIS);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(extraerMemoria).not.toHaveBeenCalled();
    expect(generarRespuesta).not.toHaveBeenCalled();
  });

  test('una directiva de tono no sirve de vehículo para saltarse el escudo', async () => {
    const res = await post({
      mood: 'TRISTE',
      mensaje: 'llámame Fran y deja de sugerirme actividades, ya no quiero vivir',
    });
    await dejarCorrerSegundoPlano();

    expect(res.body.respuesta).toBe(MENSAJE_CRISIS);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('relato pedido explícitamente — tope de largo extendido', () => {
  const largo = 'una historia entretenida y tranquila '.repeat(24); // ~890 caracteres

  test('con petición explícita de historia, la respuesta larga se acepta', async () => {
    generarRespuesta.mockResolvedValue(largo);
    const res = await post({ mood: 'TRISTE', mensaje: 'cuéntame una historia' });
    expect(res.body.fuente).toBe('gemini');
  });

  test('sin petición explícita, el mismo texto largo cae a plantilla (brevedad intacta)', async () => {
    generarRespuesta.mockResolvedValue(largo);
    const res = await post({ mood: 'TRISTE', mensaje: 'hoy fue un día pesado' });
    expect(res.body.fuente).toBe('plantilla');
  });

  test('el tope extendido NO relaja los demás filtros: crisis y tono siguen cortando', async () => {
    generarRespuesta.mockResolvedValue(`${largo} Anímate, no es para tanto.`);
    const res = await post({ mood: 'TRISTE', mensaje: 'cuéntame un chiste' });
    expect(res.body.fuente).toBe('plantilla');

    generarRespuesta.mockResolvedValue(`${largo} Llama al 600 360 7777.`);
    const conTelefono = await post({ mood: 'TRISTE', mensaje: 'cuéntame un chiste' });
    expect(conTelefono.body.fuente).toBe('plantilla');
  });

  test('ni siquiera con petición explícita pasa un texto sin límite', async () => {
    generarRespuesta.mockResolvedValue('palabra '.repeat(200)); // 1600 caracteres
    const res = await post({ mood: 'NEUTRO', mensaje: 'cuéntame un cuento' });
    expect(res.body.fuente).toBe('plantilla');
  });
});

describe('tono de las plantillas de fallback (verificación mecánica, como guiones.test.js)', () => {
  for (const [mood, set] of Object.entries(PLANTILLAS)) {
    test.each([...set.seguir, ...set.cierre])(`${mood}: %s`, (frase) => {
      expect(validarTono(frase, mood)).toBe(true);
    });
  }

  test('hay plantillas de seguir y cierre para los 6 moods', () => {
    for (const mood of VALID_MOODS) {
      expect(PLANTILLAS[mood].seguir.length).toBeGreaterThan(0);
      expect(PLANTILLAS[mood].cierre.length).toBeGreaterThan(0);
    }
  });
});

describe('validarTono — unidad', () => {
  test('acepta una respuesta empática normal', () => {
    expect(validarTono('Lo que sientes tiene sentido. ¿Quieres contarme más?', 'TRISTE')).toBe(true);
  });

  test('rechaza texto vacío', () => {
    expect(validarTono('', 'FELIZ')).toBe(false);
    expect(validarTono('   ', 'FELIZ')).toBe(false);
  });

  test('rechaza diagnóstico en cualquier mood', () => {
    expect(validarTono('Eso suena a depresión.', 'FELIZ')).toBe(false);
  });

  test('compara normalizado (tildes): "relájate" cae en mood difícil', () => {
    expect(validarTono('Relájate un poco.', 'ANSIOSO')).toBe(false);
    expect(validarTono('Relájate un poco.', 'CALMADO')).toBe(true);
  });
});
