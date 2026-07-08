jest.mock('../lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const usersRouter = require('../routes/users');
const prisma = require('../lib/prisma');

const MY_USER_ID = 1;
const token = jwt.sign({ userId: MY_USER_ID }, 'moodmatch-dev-secret');

const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);

const usuarioBase = {
  id: MY_USER_ID,
  nombre: 'Test',
  email: 'test@test.com',
  qrCode: 'uuid-123',
  themePreference: 'nocturno',
  createdAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

describe('GET /api/users/me — preferencia de tema', () => {
  test('incluye themePreference en la respuesta', async () => {
    prisma.user.findUnique.mockResolvedValue(usuarioBase);

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.themePreference).toBe('nocturno');
  });

  test('rechaza sin token con 401', async () => {
    const res = await request(app).get('/api/users/me');

    expect(res.status).toBe(401);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/users/me — validación', () => {
  test('rechaza sin token con 401', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .send({ themePreference: 'sereno' });

    expect(res.status).toBe(401);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  test('rechaza body sin themePreference con 400', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Otro' });

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  test('rechaza un tema fuera de la whitelist con 400', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ themePreference: 'temazo-inventado' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/inválido/i);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/users/me — actualización', () => {
  test('guarda un tema válido para el usuario autenticado', async () => {
    prisma.user.update.mockResolvedValue({ ...usuarioBase, themePreference: 'fiesta' });

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ themePreference: 'fiesta' });

    expect(res.status).toBe(200);
    expect(res.body.user.themePreference).toBe('fiesta');

    const updateArg = prisma.user.update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: MY_USER_ID });
    expect(updateArg.data).toEqual({ themePreference: 'fiesta' });
  });

  test('acepta "auto" (seguir el sistema)', async () => {
    prisma.user.update.mockResolvedValue({ ...usuarioBase, themePreference: 'auto' });

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ themePreference: 'auto' });

    expect(res.status).toBe(200);
    expect(res.body.user.themePreference).toBe('auto');
  });

  test('acepta null para volver al tema por defecto', async () => {
    prisma.user.update.mockResolvedValue({ ...usuarioBase, themePreference: null });

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ themePreference: null });

    expect(res.status).toBe(200);
    expect(res.body.user.themePreference).toBeNull();
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ themePreference: null });
  });

  test('nunca expone passwordHash en la respuesta', async () => {
    prisma.user.update.mockResolvedValue({ ...usuarioBase, themePreference: 'sereno' });

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ themePreference: 'sereno' });

    expect(res.body.user.passwordHash).toBeUndefined();

    const updateArg = prisma.user.update.mock.calls[0][0];
    expect(updateArg.select.themePreference).toBe(true);
    expect(updateArg.select.passwordHash).toBeUndefined();
  });
});
