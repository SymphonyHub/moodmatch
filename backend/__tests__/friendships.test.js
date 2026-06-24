jest.mock('../lib/prisma', () => ({
  user: { findUnique: jest.fn() },
  friendship: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
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
    prisma.friendship.findUnique.mockResolvedValue({
      id: 1, userId: MY_USER_ID, friendId: 2, createdAt: new Date(),
    });

    const res = await request(app)
      .post('/api/friendships')
      .set('Authorization', `Bearer ${token}`)
      .send({ qrCode: 'codigo-amigo' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/amigos/i);
  });

  test('verifica el par correcto userId+friendId al buscar duplicado', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 2,
      nombre: 'Amigo',
      email: 'amigo@test.com',
      qrCode: 'codigo-amigo',
    });
    prisma.friendship.findUnique.mockResolvedValue(null);
    prisma.friendship.create.mockResolvedValue({
      id: 1, userId: MY_USER_ID, friendId: 2, createdAt: new Date(),
    });

    await request(app)
      .post('/api/friendships')
      .set('Authorization', `Bearer ${token}`)
      .send({ qrCode: 'codigo-amigo' });

    expect(prisma.friendship.findUnique).toHaveBeenCalledWith({
      where: { userId_friendId: { userId: MY_USER_ID, friendId: 2 } },
    });
  });
});
