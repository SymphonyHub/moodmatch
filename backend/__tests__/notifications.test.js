jest.mock('../lib/prisma', () => {
  const db = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
  };
  db.$transaction = jest.fn((callback) => callback(db));
  return db;
});

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const notificationsRouter = require('../routes/notifications');
const prisma = require('../lib/prisma');

const USER_ID = 1;
const token = jwt.sign({ userId: USER_ID }, 'moodmatch-dev-secret');
const auth = (req) => req.set('Authorization', `Bearer ${token}`);
const app = express();
app.use(express.json());
app.use('/api/notifications', notificationsRouter);

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.update.mockResolvedValue({});
  prisma.user.updateMany.mockResolvedValue({ count: 0 });
});

describe('preferencias y token push', () => {
  test('todas las rutas requieren sesión', async () => {
    expect((await request(app).get('/api/notifications')).status).toBe(401);
    expect((await request(app).put('/api/notifications/token').send({})).status).toBe(401);
    expect((await request(app).patch('/api/notifications/preferences').send({ mensajes: false })).status).toBe(401);
  });

  test('GET entrega defaults públicos y estado del token', async () => {
    prisma.user.findUnique.mockResolvedValue({
      expoPushToken: 'ExponentPushToken[abc]',
      notificationPreferences: { mensajes: false, _meta: { timeZone: 'America/Santiago' } },
    });
    const res = await auth(request(app).get('/api/notifications'));

    expect(res.status).toBe(200);
    expect(res.body.tokenRegistered).toBe(true);
    expect(res.body.preferences.mensajes).toBe(false);
    expect(res.body.preferences.recordatorio).toBe(true);
    expect(res.body.preferences._meta).toBeUndefined();
  });

  test('PUT registra token, zona horaria y lo quita de una cuenta anterior', async () => {
    prisma.user.findUnique.mockResolvedValue({ notificationPreferences: null });
    const expoPushToken = 'ExpoPushToken[device-1]';
    const res = await auth(request(app).put('/api/notifications/token'))
      .send({ expoPushToken, timeZone: 'America/Santiago' });

    expect(res.status).toBe(200);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { expoPushToken, id: { not: USER_ID } },
      data: { expoPushToken: null },
    });
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      expoPushToken,
    );
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: USER_ID },
      data: expect.objectContaining({
        expoPushToken,
        notificationPreferences: expect.objectContaining({
          _meta: expect.objectContaining({ timeZone: 'America/Santiago' }),
        }),
      }),
    }));
    expect(res.body.unregister).toEqual({
      userId: USER_ID,
      expoPushToken,
      unregisterToken: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  test('PUT rechaza tokens ajenos al formato Expo', async () => {
    const res = await auth(request(app).put('/api/notifications/token'))
      .send({ expoPushToken: 'fcm-token' });
    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  test('PATCH mezcla toggles conservando metadata interna', async () => {
    prisma.user.findUnique.mockResolvedValue({
      notificationPreferences: {
        mensajes: true,
        _meta: { timeZone: 'America/Santiago', sent: { recordatorio: 'ayer' } },
      },
    });
    const res = await auth(request(app).patch('/api/notifications/preferences'))
      .send({ mensajes: false, noMolestar: { desde: '22:00', hasta: '08:00' } });

    expect(res.status).toBe(200);
    const saved = prisma.user.update.mock.calls[0][0].data.notificationPreferences;
    expect(saved.mensajes).toBe(false);
    expect(saved._meta.timeZone).toBe('America/Santiago');
    expect(res.body.preferences._meta).toBeUndefined();
  });

  test('DELETE autenticado desvincula solo el dispositivo indicado', async () => {
    const expoPushToken = 'ExponentPushToken[device-1]';
    const res = await auth(request(app).delete('/api/notifications/token'))
      .send({ expoPushToken });
    expect(res.status).toBe(204);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: USER_ID, expoPushToken }, data: { expoPushToken: null },
    });
  });

  test('credencial de logout diferido no requiere JWT y solo vale para su token', async () => {
    prisma.user.findUnique.mockResolvedValue({ notificationPreferences: null });
    const expoPushToken = 'ExponentPushToken[device-offline]';
    const registration = await auth(request(app).put('/api/notifications/token'))
      .send({ expoPushToken });
    jest.clearAllMocks();

    const res = await request(app)
      .post('/api/notifications/token/unregister')
      .send(registration.body.unregister);
    expect(res.status).toBe(204);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: USER_ID, expoPushToken }, data: { expoPushToken: null },
    });

    const altered = await request(app)
      .post('/api/notifications/token/unregister')
      .send({ ...registration.body.unregister, expoPushToken: 'ExponentPushToken[otro]' });
    expect(altered.status).toBe(401);
  });
});
