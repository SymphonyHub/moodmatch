jest.mock('../lib/prisma', () => {
  const db = {
    friendship: { findFirst: jest.fn(), findMany: jest.fn() },
    mascotaAmistad: {
      findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(),
    },
    moodEntry: { findMany: jest.fn() },
  };
  db.$transaction = jest.fn((callback) => callback(db));
  return db;
});
jest.mock('../lib/notificationEvents', () => ({
  dispatchNotification: jest.fn(),
  notifyPetArchived: jest.fn(() => Promise.resolve()),
  notifyPetInvitation: jest.fn(() => Promise.resolve()),
  notifySharedActivity: jest.fn(),
  notifySharedCare: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const mascotaRouter = require('../routes/mascota');
const prisma = require('../lib/prisma');
const { notifyPetArchived } = require('../lib/notificationEvents');
const { CONTENT } = jest.requireActual('../lib/notificationEvents');

const ME = 1;
const FRIEND = 2;
const AMISTAD_ID = 10;
const token = jwt.sign({ userId: ME }, 'moodmatch-dev-secret');
const friendToken = jwt.sign({ userId: FRIEND }, 'moodmatch-dev-secret');
// La amistad se guardó como ME → FRIEND: quien invitó es ME, así que el token
// de FRIEND representa al lado que NO creó la mascota.
const amistad = { id: AMISTAD_ID, userId: ME, friendId: FRIEND };

const mascotaActiva = {
  amistadId: AMISTAD_ID,
  nombre: 'Lumi',
  nivelCarino: 24,
  invitacionEstado: 'aceptada',
  activa: true,
  invitadaPor: ME,
  historialHitos: [{ hito: 'Ahora se llama Lumi', fecha: '2026-07-01T00:00:00.000Z' }],
};

const app = express();
app.use(express.json());
app.use('/api/mascota', mascotaRouter);

beforeEach(() => {
  jest.clearAllMocks();
  prisma.moodEntry.findMany.mockResolvedValue([]);
});

const archivar = (conToken) => request(app)
  .post(`/api/mascota/${AMISTAD_ID}/archivar`)
  .set('Authorization', `Bearer ${conToken}`);

describe('POST /api/mascota/:amistadId/archivar', () => {
  test('quien creó la mascota puede pausarla y se avisa al otro', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(mascotaActiva);
    prisma.mascotaAmistad.updateMany.mockResolvedValue({ count: 1 });

    const res = await archivar(token);

    expect(res.status).toBe(200);
    expect(res.body.archivada).toBe(true);
    expect(prisma.mascotaAmistad.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { amistadId: AMISTAD_ID, activa: true },
      data: expect.objectContaining({ activa: false }),
    }));
    expect(notifyPetArchived).toHaveBeenCalledWith(expect.objectContaining({
      toUserId: FRIEND, friendshipId: AMISTAD_ID, nombre: 'Lumi',
    }));
  });

  test('el otro integrante también puede pausarla, sin aprobación de nadie', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(mascotaActiva);
    prisma.mascotaAmistad.updateMany.mockResolvedValue({ count: 1 });

    const res = await archivar(friendToken);

    expect(res.status).toBe(200);
    // El aviso viaja en la dirección contraria: lo recibe quien no pausó.
    expect(notifyPetArchived).toHaveBeenCalledWith(expect.objectContaining({
      toUserId: ME, friendshipId: AMISTAD_ID,
    }));
  });

  test('conserva el historial y le suma el hito de la pausa', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(mascotaActiva);
    prisma.mascotaAmistad.updateMany.mockResolvedValue({ count: 1 });

    await archivar(token);

    const { data } = prisma.mascotaAmistad.updateMany.mock.calls[0][0];
    expect(data.historialHitos).toHaveLength(mascotaActiva.historialHitos.length + 1);
    expect(data.historialHitos[0]).toEqual(mascotaActiva.historialHitos[0]);
    expect(data.historialHitos.at(-1).hito).toBe('Pusieron su cuidado en pausa');
  });

  test('404 si quien llama no es parte de la amistad', async () => {
    prisma.friendship.findFirst.mockResolvedValue(null);

    const res = await archivar(token);

    expect(res.status).toBe(404);
    expect(prisma.mascotaAmistad.updateMany).not.toHaveBeenCalled();
    expect(notifyPetArchived).not.toHaveBeenCalled();
  });

  test('404 si la mascota ya estaba en pausa, sin volver a avisar', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({ ...mascotaActiva, activa: false });

    const res = await archivar(token);

    expect(res.status).toBe(404);
    expect(prisma.mascotaAmistad.updateMany).not.toHaveBeenCalled();
    expect(notifyPetArchived).not.toHaveBeenCalled();
  });

  test('si los dos pausan a la vez, solo la llamada que gana avisa', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(mascotaActiva);
    prisma.mascotaAmistad.updateMany.mockResolvedValue({ count: 0 });

    const res = await archivar(token);

    expect(res.status).toBe(404);
    expect(notifyPetArchived).not.toHaveBeenCalled();
  });

  test('400 si el amistadId no es válido', async () => {
    const res = await request(app)
      .post('/api/mascota/abc/archivar')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(prisma.friendship.findFirst).not.toHaveBeenCalled();
  });

  test('401 sin sesión', async () => {
    const res = await request(app).post(`/api/mascota/${AMISTAD_ID}/archivar`);

    expect(res.status).toBe(401);
    expect(prisma.mascotaAmistad.updateMany).not.toHaveBeenCalled();
  });
});

describe('una mascota en pausa deja retomar el vínculo', () => {
  const otro = (id, nombre) => ({ id, nombre, avatarUrl: null });

  test('el índice devuelve al amigo a los elegibles, no lo hace desaparecer', async () => {
    prisma.friendship.findMany.mockResolvedValue([
      {
        id: AMISTAD_ID,
        userId: ME,
        friendId: FRIEND,
        user: otro(ME, 'Yo'),
        friend: otro(FRIEND, 'Ana'),
        mascota: { ...mascotaActiva, activa: false },
      },
    ]);

    const res = await request(app).get('/api/mascota').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.mascotas).toHaveLength(0);
    expect(res.body.invitaciones.recibidas).toHaveLength(0);
    expect(res.body.invitaciones.enviadas).toHaveLength(0);
    expect(res.body.amigosElegibles.map((a) => a.amistadId)).toEqual([AMISTAD_ID]);
  });

  test('reinvitar sobre una fila en pausa la reutiliza sin borrar cariño ni recuerdos', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({ ...mascotaActiva, activa: false });
    prisma.mascotaAmistad.update.mockResolvedValue({
      ...mascotaActiva, invitacionEstado: 'pendiente', activa: true, especie: 'polluelo',
    });

    const res = await request(app)
      .post('/api/mascota/invitacion')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID, especie: 'polluelo' });

    expect(res.status).toBe(201);
    expect(prisma.mascotaAmistad.create).not.toHaveBeenCalled();
    const { data } = prisma.mascotaAmistad.update.mock.calls[0][0];
    expect(data).toEqual(expect.objectContaining({ invitacionEstado: 'pendiente', activa: true }));
    // Retomar es seguir, no empezar de cero: la reinvitación no toca el progreso.
    expect(data).not.toHaveProperty('nivelCarino');
    expect(data).not.toHaveProperty('historialHitos');
  });

  test('sigue dando 409 si la mascota está viva o la invitación en curso', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(mascotaActiva);

    const viva = await request(app)
      .post('/api/mascota/invitacion')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID, especie: 'polluelo' });
    expect(viva.status).toBe(409);

    prisma.mascotaAmistad.findUnique.mockResolvedValue({
      ...mascotaActiva, invitacionEstado: 'pendiente',
    });
    const pendiente = await request(app)
      .post('/api/mascota/invitacion')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID, especie: 'polluelo' });
    expect(pendiente.status).toBe(409);
  });
});

describe('tono del aviso de pausa', () => {
  const { title, body } = CONTENT.mascota_pausada('Lumi');
  const texto = `${title} ${body}`.toLocaleLowerCase();

  test('nombra el hecho sin culpar ni presionar a nadie', () => {
    const prohibidas = [
      'abandon', 'dejó de', 'te dejó', 'ya no le importa', 'no es para tanto',
      'deberías', 'tienes que', 'lástima', 'triste noticia', 'culpa', 'perdiste',
    ];
    for (const frase of prohibidas) {
      expect(texto).not.toContain(frase);
    }
  });

  test('deja claro que no se pierde nada', () => {
    expect(body).toContain('recuerdos quedan guardados');
  });

  test('viaja bajo la preferencia de mascota social, para poder silenciarlo', () => {
    expect(CONTENT.mascota_pausada('Lumi').data.type).toBe('mascota_social');
  });
});
