jest.mock('../lib/prisma', () => {
  const db = {
    friendship: { findFirst: jest.fn(), findMany: jest.fn() },
    mascotaAmistad: {
      findUnique: jest.fn(), create: jest.fn(), update: jest.fn(),
    },
    moodEntry: { findMany: jest.fn() },
  };
  db.$transaction = jest.fn((callback) => callback(db));
  return db;
});
jest.mock('../lib/notificationEvents', () => ({
  dispatchNotification: jest.fn(),
  notifyPetInvitation: jest.fn(() => Promise.resolve()),
  notifySharedActivity: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const mascotaRouter = require('../routes/mascota');
const prisma = require('../lib/prisma');
const { notifyPetInvitation } = require('../lib/notificationEvents');

const ME = 1;
const FRIEND = 2;
const AMISTAD_ID = 10;
const token = jwt.sign({ userId: ME }, 'moodmatch-dev-secret');
const friendToken = jwt.sign({ userId: FRIEND }, 'moodmatch-dev-secret');
const amistad = { id: AMISTAD_ID, userId: ME, friendId: FRIEND };

const app = express();
app.use(express.json());
app.use('/api/mascota', mascotaRouter);

beforeEach(() => {
  jest.clearAllMocks();
  prisma.moodEntry.findMany.mockResolvedValue([]);
});

const otro = (id, nombre) => ({ id, nombre, avatarUrl: null });

describe('GET /api/mascota (índice de la sección)', () => {
  test('clasifica mascotas activas, invitaciones y amigos elegibles', async () => {
    prisma.friendship.findMany.mockResolvedValue([
      {
        id: 10, userId: ME, friendId: 2, user: otro(ME, 'Yo'), friend: otro(2, 'Ana'),
        mascota: {
          amistadId: 10, nombre: 'Lumi', nivelCarino: 20,
          invitacionEstado: 'aceptada', activa: true, invitadaPor: ME, createdAt: new Date(),
        },
      },
      {
        id: 11, userId: ME, friendId: 3, user: otro(ME, 'Yo'), friend: otro(3, 'Beto'),
        mascota: { amistadId: 11, nombre: 'Lumi', invitacionEstado: 'pendiente', activa: true, invitadaPor: ME },
      },
      {
        id: 12, userId: ME, friendId: 4, user: otro(ME, 'Yo'), friend: otro(4, 'Cami'),
        mascota: { amistadId: 12, nombre: 'Lumi', invitacionEstado: 'pendiente', activa: true, invitadaPor: 4 },
      },
      {
        id: 13, userId: ME, friendId: 5, user: otro(ME, 'Yo'), friend: otro(5, 'Dani'), mascota: null,
      },
      {
        id: 14, userId: ME, friendId: 6, user: otro(ME, 'Yo'), friend: otro(6, 'Eli'),
        mascota: { amistadId: 14, nombre: 'Lumi', invitacionEstado: 'rechazada', activa: false, invitadaPor: ME },
      },
    ]);

    const res = await request(app).get('/api/mascota').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.mascotas).toHaveLength(1);
    expect(res.body.mascotas[0]).toEqual(expect.objectContaining({
      amistadId: 10,
      etapa: expect.objectContaining({ numero: 2, nombre: 'Joven' }),
    }));
    expect(res.body.invitaciones.enviadas.map((i) => i.amistadId)).toEqual([11]);
    expect(res.body.invitaciones.recibidas.map((i) => i.amistadId)).toEqual([12]);
    expect(res.body.amigosElegibles.map((a) => a.amistadId).sort()).toEqual([13, 14]);
  });

  test('nunca expone ánimos individuales en las tarjetas', async () => {
    prisma.friendship.findMany.mockResolvedValue([
      {
        id: 10, userId: ME, friendId: 2, user: otro(ME, 'Yo'), friend: otro(2, 'Ana'),
        mascota: {
          amistadId: 10, nombre: 'Lumi', nivelCarino: 5,
          invitacionEstado: 'aceptada', activa: true, invitadaPor: ME, createdAt: new Date(),
        },
      },
    ]);

    const res = await request(app).get('/api/mascota').set('Authorization', `Bearer ${token}`);
    expect(JSON.stringify(res.body)).not.toMatch(/FELIZ|TRISTE|moodType/);
  });
});

describe('POST /api/mascota/invitacion', () => {
  test('crea una mascota pendiente y notifica al otro integrante', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(null);
    prisma.mascotaAmistad.create.mockResolvedValue({
      amistadId: AMISTAD_ID, nombre: 'Lumi', nivelCarino: 0,
      invitacionEstado: 'pendiente', activa: true, invitadaPor: ME,
    });

    const res = await request(app)
      .post('/api/mascota/invitacion')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID });

    expect(res.status).toBe(201);
    expect(prisma.mascotaAmistad.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ invitacionEstado: 'pendiente', invitadaPor: ME }),
    }));
    expect(notifyPetInvitation).toHaveBeenCalledWith({ toUserId: FRIEND, friendshipId: AMISTAD_ID });
  });

  test('reutiliza la fila si una invitación previa fue rechazada', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({
      amistadId: AMISTAD_ID, nombre: 'Lumi', invitacionEstado: 'rechazada', activa: false, invitadaPor: FRIEND,
    });
    prisma.mascotaAmistad.update.mockResolvedValue({
      amistadId: AMISTAD_ID, nombre: 'Lumi', invitacionEstado: 'pendiente', activa: true, invitadaPor: ME,
    });

    const res = await request(app)
      .post('/api/mascota/invitacion')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID });

    expect(res.status).toBe(201);
    expect(prisma.mascotaAmistad.create).not.toHaveBeenCalled();
    expect(prisma.mascotaAmistad.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ invitacionEstado: 'pendiente', invitadaPor: ME }),
    }));
  });

  test('409 si ya hay una mascota o invitación en curso', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({
      amistadId: AMISTAD_ID, invitacionEstado: 'aceptada', activa: true, invitadaPor: FRIEND,
    });

    const res = await request(app)
      .post('/api/mascota/invitacion')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID });

    expect(res.status).toBe(409);
    expect(prisma.mascotaAmistad.create).not.toHaveBeenCalled();
  });

  test('404 si la amistad no es del usuario', async () => {
    prisma.friendship.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/mascota/invitacion')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID });
    expect(res.status).toBe(404);
  });
});

describe('responder invitación', () => {
  const pendiente = {
    amistadId: AMISTAD_ID, nombre: 'Lumi', nivelCarino: 0,
    invitacionEstado: 'pendiente', activa: true, invitadaPor: ME,
  };

  test('el invitado acepta y la mascota queda activa', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(pendiente);
    prisma.mascotaAmistad.update.mockResolvedValue({ ...pendiente, invitacionEstado: 'aceptada' });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/invitacion/aceptar`)
      .set('Authorization', `Bearer ${friendToken}`);

    expect(res.status).toBe(200);
    expect(prisma.mascotaAmistad.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { invitacionEstado: 'aceptada', activa: true },
    }));
  });

  test('quien invitó no puede aceptar su propia invitación', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(pendiente);

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/invitacion/aceptar`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(prisma.mascotaAmistad.update).not.toHaveBeenCalled();
  });

  test('el invitado rechaza y la fila queda rechazada, sin insistir', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(pendiente);
    prisma.mascotaAmistad.update.mockResolvedValue({ ...pendiente, invitacionEstado: 'rechazada', activa: false });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/invitacion/rechazar`)
      .set('Authorization', `Bearer ${friendToken}`);

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('rechazada');
    expect(prisma.mascotaAmistad.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { invitacionEstado: 'rechazada', activa: false },
    }));
  });

  test('409 al aceptar cuando no hay invitación pendiente', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({ ...pendiente, invitacionEstado: 'aceptada' });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/invitacion/aceptar`)
      .set('Authorization', `Bearer ${friendToken}`);

    expect(res.status).toBe(409);
  });
});
