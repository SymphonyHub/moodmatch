jest.mock('../lib/prisma', () => ({
  moodEntry: { create: jest.fn(), findFirst: jest.fn() },
  moodActivity: { findMany: jest.fn() },
  suggestion: { create: jest.fn() },
}));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const moodEntriesRouter = require('../routes/moodEntries');
const prisma = require('../lib/prisma');

const token = jwt.sign({ userId: 1 }, 'moodmatch-dev-secret');

const app = express();
app.use(express.json());
app.use('/api/mood-entries', moodEntriesRouter);

beforeEach(() => jest.clearAllMocks());

const VALID_MOODS = ['FELIZ', 'TRISTE', 'ANSIOSO', 'CALMADO', 'ENOJADO', 'NEUTRO'];

describe('POST /api/mood-entries — validación de moodType', () => {
  test('rechaza moodType que no está en el enum con 400', async () => {
    const res = await request(app)
      .post('/api/mood-entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ moodType: 'ENOJADISIMO' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/moodType/i);
  });

  test('rechaza moodType en minúsculas (el enum es estricto)', async () => {
    const res = await request(app)
      .post('/api/mood-entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ moodType: 'feliz' });

    expect(res.status).toBe(400);
  });

  test('rechaza ausencia de moodType con 400', async () => {
    const res = await request(app)
      .post('/api/mood-entries')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  test.each(VALID_MOODS)('acepta moodType válido: %s', async (mood) => {
    prisma.moodEntry.create.mockResolvedValue({
      id: 1, userId: 1, moodType: mood, nota: null, createdAt: new Date(),
    });
    prisma.moodActivity.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/mood-entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ moodType: mood });

    expect(res.status).toBe(201);
    expect(res.body.moodEntry.moodType).toBe(mood);
  });
});

describe('GET /api/mood-entries/latest', () => {
  const actividad = { id: 7, nombre: 'Caminar', descripcion: 'Una vuelta corta', categoria: 'físico' };

  test('rechaza sin token con 401', async () => {
    const res = await request(app).get('/api/mood-entries/latest');
    expect(res.status).toBe(401);
  });

  test('sin registros responde 200 con nulls (vacío es estado normal)', async () => {
    prisma.moodEntry.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/mood-entries/latest')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ moodEntry: null, actividad: null });
  });

  test('devuelve el último registro del usuario con su sugerencia aplanada', async () => {
    const createdAt = '2026-07-15T12:00:00.000Z';
    prisma.moodEntry.findFirst.mockResolvedValue({
      id: 42,
      userId: 1,
      moodType: 'TRISTE',
      nota: 'un día pesado',
      createdAt,
      suggestions: [{ id: 9, moodEntryId: 42, activityId: 7, createdAt, activity: actividad }],
    });

    const res = await request(app)
      .get('/api/mood-entries/latest')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.moodEntry).toEqual({
      id: 42, userId: 1, moodType: 'TRISTE', nota: 'un día pesado', createdAt,
    });
    expect(res.body.moodEntry.suggestions).toBeUndefined();
    expect(res.body.actividad).toEqual(actividad);

    // Consulta correcta: del usuario autenticado, la más reciente, con su
    // última sugerencia incluida.
    expect(prisma.moodEntry.findFirst).toHaveBeenCalledWith({
      where: { userId: 1 },
      orderBy: { createdAt: 'desc' },
      include: {
        suggestions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { activity: true },
        },
      },
    });
  });

  test('registro sin sugerencias devuelve actividad null', async () => {
    prisma.moodEntry.findFirst.mockResolvedValue({
      id: 43, userId: 1, moodType: 'NEUTRO', nota: null,
      createdAt: '2026-07-15T13:00:00.000Z', suggestions: [],
    });

    const res = await request(app)
      .get('/api/mood-entries/latest')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.moodEntry.id).toBe(43);
    expect(res.body.actividad).toBeNull();
  });
});
