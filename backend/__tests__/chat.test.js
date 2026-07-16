// Tests del endpoint POST /api/chat/respond (CONTRATO-GEMINI.md): contrato de
// request/response, doble escudo de crisis, validador de tono post-respuesta
// y fallback transparente por plantilla (nunca 5xx por el modelo).

jest.mock('../lib/gemini', () => ({
  generarRespuesta: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const chatRouter = require('../routes/chat');
const { generarRespuesta } = require('../lib/gemini');
const { MENSAJE_CRISIS, validarTono } = require('../lib/tonoCrisis');
const { PLANTILLAS } = require('../lib/plantillas');

const token = jwt.sign({ userId: 1 }, 'moodmatch-dev-secret');

const app = express();
app.use(express.json());
app.use('/api/chat', chatRouter);

const post = (body) =>
  request(app).post('/api/chat/respond').set('Authorization', `Bearer ${token}`).send(body);

beforeEach(() => jest.clearAllMocks());

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
