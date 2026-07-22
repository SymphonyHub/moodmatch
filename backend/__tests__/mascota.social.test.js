jest.mock('../lib/prisma', () => {
  const db = {
    friendship: { findFirst: jest.fn() },
    mascotaAmistad: { upsert: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    cheer: { findFirst: jest.fn(), create: jest.fn(), count: jest.fn() },
    moodEntry: { findMany: jest.fn() },
  };
  db.$transaction = jest.fn((callback) => callback(db));
  return db;
});
jest.mock('../lib/notificationEvents', () => ({
  dispatchNotification: jest.fn(),
  notifyPetInvitation: jest.fn(),
  notifySharedActivity: jest.fn(),
  notifySharedCare: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const mascotaRouter = require('../routes/mascota');
const prisma = require('../lib/prisma');
const { notifySharedCare } = require('../lib/notificationEvents');
const { CARINO_POR_REGALO } = require('../lib/interaccionesSociales');

const MY_USER_ID = 1;
const FRIEND_ID = 2;
const AMISTAD_ID = 7;
const token = jwt.sign({ userId: MY_USER_ID }, 'moodmatch-dev-secret');
// amistad.userId = FRIEND_ID (usuario1), amistad.friendId = MY_USER_ID (usuario2)
const amistad = { id: AMISTAD_ID, userId: FRIEND_ID, friendId: MY_USER_ID };
const mascota = {
  id: 'pet-1', amistadId: AMISTAD_ID, nombre: 'Lumi', nivelCarino: 0,
  invitacionEstado: 'aceptada', activa: true, invitadaPor: FRIEND_ID,
};

const app = express();
app.use(express.json());
app.use('/api/mascota', mascotaRouter);

beforeEach(() => {
  jest.clearAllMocks();
  prisma.mascotaAmistad.upsert.mockResolvedValue(mascota);
  prisma.mascotaAmistad.findUnique.mockResolvedValue(mascota);
  prisma.moodEntry.findMany.mockResolvedValue([]);
  prisma.cheer.findFirst.mockResolvedValue(null);
  prisma.cheer.count.mockResolvedValue(0);
});

describe('POST /api/mascota/:amistadId/regalo', () => {
  test('envía un regalo, suma cariño y lo registra como marcador idempotente', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.cheer.create.mockResolvedValue({ id: 30 });
    prisma.mascotaAmistad.upsert.mockResolvedValue({ ...mascota, nivelCarino: CARINO_POR_REGALO });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/regalo`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(prisma.cheer.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        fromUserId: MY_USER_ID,
        toUserId: FRIEND_ID,
        message: expect.stringMatching(/^__MASCOTA_REGALO__:/),
        seen: true,
      }),
    }));
    expect(prisma.mascotaAmistad.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { nivelCarino: { increment: CARINO_POR_REGALO } },
    }));
  });

  test('rechaza un segundo regalo dentro de la misma semana', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.cheer.findFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/regalo`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(429);
    expect(res.body.disponibleEn).toBeTruthy();
    expect(prisma.cheer.create).not.toHaveBeenCalled();
  });

  test('no permite regalar si la mascota no fue aceptada (invitación pendiente)', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({ ...mascota, invitacionEstado: 'pendiente' });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/regalo`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(prisma.cheer.create).not.toHaveBeenCalled();
  });

  test('no permite regalar sobre una mascota archivada (amistad eliminada)', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({ ...mascota, activa: false });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/regalo`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe('notificación social suave al cuidar', () => {
  test('avisa a la otra persona cuando alguien cuida', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.upsert.mockResolvedValue({ ...mascota, retoCooperativo: null });
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascota, nivelCarino: 6 });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/cuidado`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(notifySharedCare).toHaveBeenCalledWith({
      toUserId: FRIEND_ID,
      friendshipId: AMISTAD_ID,
      nombre: 'Lumi',
    });
  });

  test('no avisa si el cuidado está en cooldown', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.upsert.mockResolvedValue({
      ...mascota, ultimoCuidadoUsuario2: new Date(), retoCooperativo: null,
    });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/cuidado`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(429);
    expect(notifySharedCare).not.toHaveBeenCalled();
  });
});

describe('catálogo de retos en el cuidado', () => {
  test('completa el reto de ánimo el mismo día leyendo los registros de ambos', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    const mismoDia = '2026-07-21T09:00:00.000Z';
    prisma.mascotaAmistad.upsert.mockResolvedValue({
      ...mascota,
      nivelCarino: 3,
      retoCooperativo: {
        tipo: 'ANIMO_MISMO_DIA',
        iniciadoEn: '2026-07-20T00:00:00.000Z',
        expiraEn: '2099-01-01T00:00:00.000Z',
        progresoUsuario1: false, progresoUsuario2: false, completado: false,
      },
    });
    // señales de ánimo: ambos registraron el mismo día calendario.
    prisma.moodEntry.findMany.mockResolvedValue([
      { userId: FRIEND_ID, createdAt: mismoDia, moodType: 'CALMADO' },
      { userId: MY_USER_ID, createdAt: mismoDia, moodType: 'CALMADO' },
    ]);
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascota, nivelCarino: 10 });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/cuidado`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    const data = prisma.mascotaAmistad.update.mock.calls[0][0].data;
    expect(data.retoCooperativo.tipo).toBe('ANIMO_MISMO_DIA');
    expect(data.retoCooperativo.completado).toBe(true);
    expect(data.nivelCarino).toEqual({ increment: 7 });
    expect(data.historialHitos).toEqual([expect.objectContaining({ hito: expect.stringMatching(/Completaron/) })]);
  });

  test('el reto de mensajes no se completa por debajo de la meta de pares', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.upsert.mockResolvedValue({
      ...mascota,
      retoCooperativo: {
        tipo: 'RACHA_MENSAJES', meta: 3,
        iniciadoEn: '2026-07-20T00:00:00.000Z',
        expiraEn: '2099-01-01T00:00:00.000Z',
        progresoUsuario1: false, progresoUsuario2: false, completado: false,
      },
    });
    prisma.cheer.count.mockResolvedValueOnce(4).mockResolvedValueOnce(1); // pares = 1
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascota, nivelCarino: 6 });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/cuidado`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    const data = prisma.mascotaAmistad.update.mock.calls[0][0].data;
    expect(data.retoCooperativo.completado).toBe(false);
    expect(data.nivelCarino).toEqual({ increment: 6 });
  });

  test('POST /reto rota al siguiente tipo del catálogo', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.upsert.mockResolvedValue({
      ...mascota,
      retoCooperativo: {
        tipo: 'CUIDADO_DUO', expiraEn: '2000-01-01T00:00:00.000Z',
        progresoUsuario1: true, progresoUsuario2: true, completado: true,
      },
    });
    prisma.mascotaAmistad.update.mockResolvedValue(mascota);

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/reto`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    const data = prisma.mascotaAmistad.update.mock.calls[0][0].data;
    expect(data.retoCooperativo.tipo).toBe('ANIMO_MISMO_DIA');
  });
});
