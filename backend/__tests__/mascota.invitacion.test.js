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
const ESPECIE = 'polluelo';
const OTRA_ESPECIE = 'nutria-lunar';
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
  test('clasifica por quién hizo la última propuesta de especie e incluye la especie', async () => {
    prisma.friendship.findMany.mockResolvedValue([
      {
        id: 10, userId: ME, friendId: 2, user: otro(ME, 'Yo'), friend: otro(2, 'Ana'),
        mascota: {
          amistadId: 10, nombre: 'Lumi', nivelCarino: 20, especie: ESPECIE,
          invitacionEstado: 'aceptada', activa: true, invitadaPor: ME, especiePropuestaPor: FRIEND,
          createdAt: new Date(),
        },
      },
      {
        // Yo hice la última propuesta → la veo como enviada.
        id: 11, userId: ME, friendId: 3, user: otro(ME, 'Yo'), friend: otro(3, 'Beto'),
        mascota: {
          amistadId: 11, nombre: 'Lumi', especie: ESPECIE, invitacionEstado: 'pendiente',
          activa: true, invitadaPor: ME, especiePropuestaPor: ME,
        },
      },
      {
        // El otro hizo la última propuesta → la debo responder (recibida).
        id: 12, userId: ME, friendId: 4, user: otro(ME, 'Yo'), friend: otro(4, 'Cami'),
        mascota: {
          amistadId: 12, nombre: 'Lumi', especie: OTRA_ESPECIE, invitacionEstado: 'pendiente',
          activa: true, invitadaPor: ME, especiePropuestaPor: 4,
        },
      },
      {
        id: 13, userId: ME, friendId: 5, user: otro(ME, 'Yo'), friend: otro(5, 'Dani'), mascota: null,
      },
    ]);

    const res = await request(app).get('/api/mascota').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.mascotas).toHaveLength(1);
    expect(res.body.mascotas[0].especie).toBe(ESPECIE);
    expect(res.body.invitaciones.enviadas.map((i) => i.amistadId)).toEqual([11]);
    expect(res.body.invitaciones.recibidas.map((i) => i.amistadId)).toEqual([12]);
    expect(res.body.invitaciones.recibidas[0].especie).toBe(OTRA_ESPECIE);
    expect(res.body.amigosElegibles.map((a) => a.amistadId)).toEqual([13]);
  });
});

describe('POST /api/mascota/invitacion', () => {
  test('crea una mascota pendiente con la especie propuesta y notifica', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(null);
    prisma.mascotaAmistad.create.mockResolvedValue({
      amistadId: AMISTAD_ID, nombre: 'Lumi', nivelCarino: 0, especie: ESPECIE,
      invitacionEstado: 'pendiente', activa: true, invitadaPor: ME, especiePropuestaPor: ME,
    });

    const res = await request(app)
      .post('/api/mascota/invitacion')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID, especie: ESPECIE });

    expect(res.status).toBe(201);
    expect(prisma.mascotaAmistad.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        invitacionEstado: 'pendiente', especie: ESPECIE, especiePropuestaPor: ME, invitadaPor: ME,
      }),
    }));
    expect(notifyPetInvitation).toHaveBeenCalledWith(expect.objectContaining({
      toUserId: FRIEND, friendshipId: AMISTAD_ID, nombreEspecie: 'Polluelo',
    }));
  });

  test('400 si la especie no es del catálogo', async () => {
    const res = await request(app)
      .post('/api/mascota/invitacion')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID, especie: 'unicornio' });

    expect(res.status).toBe(400);
    expect(prisma.friendship.findFirst).not.toHaveBeenCalled();
  });

  test('400 si falta la especie', async () => {
    const res = await request(app)
      .post('/api/mascota/invitacion')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID });

    expect(res.status).toBe(400);
  });

  test('reutiliza la fila si una invitación previa fue rechazada', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({
      amistadId: AMISTAD_ID, nombre: 'Lumi', invitacionEstado: 'rechazada', activa: false, invitadaPor: FRIEND,
    });
    prisma.mascotaAmistad.update.mockResolvedValue({
      amistadId: AMISTAD_ID, nombre: 'Lumi', especie: ESPECIE, invitacionEstado: 'pendiente',
      activa: true, invitadaPor: ME, especiePropuestaPor: ME,
    });

    const res = await request(app)
      .post('/api/mascota/invitacion')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID, especie: ESPECIE });

    expect(res.status).toBe(201);
    expect(prisma.mascotaAmistad.create).not.toHaveBeenCalled();
    expect(prisma.mascotaAmistad.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ especie: ESPECIE, especiePropuestaPor: ME }),
    }));
  });

  test('409 si ya hay una mascota o invitación en curso', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({
      amistadId: AMISTAD_ID, invitacionEstado: 'aceptada', activa: true, invitadaPor: FRIEND, especie: ESPECIE,
    });

    const res = await request(app)
      .post('/api/mascota/invitacion')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID, especie: ESPECIE });

    expect(res.status).toBe(409);
    expect(prisma.mascotaAmistad.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/mascota/:id/invitacion/contraproponer', () => {
  // Yo (ME) invité y propuse; FRIEND recibe y contrapropone.
  const pendienteMiPropuesta = {
    amistadId: AMISTAD_ID, nombre: 'Lumi', especie: ESPECIE,
    invitacionEstado: 'pendiente', activa: true, invitadaPor: ME, especiePropuestaPor: ME,
  };

  test('el receptor propone otra especie: rota la propuesta y notifica de vuelta', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(pendienteMiPropuesta);
    prisma.mascotaAmistad.update.mockResolvedValue({
      ...pendienteMiPropuesta, especie: OTRA_ESPECIE, especiePropuestaPor: FRIEND,
    });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/invitacion/contraproponer`)
      .set('Authorization', `Bearer ${friendToken}`)
      .send({ especie: OTRA_ESPECIE });

    expect(res.status).toBe(200);
    expect(prisma.mascotaAmistad.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { especie: OTRA_ESPECIE, especiePropuestaPor: FRIEND },
    }));
    expect(notifyPetInvitation).toHaveBeenCalledWith(expect.objectContaining({
      toUserId: ME, nombreEspecie: 'Nutria lunar',
    }));
  });

  test('quien hizo la última propuesta no puede contraproponerse a sí mismo', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(pendienteMiPropuesta);

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/invitacion/contraproponer`)
      .set('Authorization', `Bearer ${token}`)
      .send({ especie: OTRA_ESPECIE });

    expect(res.status).toBe(403);
    expect(prisma.mascotaAmistad.update).not.toHaveBeenCalled();
  });

  test('400 si la especie propuesta no es válida', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/invitacion/contraproponer`)
      .set('Authorization', `Bearer ${friendToken}`)
      .send({ especie: 'dragon' });

    expect(res.status).toBe(400);
  });

  test('409 si no hay invitación pendiente', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({ ...pendienteMiPropuesta, invitacionEstado: 'aceptada' });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/invitacion/contraproponer`)
      .set('Authorization', `Bearer ${friendToken}`)
      .send({ especie: OTRA_ESPECIE });

    expect(res.status).toBe(409);
  });
});

describe('responder invitación (aceptar / rechazar)', () => {
  // ME propuso; FRIEND es quien responde.
  const pendiente = {
    amistadId: AMISTAD_ID, nombre: 'Lumi', nivelCarino: 0, especie: ESPECIE,
    invitacionEstado: 'pendiente', activa: true, invitadaPor: ME, especiePropuestaPor: ME,
  };

  test('el receptor acepta y la mascota queda activa con su especie fija', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(pendiente);
    prisma.mascotaAmistad.update.mockResolvedValue({ ...pendiente, invitacionEstado: 'aceptada' });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/invitacion/aceptar`)
      .set('Authorization', `Bearer ${friendToken}`);

    expect(res.status).toBe(200);
    expect(res.body.mascota.especie).toBe(ESPECIE);
    // Aceptar no toca la especie (queda inmutable): solo cambia estado.
    expect(prisma.mascotaAmistad.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { invitacionEstado: 'aceptada', activa: true },
    }));
  });

  test('quien hizo la última propuesta no puede aceptarla', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(pendiente);

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/invitacion/aceptar`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(prisma.mascotaAmistad.update).not.toHaveBeenCalled();
  });

  test('el receptor rechaza y la fila queda rechazada', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(pendiente);
    prisma.mascotaAmistad.update.mockResolvedValue({ ...pendiente, invitacionEstado: 'rechazada', activa: false });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/invitacion/rechazar`)
      .set('Authorization', `Bearer ${friendToken}`);

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('rechazada');
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
