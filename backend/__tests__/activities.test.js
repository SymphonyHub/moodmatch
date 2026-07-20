jest.mock('../lib/prisma', () => ({
  moodActivity: { findMany: jest.fn() },
  activity: { findMany: jest.fn() },
  user: { findUnique: jest.fn() },
  friendship: { findMany: jest.fn() },
}));

jest.mock('../lib/gemini', () => ({
  generarSugerenciaSocial: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const activitiesRouter = require('../routes/activities');
const prisma = require('../lib/prisma');
const { generarSugerenciaSocial } = require('../lib/gemini');

const token = jwt.sign({ userId: 1 }, 'moodmatch-dev-secret');

const app = express();
app.use(express.json());
app.use('/api/activities', activitiesRouter);

beforeEach(() => jest.clearAllMocks());

const ACTIVIDADES_MOCK = [
  { activityId: 1, moodType: 'FELIZ', activity: { id: 1, nombre: 'Correr', descripcion: 'Sal a correr', categoria: 'deporte' } },
  { activityId: 2, moodType: 'FELIZ', activity: { id: 2, nombre: 'Leer', descripcion: 'Lee un libro', categoria: 'cultura' } },
];

describe('GET /api/activities/random — validación de mood', () => {
  test('rechaza mood inválido con 400', async () => {
    const res = await request(app)
      .get('/api/activities/random?mood=FURIOSO')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mood/i);
  });

  test('rechaza mood vacío con 400', async () => {
    const res = await request(app)
      .get('/api/activities/random')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

describe('GET /api/activities/random — parámetro exclude', () => {
  test('pasa activityId: { not: N } a Prisma cuando se envía exclude=N', async () => {
    prisma.moodActivity.findMany.mockResolvedValue(ACTIVIDADES_MOCK);

    const res = await request(app)
      .get('/api/activities/random?mood=FELIZ&exclude=3')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(prisma.moodActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ activityId: { not: 3 } }),
      })
    );
  });

  test('la actividad devuelta no es la excluida', async () => {
    prisma.moodActivity.findMany.mockResolvedValue(ACTIVIDADES_MOCK);

    const EXCLUDE_ID = 3;
    const res = await request(app)
      .get(`/api/activities/random?mood=FELIZ&exclude=${EXCLUDE_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.activity).not.toBeNull();
    expect(res.body.activity.id).not.toBe(EXCLUDE_ID);
  });

  test('sin exclude no aplica el filtro de exclusión', async () => {
    prisma.moodActivity.findMany.mockResolvedValue(ACTIVIDADES_MOCK);

    await request(app)
      .get('/api/activities/random?mood=FELIZ')
      .set('Authorization', `Bearer ${token}`);

    const whereArg = prisma.moodActivity.findMany.mock.calls[0][0].where;
    expect(whereArg.activityId).toBeUndefined();
  });
});

describe('POST /api/activities/suggest-social', () => {
  const post = (body) =>
    request(app)
      .post('/api/activities/suggest-social')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  beforeEach(() => {
    prisma.user.findUnique.mockResolvedValue({ perfilPersonalidad: null });
    prisma.friendship.findMany.mockResolvedValue([
      {
        userId: 1,
        friendId: 2,
        user: { moodEntries: [] },
        friend: { moodEntries: [{ moodType: 'TRISTE' }] },
      },
    ]);
    generarSugerenciaSocial.mockResolvedValue({
      nombre: 'Caminata y conversación',
      descripcion: 'Invita a un amigo a caminar un rato, sin presión por llenar todos los silencios.',
    });
  });

  test('usa solo moods de amistades y cae a contexto genérico sin perfil', async () => {
    const res = await post();

    expect(res.status).toBe(200);
    expect(res.body.fuente).toBe('gemini');
    expect(res.body.activity).toEqual(expect.objectContaining({
      id: expect.stringMatching(/^social-/),
      categoria: 'social',
      nombre: 'Caminata y conversación',
    }));
    expect(generarSugerenciaSocial).toHaveBeenCalledWith({
      orientacion: 'acompanar_sin_presion',
      perfil: null,
    });
  });

  test('ignora por completo moods, nombres y notas inyectados en el body', async () => {
    await post({
      moods: ['FELIZ'],
      friendName: 'Dato que no debe viajar',
      nota: 'Texto privado',
    });

    expect(generarSugerenciaSocial).toHaveBeenCalledWith({
      orientacion: 'acompanar_sin_presion',
      perfil: null,
    });
    const contexto = JSON.stringify(generarSugerenciaSocial.mock.calls[0][0]);
    expect(contexto).not.toContain('Dato que no debe viajar');
    expect(contexto).not.toContain('Texto privado');
  });

  test('perfilPersonalidad se integra en un único contexto cuando existe', async () => {
    const respuestas = {
      compania: 'grupo_pequeno',
      ritmo: 'tranquilo',
      entorno: 'aire_libre',
      actividad: 'movimiento',
      recarga: 'naturaleza',
      novedad: 'explorar',
    };
    prisma.user.findUnique.mockResolvedValue({
      perfilPersonalidad: {
        version: 1,
        completadoEn: '2026-07-20T12:00:00.000Z',
        respuestas,
      },
    });

    await post();

    const { perfil } = generarSugerenciaSocial.mock.calls[0][0];
    expect(JSON.parse(perfil)).toEqual(respuestas);
  });

  test('deduplica amistades espejo y descarta moods no válidos', async () => {
    prisma.friendship.findMany.mockResolvedValue([
      {
        userId: 1,
        friendId: 2,
        user: { moodEntries: [] },
        friend: { moodEntries: [{ moodType: 'CALMADO' }] },
      },
      {
        userId: 2,
        friendId: 1,
        user: { moodEntries: [{ moodType: 'CALMADO' }] },
        friend: { moodEntries: [] },
      },
      {
        userId: 1,
        friendId: 3,
        user: { moodEntries: [] },
        friend: { moodEntries: [{ moodType: 'CALMADO' }] },
      },
      {
        userId: 1,
        friendId: 4,
        user: { moodEntries: [] },
        friend: { moodEntries: [{ moodType: 'PRIVADO' }] },
      },
    ]);

    await post();

    expect(generarSugerenciaSocial).toHaveBeenCalledWith({
      orientacion: 'compartir_momento_agradable',
      perfil: null,
    });
  });

  test('señal de crisis en el perfil activa fallback y no sale hacia Gemini', async () => {
    prisma.user.findUnique.mockResolvedValue({
      perfilPersonalidad: { comentario: 'A veces me quiero morir' },
    });

    const res = await post();

    expect(res.status).toBe(200);
    expect(res.body.fuente).toBe('plantilla');
    expect(res.body.activity.categoria).toBe('social');
    expect(generarSugerenciaSocial).not.toHaveBeenCalled();
  });

  test('fallo o respuesta insegura de Gemini siempre degrada a plantilla con 200', async () => {
    generarSugerenciaSocial.mockResolvedValue({
      nombre: 'Arréglalo rápido',
      descripcion: 'Dile: anímate, sonríe y mira el lado bueno.',
    });

    const insegura = await post();
    expect(insegura.status).toBe(200);
    expect(insegura.body.fuente).toBe('plantilla');

    generarSugerenciaSocial.mockRejectedValue(new Error('Timeout de Gemini'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fallo = await post();
    warn.mockRestore();
    expect(fallo.status).toBe(200);
    expect(fallo.body.fuente).toBe('plantilla');
  });
});
