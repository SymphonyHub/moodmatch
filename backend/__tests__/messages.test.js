jest.mock('../lib/prisma', () => {
  const db = {
    friendship: { findFirst: jest.fn() },
    mascotaAmistad: { upsert: jest.fn() },
    cheer: {
      count: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  };
  db.$transaction = jest.fn((callback) => callback(db));
  return db;
});
jest.mock('../lib/notificationEvents', () => ({
  dispatchNotification: jest.fn(),
  notifyNewMessage: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const messagesRouter = require('../routes/messages');
const prisma = require('../lib/prisma');
const { notifyNewMessage } = require('../lib/notificationEvents');

const MY_USER_ID = 1;
const FRIEND_ID = 2;
const token = jwt.sign({ userId: MY_USER_ID }, 'moodmatch-dev-secret');

const app = express();
app.use(express.json());
app.use('/api/messages', messagesRouter);

const amistad = { id: 5, userId: FRIEND_ID, friendId: MY_USER_ID, createdAt: new Date() };

beforeEach(() => {
  jest.clearAllMocks();
  prisma.cheer.count.mockResolvedValue(0);
  prisma.mascotaAmistad.upsert.mockResolvedValue({
    id: 'pet-1', amistadId: amistad.id, nombre: 'Lumi', nivelCarino: 0,
  });
});

describe('auth', () => {
  test('401 sin token en todas las rutas', async () => {
    for (const req of [
      request(app).get('/api/messages/unread-count'),
      request(app).get(`/api/messages/${FRIEND_ID}`),
      request(app).post(`/api/messages/${FRIEND_ID}`).send({ message: 'hola' }),
    ]) {
      const res = await req;
      expect(res.status).toBe(401);
    }
  });
});

describe('GET /api/messages/unread-count', () => {
  test('devuelve el total de mensajes no vistos hacia mí', async () => {
    prisma.cheer.count.mockResolvedValue(4);

    const res = await request(app)
      .get('/api/messages/unread-count')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(4);
    expect(prisma.cheer.count).toHaveBeenCalledWith({
      where: { toUserId: MY_USER_ID, seen: false },
    });
  });
});

describe('GET /api/messages/:friendId', () => {
  test('403 si no hay amistad en ninguna dirección', async () => {
    prisma.friendship.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/messages/${FRIEND_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  test('devuelve la conversación en ambas direcciones y marca vistos los entrantes', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.cheer.findMany.mockResolvedValue([
      { id: 1, fromUserId: FRIEND_ID, toUserId: MY_USER_ID, message: 'hola', seen: false, createdAt: new Date('2026-07-14T10:00:00Z') },
      { id: 2, fromUserId: MY_USER_ID, toUserId: FRIEND_ID, message: 'buenas!', seen: true, createdAt: new Date('2026-07-14T10:01:00Z') },
    ]);
    prisma.cheer.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .get(`/api/messages/${FRIEND_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.mensajes).toEqual([
      expect.objectContaining({ id: 1, message: 'hola', mine: false }),
      expect.objectContaining({ id: 2, message: 'buenas!', mine: true }),
    ]);
    expect(prisma.cheer.updateMany).toHaveBeenCalledWith({
      where: { fromUserId: FRIEND_ID, toUserId: MY_USER_ID, seen: false },
      data: { seen: true },
    });
    expect(prisma.cheer.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        NOT: { message: { startsWith: '__MASCOTA_ACTIVIDAD__:' } },
      }),
    }));
  });

  test('400 con friendId no numérico que no matchea otra ruta', async () => {
    const res = await request(app)
      .get('/api/messages/abc')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

describe('POST /api/messages/:friendId', () => {
  test('envía texto libre y responde 201 con el mensaje', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.cheer.create.mockResolvedValue({
      id: 9, fromUserId: MY_USER_ID, toUserId: FRIEND_ID, message: 'te va a ir genial mañana', seen: false, createdAt: new Date(),
    });

    const res = await request(app)
      .post(`/api/messages/${FRIEND_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ message: '  te va a ir genial mañana  ' });

    expect(res.status).toBe(201);
    expect(res.body.mensaje).toEqual(expect.objectContaining({ id: 9, mine: true }));
    // el texto se guarda con trim
    expect(prisma.cheer.create).toHaveBeenCalledWith({
      data: { fromUserId: MY_USER_ID, toUserId: FRIEND_ID, message: 'te va a ir genial mañana' },
    });
    expect(notifyNewMessage).toHaveBeenCalledWith({
      fromUserId: MY_USER_ID,
      toUserId: FRIEND_ID,
    });
  });

  test('400 con mensaje vacío o solo espacios', async () => {
    const res = await request(app)
      .post(`/api/messages/${FRIEND_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ message: '   ' });

    expect(res.status).toBe(400);
    expect(prisma.cheer.create).not.toHaveBeenCalled();
  });

  test('400 con mensaje de más de 500 caracteres', async () => {
    const res = await request(app)
      .post(`/api/messages/${FRIEND_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'a'.repeat(501) });

    expect(res.status).toBe(400);
    expect(prisma.cheer.create).not.toHaveBeenCalled();
  });

  test('403 si no son amigos', async () => {
    prisma.friendship.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/messages/${FRIEND_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'hola' });

    expect(res.status).toBe(403);
    expect(prisma.cheer.create).not.toHaveBeenCalled();
  });

  test('mensajes de un solo lado no suben el cariño', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.cheer.create.mockResolvedValue({
      id: 10, fromUserId: MY_USER_ID, toUserId: FRIEND_ID, message: 'otro mensaje', createdAt: new Date(),
    });
    prisma.cheer.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1);

    await request(app)
      .post(`/api/messages/${FRIEND_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'otro mensaje' });

    expect(prisma.mascotaAmistad.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { nivelCarino: { increment: 0 } },
    }));
  });

  test('una respuesta que completa un par recíproco suma 2 de cariño', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.cheer.create.mockResolvedValue({
      id: 11, fromUserId: MY_USER_ID, toUserId: FRIEND_ID, message: 'respuesta', createdAt: new Date(),
    });
    prisma.cheer.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);

    await request(app)
      .post(`/api/messages/${FRIEND_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'respuesta' });

    expect(prisma.mascotaAmistad.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { nivelCarino: { increment: 2 } },
    }));
  });
});
