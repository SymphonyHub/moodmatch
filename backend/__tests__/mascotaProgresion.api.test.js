jest.mock('../lib/prisma', () => {
  const db = {
    friendship: { findFirst: jest.fn() },
    mascotaAmistad: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    cheer: { findFirst: jest.fn(), count: jest.fn(), create: jest.fn() },
    moodEntry: { findMany: jest.fn() },
  };
  db.$transaction = jest.fn((callback) => callback(db));
  return db;
});
jest.mock('../lib/notificationEvents', () => ({
  dispatchNotification: jest.fn(),
  notifyPetArchived: jest.fn(),
  notifyPetInvitation: jest.fn(),
  notifySharedActivity: jest.fn(),
  notifySharedCare: jest.fn(),
}));

const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const prisma = require('../lib/prisma');
const mascotaRouter = require('../routes/mascota');

const USER_ID = 1;
const FRIEND_ID = 2;
const AMISTAD_ID = 7;
const token = jwt.sign({ userId: USER_ID }, 'moodmatch-dev-secret');
const amistad = { id: AMISTAD_ID, userId: USER_ID, friendId: FRIEND_ID };
const mascota = {
  id: 'pet-exp',
  amistadId: AMISTAD_ID,
  nombre: 'Lumi',
  nivelCarino: 0,
  energia: 50,
  experiencia: 0,
  retoCooperativo: null,
  historialHitos: [],
  invitacionEstado: 'aceptada',
  activa: true,
};

const app = express();
app.use(express.json());
app.use('/api/mascota', mascotaRouter);

beforeEach(() => {
  jest.clearAllMocks();
  prisma.friendship.findFirst.mockResolvedValue(amistad);
  prisma.mascotaAmistad.findUnique.mockResolvedValue(mascota);
  prisma.mascotaAmistad.upsert.mockResolvedValue(mascota);
  prisma.mascotaAmistad.update.mockResolvedValue(mascota);
  prisma.cheer.findFirst.mockResolvedValue(null);
  prisma.cheer.count.mockResolvedValue(0);
  prisma.moodEntry.findMany.mockResolvedValue([]);
});

describe('API de progresion de mascota', () => {
  test('POST /cuidar rechaza cuerpos ausentes o acciones no textuales', async () => {
    const sinBody = await request(app)
      .post('/api/mascota/cuidar')
      .set('Authorization', `Bearer ${token}`);
    const accionInvalida = await request(app)
      .post('/api/mascota/cuidar')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID, accion: 7 });

    expect(sinBody.status).toBe(400);
    expect(accionInvalida.status).toBe(400);
    expect(prisma.friendship.findFirst).not.toHaveBeenCalled();
  });

  test('GET /estado devuelve la estructura explicita sin eventos nuevos', async () => {
    prisma.mascotaAmistad.findUnique.mockResolvedValue({ ...mascota, experiencia: 795 });

    const res = await request(app)
      .get(`/api/mascota/estado?amistadId=${AMISTAD_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      experiencia: 795,
      nivel: 4,
      subioDeNivel: false,
      evoluciono: false,
      etapa: 'BEBE',
    }));
    expect(res.body.mascota.etapa).toEqual({ numero: 1, nombre: 'Bebe' });
  });

  test('POST /cuidar evoluciona de nivel 4 a 5 al otorgar 5 EXP', async () => {
    const nivelCuatro = { ...mascota, experiencia: 795 };
    prisma.mascotaAmistad.findUnique.mockResolvedValue(nivelCuatro);
    prisma.mascotaAmistad.upsert.mockResolvedValue(nivelCuatro);
    prisma.mascotaAmistad.update.mockResolvedValue({
      ...nivelCuatro,
      experiencia: 800,
      nivelCarino: 6,
      etapa: 2,
    });

    const res = await request(app)
      .post('/api/mascota/cuidar')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID, accion: 'ALIMENTAR' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({
      experiencia: 800,
      nivel: 5,
      subioDeNivel: true,
      evoluciono: true,
      etapa: 'JOVEN',
      experienciaOtorgada: 5,
    }));
    expect(res.body.mascota.progresion).toEqual(expect.objectContaining({
      subioDeNivel: true,
      evoluciono: true,
      etapa: 'JOVEN',
    }));
    expect(prisma.mascotaAmistad.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ experiencia: { increment: 5 }, etapa: 2 }),
    }));
  });

  test('la sexta caricia responde con exito y otorga 0 EXP', async () => {
    prisma.cheer.count.mockResolvedValue(5);

    const res = await request(app)
      .post('/api/mascota/cuidar')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID, accion: 'CARICIA' });

    expect(res.status).toBe(200);
    expect(res.body.experienciaOtorgada).toBe(0);
    expect(res.body.limiteDiarioAlcanzado).toBe(true);
    expect(prisma.mascotaAmistad.update).not.toHaveBeenCalled();
    expect(prisma.cheer.create).not.toHaveBeenCalled();
  });

  test('una caricia dentro del limite otorga 2 EXP', async () => {
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascota, experiencia: 2 });

    const res = await request(app)
      .post('/api/mascota/cuidar')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID, accion: 'CARICIA' });

    expect(res.status).toBe(200);
    expect(res.body.experienciaOtorgada).toBe(2);
    expect(res.body.experiencia).toBe(2);
    expect(prisma.mascotaAmistad.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ experiencia: { increment: 2 } }),
    }));
  });

  test('el cuarto cuidado diario mantiene exito pero otorga 0 EXP', async () => {
    const enCooldown = { ...mascota, experiencia: 15, ultimoCuidadoUsuario1: new Date() };
    prisma.mascotaAmistad.findUnique.mockResolvedValue(enCooldown);
    prisma.mascotaAmistad.upsert.mockResolvedValue(enCooldown);
    prisma.cheer.count.mockResolvedValue(3);

    const res = await request(app)
      .post('/api/mascota/cuidar')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID, accion: 'CUIDADO' });

    expect(res.status).toBe(200);
    expect(res.body.enCooldown).toBe(true);
    expect(res.body.experienciaOtorgada).toBe(0);
    expect(res.body.limiteDiarioAlcanzado).toBe(true);
    expect(prisma.mascotaAmistad.update).not.toHaveBeenCalled();
  });

  test('cada minijuego conserva su propio limite diario', async () => {
    prisma.cheer.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascota, experiencia: 20 });

    const atrapada = await request(app)
      .post('/api/mascota/cuidar')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID, accion: 'MINIJUEGO', minijuego: 'atrapala' });
    const ritmo = await request(app)
      .post('/api/mascota/cuidar')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID, accion: 'MINIJUEGO', minijuego: 'ritmo-carino' });

    expect(atrapada.status).toBe(200);
    expect(atrapada.body.experienciaOtorgada).toBe(0);
    expect(ritmo.status).toBe(200);
    expect(ritmo.body.experienciaOtorgada).toBe(20);
    const prefijos = prisma.cheer.count.mock.calls.map(([args]) => args.where.message.startsWith);
    expect(prefijos[0]).toContain('MINIJUEGO_ATRAPALA');
    expect(prefijos[1]).toContain('MINIJUEGO_RITMO_CARINO');
  });
});
