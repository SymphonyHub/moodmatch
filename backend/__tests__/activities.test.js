jest.mock('../lib/prisma', () => ({
  moodActivity: { findMany: jest.fn() },
}));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const activitiesRouter = require('../routes/activities');
const prisma = require('../lib/prisma');

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
