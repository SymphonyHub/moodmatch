jest.mock('../lib/prisma', () => {
  const db = {
    moodEntry: {
      create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
    },
    moodActivity: { findMany: jest.fn() },
    suggestion: { create: jest.fn() },
  };
  db.$transaction = jest.fn((callback) => callback(db));
  return db;
});

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const moodEntriesRouter = require('../routes/moodEntries');
const prisma = require('../lib/prisma');

const token = jwt.sign({ userId: 1 }, 'moodmatch-dev-secret');

const app = express();
app.use(express.json());
app.use('/api/mood-entries', moodEntriesRouter);

beforeEach(() => {
  jest.clearAllMocks();
  prisma.moodEntry.findUnique.mockResolvedValue(null);
});

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
      id: 1, userId: 1, clientId: null, moodType: mood, nota: null, createdAt: new Date(),
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

describe('POST /api/mood-entries — idempotencia offline', () => {
  const clientId = '5d2f6a10-e73c-4fe2-8f40-923d59f9b561';
  const actividad = { id: 7, nombre: 'Caminar', descripcion: 'Una vuelta', categoria: 'físico' };
  const entry = {
    id: 20,
    userId: 1,
    clientId,
    moodType: 'CALMADO',
    nota: 'respiré un rato',
    createdAt: new Date('2026-07-20T12:00:00Z'),
  };

  test('crea el registro y su sugerencia dentro de una sola transacción', async () => {
    prisma.moodEntry.create.mockResolvedValue(entry);
    prisma.moodActivity.findMany.mockResolvedValue([{ activityId: 7, activity: actividad }]);
    prisma.suggestion.create.mockResolvedValue({ id: 30, moodEntryId: 20, activityId: 7 });

    const res = await request(app)
      .post('/api/mood-entries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        moodType: 'CALMADO',
        nota: 'respiré un rato',
        clientId,
        capturedAt: '2026-07-20T12:00:00.000Z',
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ moodEntry: expect.objectContaining({ id: 20, clientId }), actividadSugerida: actividad });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.moodEntry.create).toHaveBeenCalledWith({
      data: {
        userId: 1,
        clientId,
        moodType: 'CALMADO',
        nota: 'respiré un rato',
        createdAt: new Date('2026-07-20T12:00:00.000Z'),
      },
    });
    expect(prisma.suggestion.create).toHaveBeenCalledWith({
      data: { moodEntryId: 20, activityId: 7 },
    });
  });

  test('un reintento con el mismo clientId devuelve la creación original', async () => {
    prisma.moodEntry.findUnique.mockResolvedValue({
      ...entry,
      suggestions: [{ activity: actividad }],
    });

    const res = await request(app)
      .post('/api/mood-entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ moodType: 'CALMADO', nota: 'respiré un rato', clientId });

    expect(res.status).toBe(200);
    expect(res.body.moodEntry.id).toBe(entry.id);
    expect(res.body.actividadSugerida).toEqual(actividad);
    expect(prisma.moodEntry.create).not.toHaveBeenCalled();
    expect(prisma.suggestion.create).not.toHaveBeenCalled();
  });

  test('rechaza reutilizar un clientId con otro contenido o usuario', async () => {
    prisma.moodEntry.findUnique.mockResolvedValue({
      ...entry,
      moodType: 'FELIZ',
      suggestions: [{ activity: actividad }],
    });

    const res = await request(app)
      .post('/api/mood-entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ moodType: 'CALMADO', nota: 'respiré un rato', clientId });

    expect(res.status).toBe(409);
  });

  test('rechaza clientId malformado', async () => {
    const res = await request(app)
      .post('/api/mood-entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ moodType: 'FELIZ', clientId: 'no-es-uuid' });

    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('una carrera del índice único recupera y devuelve el registro ganador', async () => {
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    prisma.moodEntry.findUnique.mockResolvedValue({
      ...entry,
      suggestions: [{ activity: actividad }],
    });

    const res = await request(app)
      .post('/api/mood-entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ moodType: 'CALMADO', nota: 'respiré un rato', clientId });

    expect(res.status).toBe(200);
    expect(res.body.moodEntry.id).toBe(entry.id);
    expect(res.body.actividadSugerida).toEqual(actividad);
  });
});

describe('GET /api/mood-entries — historial con ventana de días', () => {
  const DIA_MS = 24 * 60 * 60 * 1000;

  test('rechaza sin token con 401', async () => {
    const res = await request(app).get('/api/mood-entries');
    expect(res.status).toBe(401);
  });

  test('sin registros responde 200 con lista vacía', async () => {
    prisma.moodEntry.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/mood-entries')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ entries: [] });
  });

  test('consulta por defecto: usuario, últimos 30 días, desc, select acotado, tope 200', async () => {
    prisma.moodEntry.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/mood-entries')
      .set('Authorization', `Bearer ${token}`);

    const args = prisma.moodEntry.findMany.mock.calls[0][0];
    expect(args.where.userId).toBe(1);
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
    expect(args.select).toEqual({ id: true, moodType: true, nota: true, createdAt: true });
    expect(args.take).toBe(200);
    const esperado = Date.now() - 30 * DIA_MS;
    expect(Math.abs(args.where.createdAt.gte.getTime() - esperado)).toBeLessThan(5000);
  });

  test('?days=7 corta a una semana', async () => {
    prisma.moodEntry.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/mood-entries?days=7')
      .set('Authorization', `Bearer ${token}`);

    const args = prisma.moodEntry.findMany.mock.calls[0][0];
    const esperado = Date.now() - 7 * DIA_MS;
    expect(Math.abs(args.where.createdAt.gte.getTime() - esperado)).toBeLessThan(5000);
  });

  test.each(['0', '91', 'abc', '7.5'])('rechaza days inválido con 400: %s', async (days) => {
    const res = await request(app)
      .get(`/api/mood-entries?days=${days}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/days/);
  });

  test('devuelve las entries tal cual', async () => {
    const entries = [
      { id: 2, moodType: 'FELIZ', nota: null, createdAt: '2026-07-15T10:00:00.000Z' },
      { id: 1, moodType: 'TRISTE', nota: 'pesado', createdAt: '2026-07-14T09:00:00.000Z' },
    ];
    prisma.moodEntry.findMany.mockResolvedValue(entries);

    const res = await request(app)
      .get('/api/mood-entries')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.entries).toEqual(entries);
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
