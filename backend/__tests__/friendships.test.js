jest.mock('../lib/prisma', () => ({
  user: { findUnique: jest.fn() },
  friendship: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  cheer: {
    groupBy: jest.fn(),
    create: jest.fn(),
  },
}));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const friendshipsRouter = require('../routes/friendships');
const prisma = require('../lib/prisma');

const MY_USER_ID = 1;
const token = jwt.sign({ userId: MY_USER_ID }, 'moodmatch-dev-secret');

const app = express();
app.use(express.json());
app.use('/api/friendships', friendshipsRouter);

beforeEach(() => jest.clearAllMocks());

describe('POST /api/friendships — auto-amistad', () => {
  test('bloquea agregarse a sí mismo (userId === friendId) con 400', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: MY_USER_ID,
      nombre: 'Yo',
      email: 'yo@test.com',
      qrCode: 'mi-codigo-qr',
    });

    const res = await request(app)
      .post('/api/friendships')
      .set('Authorization', `Bearer ${token}`)
      .send({ qrCode: 'mi-codigo-qr' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ti mismo/i);
  });
});

describe('POST /api/friendships — par duplicado', () => {
  test('bloquea amistad ya existente con 409', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 2,
      nombre: 'Amigo',
      email: 'amigo@test.com',
      qrCode: 'codigo-amigo',
    });
    prisma.friendship.findFirst.mockResolvedValue({
      id: 1, userId: MY_USER_ID, friendId: 2, createdAt: new Date(),
    });

    const res = await request(app)
      .post('/api/friendships')
      .set('Authorization', `Bearer ${token}`)
      .send({ qrCode: 'codigo-amigo' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/amigos/i);
  });

  test('el duplicado se busca en ambas direcciones (vínculo simétrico)', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 2,
      nombre: 'Amigo',
      email: 'amigo@test.com',
      qrCode: 'codigo-amigo',
    });
    prisma.friendship.findFirst.mockResolvedValue(null);
    prisma.friendship.create.mockResolvedValue({
      id: 1, userId: MY_USER_ID, friendId: 2, createdAt: new Date(),
    });

    await request(app)
      .post('/api/friendships')
      .set('Authorization', `Bearer ${token}`)
      .send({ qrCode: 'codigo-amigo' });

    expect(prisma.friendship.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { userId: MY_USER_ID, friendId: 2 },
          { userId: 2, friendId: MY_USER_ID },
        ],
      },
    });
  });
});

describe('GET /api/friendships — vínculo simétrico', () => {
  const entradaMood = (moodType) => [{ moodType, createdAt: new Date('2026-07-14T10:00:00Z') }];

  test('lista amigos donde soy userId Y donde soy friendId, con dedupe', async () => {
    prisma.friendship.findMany.mockResolvedValue([
      // Yo agregué a 2
      {
        userId: MY_USER_ID,
        friendId: 2,
        user: { id: MY_USER_ID, nombre: 'Yo', moodEntries: [] },
        friend: {
          id: 2,
          nombre: 'Ana',
          avatarUrl: 'https://res.cloudinary.com/demo/image/upload/ana.jpg',
          moodEntries: entradaMood('FELIZ'),
        },
      },
      // 3 me agregó a mí
      {
        userId: 3,
        friendId: MY_USER_ID,
        user: { id: 3, nombre: 'Beto', moodEntries: [] },
        friend: { id: MY_USER_ID, nombre: 'Yo', moodEntries: [] },
      },
      // Fila espejo duplicada con 2 (2 también me agregó)
      {
        userId: 2,
        friendId: MY_USER_ID,
        user: { id: 2, nombre: 'Ana', moodEntries: entradaMood('FELIZ') },
        friend: { id: MY_USER_ID, nombre: 'Yo', moodEntries: [] },
      },
    ]);
    prisma.cheer.groupBy.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/friendships')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.amigos).toHaveLength(2);
    expect(res.body.amigos.map((a) => a.id).sort()).toEqual([2, 3]);
    const ana = res.body.amigos.find((a) => a.id === 2);
    expect(ana.nombre).toBe('Ana');
    expect(ana.avatarUrl).toBe('https://res.cloudinary.com/demo/image/upload/ana.jpg');
    expect(ana.moodReciente).toBe('FELIZ');
  });

  test('incluye unread por amigo desde cheers no vistos', async () => {
    prisma.friendship.findMany.mockResolvedValue([
      {
        userId: MY_USER_ID,
        friendId: 2,
        user: { id: MY_USER_ID, nombre: 'Yo', moodEntries: [] },
        friend: { id: 2, nombre: 'Ana', moodEntries: [] },
      },
    ]);
    prisma.cheer.groupBy.mockResolvedValue([
      { fromUserId: 2, _count: { _all: 3 } },
    ]);

    const res = await request(app)
      .get('/api/friendships')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.amigos[0].unread).toBe(3);
    expect(prisma.cheer.groupBy).toHaveBeenCalledWith({
      by: ['fromUserId'],
      where: { toUserId: MY_USER_ID, seen: false },
      _count: { _all: true },
    });
  });
});

describe('GET /api/friendships/count — conteo ligero', () => {
  test('rechaza sin token con 401', async () => {
    const res = await request(app).get('/api/friendships/count');

    expect(res.status).toBe(401);
    expect(prisma.friendship.findMany).not.toHaveBeenCalled();
  });

  test('sin amistades devuelve { count: 0 }', async () => {
    prisma.friendship.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/friendships/count')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 0 });
  });

  test('deduplica filas espejo (A→B y B→A cuentan como 1)', async () => {
    prisma.friendship.findMany.mockResolvedValue([
      { userId: MY_USER_ID, friendId: 2 },
      { userId: 2, friendId: MY_USER_ID },
    ]);

    const res = await request(app)
      .get('/api/friendships/count')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body).toEqual({ count: 1 });
  });

  test('suma "yo agregué" y "me agregaron" sin duplicar', async () => {
    prisma.friendship.findMany.mockResolvedValue([
      { userId: MY_USER_ID, friendId: 2 },
      { userId: 3, friendId: MY_USER_ID },
      { userId: MY_USER_ID, friendId: 4 },
      { userId: 4, friendId: MY_USER_ID }, // espejo de 4
    ]);

    const res = await request(app)
      .get('/api/friendships/count')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body).toEqual({ count: 3 });
  });

  test('usa la consulta ligera (solo userId/friendId, sin includes)', async () => {
    prisma.friendship.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/friendships/count')
      .set('Authorization', `Bearer ${token}`);

    expect(prisma.friendship.findMany).toHaveBeenCalledWith({
      where: { OR: [{ userId: MY_USER_ID }, { friendId: MY_USER_ID }] },
      select: { userId: true, friendId: true },
    });
  });
});

describe('POST /api/friendships/:friendId/cheer — amistad simétrica', () => {
  test('permite enviar cheer cuando el otro me agregó a mí', async () => {
    prisma.friendship.findFirst.mockResolvedValue({
      id: 7, userId: 2, friendId: MY_USER_ID, createdAt: new Date(),
    });
    prisma.cheer.create.mockResolvedValue({
      id: 1, fromUserId: MY_USER_ID, toUserId: 2, message: '💚 Pensando en ti',
    });

    const res = await request(app)
      .post('/api/friendships/2/cheer')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: '💚 Pensando en ti' });

    expect(res.status).toBe(201);
  });

  test('403 si no hay vínculo en ninguna dirección', async () => {
    prisma.friendship.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/friendships/2/cheer')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: '💚 Pensando en ti' });

    expect(res.status).toBe(403);
  });
});
