jest.mock('../lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  friendship: {
    findMany: jest.fn(),
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
  perfilPersonalidad: null,
  avatarUrl: null,
  racha: 4,
  createdAt: new Date(),
};

const perfilValido = {
  version: 1,
  completadoEn: '2026-07-20T12:00:00.000Z',
  respuestas: {
    compania: 'grupo_pequeno',
    ritmo: 'equilibrado',
    entorno: 'aire_libre',
    actividad: 'creativa',
    recarga: 'musica',
    novedad: 'explorar',
  },
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
    expect(res.body.user.avatarUrl).toBeNull();
  });

  test('rechaza sin token con 401', async () => {
    const res = await request(app).get('/api/users/me');

    expect(res.status).toBe(401);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe('perfil de personalidad', () => {
  test('GET /me expone perfilPersonalidad para otros consumidores', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...usuarioBase, perfilPersonalidad: perfilValido });

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.perfilPersonalidad).toEqual(perfilValido);
    expect(prisma.user.findUnique.mock.calls[0][0].select.perfilPersonalidad).toBe(true);
  });

  test('PATCH /me persiste el shape v1 completo', async () => {
    prisma.user.update.mockResolvedValue({ ...usuarioBase, perfilPersonalidad: perfilValido });

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ perfilPersonalidad: perfilValido });

    expect(res.status).toBe(200);
    expect(res.body.user.perfilPersonalidad).toEqual(perfilValido);
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ perfilPersonalidad: perfilValido });
  });

  test.each([
    ['versión desconocida', { ...perfilValido, version: 2 }],
    ['respuesta inválida', { ...perfilValido, respuestas: { ...perfilValido.respuestas, ritmo: 'caotico' } }],
    ['respuesta faltante', { ...perfilValido, respuestas: { ...perfilValido.respuestas, novedad: undefined } }],
    ['fecha inválida', { ...perfilValido, completadoEn: 'ayer' }],
    ['clave extra', { ...perfilValido, extra: true }],
  ])('rechaza perfil inválido: %s', async (_caso, perfilPersonalidad) => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ perfilPersonalidad });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/personalidad inválido/i);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/users/me — avatar', () => {
  const avatarUrl = 'https://res.cloudinary.com/g0vemv0z/image/upload/v1/avatar.jpg';

  test('persiste una URL HTTPS de imagen de Cloudinary', async () => {
    prisma.user.update.mockResolvedValue({ ...usuarioBase, avatarUrl });

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatarUrl });

    expect(res.status).toBe(200);
    expect(res.body.user.avatarUrl).toBe(avatarUrl);
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ avatarUrl });
  });

  test.each([
    'http://res.cloudinary.com/demo/image/upload/avatar.jpg',
    'https://example.com/avatar.jpg',
    'https://res.cloudinary.com/otro-cloud/image/upload/avatar.jpg',
    'https://res.cloudinary.com/demo/raw/upload/avatar.jpg',
    'no-es-url',
  ])('rechaza una URL ajena al almacenamiento permitido: %s', async (avatarUrlInvalida) => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatarUrl: avatarUrlInvalida });

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
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

  test.each(['grenzeGotisch', 'macondo'])('acepta la fuente nueva %s', async (bodyFont) => {
    const customTheme = { ...paletaValida, bodyFont };
    prisma.user.update.mockResolvedValue({ ...usuarioBase, customTheme });

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ customTheme });

    expect(res.status).toBe(200);
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ customTheme });
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

describe('racha', () => {
  test('GET /me expone racha para el perfil', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...usuarioBase, racha: 7 });

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.racha).toBe(7);
    expect(prisma.user.findUnique.mock.calls[0][0].select.racha).toBe(true);
  });

  test('PATCH /me persiste una racha entera válida', async () => {
    prisma.user.update.mockResolvedValue({ ...usuarioBase, racha: 12 });

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ racha: 12 });

    expect(res.status).toBe(200);
    expect(res.body.user.racha).toBe(12);
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ racha: 12 });
  });

  test('PATCH /me acepta racha 0', async () => {
    prisma.user.update.mockResolvedValue({ ...usuarioBase, racha: 0 });

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ racha: 0 });

    expect(res.status).toBe(200);
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ racha: 0 });
  });

  test.each([
    ['negativa', -1],
    ['no entera', 3.5],
    ['string', '5'],
    ['fuera de rango', 100001],
  ])('rechaza racha inválida (%s) con 400', async (_caso, racha) => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ racha });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/racha inválida/i);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('GET /api/users/me/mascotas', () => {
  const mascotaAceptada = {
    id: 'm1',
    nombre: 'Lumi',
    nivelCarino: 12,
    activa: true,
    invitacionEstado: 'aceptada',
  };

  test('lista solo mascotas activas y aceptadas, en formato compacto', async () => {
    prisma.friendship.findMany.mockResolvedValue([
      {
        id: 10,
        userId: MY_USER_ID,
        friendId: 2,
        user: { id: MY_USER_ID, nombre: 'Yo', avatarUrl: null },
        friend: { id: 2, nombre: 'Ana', avatarUrl: 'https://x/a.jpg' },
        mascota: mascotaAceptada,
      },
      // Invitación enviada pero aún no aceptada: NO debe aparecer.
      {
        id: 11,
        userId: MY_USER_ID,
        friendId: 3,
        user: { id: MY_USER_ID, nombre: 'Yo', avatarUrl: null },
        friend: { id: 3, nombre: 'Beto', avatarUrl: null },
        mascota: { ...mascotaAceptada, id: 'm2', invitacionEstado: 'pendiente' },
      },
      // Mascota archivada (amistad eliminada): NO debe aparecer.
      {
        id: 12,
        userId: 4,
        friendId: MY_USER_ID,
        user: { id: 4, nombre: 'Caro', avatarUrl: null },
        friend: { id: MY_USER_ID, nombre: 'Yo', avatarUrl: null },
        mascota: { ...mascotaAceptada, id: 'm3', activa: false },
      },
    ]);

    const res = await request(app)
      .get('/api/users/me/mascotas')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.mascotas).toEqual([
      {
        amistadId: 10,
        amigoId: 2,
        amigoNombre: 'Ana',
        amigoAvatarUrl: 'https://x/a.jpg',
        nombre: 'Lumi',
        nivelCarino: 12,
      },
    ]);
  });

  test('deduplica por el otro usuario en vínculos espejo', async () => {
    prisma.friendship.findMany.mockResolvedValue([
      {
        id: 10,
        userId: MY_USER_ID,
        friendId: 2,
        user: { id: MY_USER_ID, nombre: 'Yo', avatarUrl: null },
        friend: { id: 2, nombre: 'Ana', avatarUrl: null },
        mascota: mascotaAceptada,
      },
      {
        id: 20,
        userId: 2,
        friendId: MY_USER_ID,
        user: { id: 2, nombre: 'Ana', avatarUrl: null },
        friend: { id: MY_USER_ID, nombre: 'Yo', avatarUrl: null },
        mascota: { ...mascotaAceptada, id: 'm9' },
      },
    ]);

    const res = await request(app)
      .get('/api/users/me/mascotas')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.mascotas).toHaveLength(1);
    expect(res.body.mascotas[0].amigoId).toBe(2);
  });

  test('responde lista vacía sin mascotas', async () => {
    prisma.friendship.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/users/me/mascotas')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.mascotas).toEqual([]);
  });

  test('rechaza sin token con 401', async () => {
    const res = await request(app).get('/api/users/me/mascotas');

    expect(res.status).toBe(401);
    expect(prisma.friendship.findMany).not.toHaveBeenCalled();
  });
});
