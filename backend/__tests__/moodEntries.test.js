jest.mock('../lib/prisma', () => ({
  moodEntry: { create: jest.fn() },
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
