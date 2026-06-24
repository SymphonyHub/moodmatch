jest.mock('../lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}));

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const authRouter = require('../routes/auth');
const prisma = require('../lib/prisma');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

beforeEach(() => jest.clearAllMocks());

describe('POST /api/auth/register — validación de email', () => {
  test('rechaza email con formato inválido', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nombre: 'Test', email: 'no-es-un-email', password: 'secret123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/inválido/i);
  });

  test('rechaza email sin dominio', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nombre: 'Test', email: 'usuario@', password: 'secret123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/inválido/i);
  });

  test('rechaza email duplicado con 409', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'ya@existe.com' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ nombre: 'Test', email: 'ya@existe.com', password: 'secret123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
  });
});

describe('POST /api/auth/register — contraseña hasheada', () => {
  test('guarda la contraseña hasheada con bcrypt, nunca en texto plano', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async ({ data }) => ({
      id: 1,
      nombre: data.nombre,
      email: data.email,
      qrCode: 'uuid-123',
      createdAt: new Date(),
    }));

    const password = 'secret123';
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nombre: 'Test', email: 'nuevo@test.com', password });

    expect(res.status).toBe(201);

    const createArg = prisma.user.create.mock.calls[0][0];
    const { passwordHash } = createArg.data;

    expect(passwordHash).toBeDefined();
    expect(passwordHash).not.toBe(password);
    expect(await bcrypt.compare(password, passwordHash)).toBe(true);
  });

  test('el campo data.password nunca llega a create (solo passwordHash)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async ({ data }) => ({
      id: 2,
      nombre: data.nombre,
      email: data.email,
      qrCode: 'uuid-456',
      createdAt: new Date(),
    }));

    await request(app)
      .post('/api/auth/register')
      .send({ nombre: 'Otro', email: 'otro@test.com', password: 'mipass456' });

    const createArg = prisma.user.create.mock.calls[0][0];
    expect(createArg.data.password).toBeUndefined();
    expect(createArg.data.passwordHash).toBeDefined();
  });
});
