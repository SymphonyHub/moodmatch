jest.mock('../lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Prisma } = require('@prisma/client');
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
  customTheme: null,
  createdAt: new Date(),
};

const paletaValida = {
  primary: '#4a5fc1',
  accent: '#b34c30',
  background: '#f5f6fa',
  bodyFont: 'manrope',
};

// Contenedor multi-paleta (Fase 10 P2): forma nueva que persiste el frontend.
const contenedorValido = {
  activeId: 'p1',
  palettes: [
    { id: 'p1', name: 'Día', ...paletaValida },
    { id: 'p2', name: 'Noche', primary: '#93a3f0', accent: '#f0977a', background: '#12141c', bodyFont: 'lora' },
  ],
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

  test('acepta "personalizado" como preferencia', async () => {
    prisma.user.update.mockResolvedValue({ ...usuarioBase, themePreference: 'personalizado' });

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ themePreference: 'personalizado' });

    expect(res.status).toBe(200);
    expect(res.body.user.themePreference).toBe('personalizado');
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

describe('GET /api/users/me — paleta personalizada', () => {
  test('incluye customTheme en la respuesta', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...usuarioBase, customTheme: paletaValida });

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.customTheme).toEqual(paletaValida);
  });
});

describe('PATCH /api/users/me — paleta personalizada', () => {
  test('guarda una paleta válida', async () => {
    prisma.user.update.mockResolvedValue({ ...usuarioBase, customTheme: paletaValida });

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ customTheme: paletaValida });

    expect(res.status).toBe(200);
    expect(res.body.user.customTheme).toEqual(paletaValida);
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ customTheme: paletaValida });
  });

  test('acepta themePreference y customTheme en un solo PATCH', async () => {
    prisma.user.update.mockResolvedValue({
      ...usuarioBase,
      themePreference: 'personalizado',
      customTheme: paletaValida,
    });

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ themePreference: 'personalizado', customTheme: paletaValida });

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({
      themePreference: 'personalizado',
      customTheme: paletaValida,
    });
  });

  test('customTheme null limpia la paleta usando Prisma.DbNull', async () => {
    prisma.user.update.mockResolvedValue({ ...usuarioBase, customTheme: null });

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ customTheme: null });

    expect(res.status).toBe(200);
    // null plano en data lanzaría en runtime con una columna Json: debe ser DbNull.
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ customTheme: Prisma.DbNull });
  });

  test('acepta el contenedor multi-paleta y lo guarda tal cual', async () => {
    prisma.user.update.mockResolvedValue({ ...usuarioBase, customTheme: contenedorValido });

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ customTheme: contenedorValido });

    expect(res.status).toBe(200);
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ customTheme: contenedorValido });
  });

  test.each([
    ['hex inválido', { ...paletaValida, primary: '#12g' }],
    ['hex corto', { ...paletaValida, background: '#fff' }],
    ['fuente fuera de whitelist', { ...paletaValida, bodyFont: 'comic-sans' }],
    ['clave extra', { ...paletaValida, sorpresa: '#000000' }],
    ['clave faltante', { primary: '#4a5fc1', accent: '#b34c30', background: '#f5f6fa' }],
    ['array', ['#4a5fc1']],
    ['string', 'no-un-objeto'],
    ['contenedor sin paletas', { activeId: 'p1', palettes: [] }],
    ['contenedor con activeId ausente', { activeId: 'z', palettes: [{ id: 'p1', name: 'Día', ...paletaValida }] }],
    ['paleta sin nombre en el contenedor', { activeId: 'p1', palettes: [{ id: 'p1', ...paletaValida }] }],
  ])('rechaza paleta inválida (%s) con 400', async (_caso, customTheme) => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ customTheme });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/inválida/i);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
