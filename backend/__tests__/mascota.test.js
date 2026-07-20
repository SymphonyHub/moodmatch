jest.mock('../lib/prisma', () => {
  const db = {
    friendship: { findFirst: jest.fn() },
    mascotaAmistad: { upsert: jest.fn() },
    cheer: { findFirst: jest.fn(), create: jest.fn() },
  };
  db.$transaction = jest.fn((callback) => callback(db));
  return db;
});
jest.mock('../lib/notificationEvents', () => ({
  dispatchNotification: jest.fn(),
  notifySharedActivity: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const mascotaRouter = require('../routes/mascota');
const prisma = require('../lib/prisma');
const { notifySharedActivity } = require('../lib/notificationEvents');

const MY_USER_ID = 1;
const FRIEND_ID = 2;
const AMISTAD_ID = 7;
const token = jwt.sign({ userId: MY_USER_ID }, 'moodmatch-dev-secret');
const amistad = { id: AMISTAD_ID, userId: FRIEND_ID, friendId: MY_USER_ID };
const mascota = {
  id: 'pet-1', amistadId: AMISTAD_ID, nombre: 'Lumi', nivelCarino: 0,
};

const app = express();
app.use(express.json());
app.use('/api/mascota', mascotaRouter);

beforeEach(() => {
  jest.clearAllMocks();
  prisma.mascotaAmistad.upsert.mockResolvedValue(mascota);
});

describe('GET /api/mascota/:amistadId', () => {
  test('requiere autenticación', async () => {
    const res = await request(app).get(`/api/mascota/${AMISTAD_ID}`);
    expect(res.status).toBe(401);
  });

  test('rechaza ids inválidos', async () => {
    const res = await request(app)
      .get('/api/mascota/no-es-id')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  test('no expone mascotas de amistades ajenas', async () => {
    prisma.friendship.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .get(`/api/mascota/${AMISTAD_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(prisma.mascotaAmistad.upsert).not.toHaveBeenCalled();
  });

  test('crea de forma diferida la mascota si todavía no existe', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    const res = await request(app)
      .get(`/api/mascota/${AMISTAD_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.mascota).toEqual(expect.objectContaining({ nombre: 'Lumi', nivelCarino: 0 }));
    expect(prisma.mascotaAmistad.upsert).toHaveBeenCalledWith({
      where: { amistadId: AMISTAD_ID },
      create: { amistadId: AMISTAD_ID, nombre: 'Lumi', nivelCarino: 0 },
      update: { nivelCarino: { increment: 0 } },
    });
  });
});

describe('POST /api/mascota/:amistadId/actividad', () => {
  test('registra una actividad compartida una sola vez y suma 3 de cariño', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.cheer.findFirst.mockResolvedValue(null);
    prisma.cheer.create.mockResolvedValue({ id: 20 });
    prisma.mascotaAmistad.upsert.mockResolvedValue({ ...mascota, nivelCarino: 3 });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/actividad`)
      .set('Authorization', `Bearer ${token}`)
      .send({ completionId: 'salida:2026-07-20' });

    expect(res.status).toBe(201);
    expect(res.body.registrada).toBe(true);
    expect(prisma.cheer.create).toHaveBeenCalledWith({
      data: {
        fromUserId: MY_USER_ID,
        toUserId: FRIEND_ID,
        message: '__MASCOTA_ACTIVIDAD__:salida:2026-07-20',
        seen: true,
      },
    });
    expect(prisma.mascotaAmistad.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { nivelCarino: { increment: 3 } },
    }));
    expect(notifySharedActivity).toHaveBeenCalledWith({
      fromUserId: MY_USER_ID,
      toUserId: FRIEND_ID,
    });
  });

  test('la misma completionId es idempotente incluso si la marcó el otro usuario', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.cheer.findFirst.mockResolvedValue({ id: 20 });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/actividad`)
      .set('Authorization', `Bearer ${token}`)
      .send({ completionId: 'salida:2026-07-20' });

    expect(res.status).toBe(200);
    expect(res.body.registrada).toBe(false);
    expect(prisma.cheer.create).not.toHaveBeenCalled();
    expect(prisma.mascotaAmistad.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { nivelCarino: { increment: 0 } },
    }));
    expect(notifySharedActivity).not.toHaveBeenCalled();
  });

  test('valida completionId', async () => {
    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/actividad`)
      .set('Authorization', `Bearer ${token}`)
      .send({ completionId: '   ' });

    expect(res.status).toBe(400);
    expect(prisma.friendship.findFirst).not.toHaveBeenCalled();
  });
});
