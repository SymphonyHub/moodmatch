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
const { notifySharedActivity } = require('../lib/notificationEvents');
const {
  COSTOS_ENERGIA,
  ENERGIA_MAXIMA,
  INTERVALO_REGEN_SEGUNDOS,
  PUNTOS_POR_INTERVALO,
} = require('../lib/energiaMascota');

const MY_USER_ID = 1;
const FRIEND_ID = 2;
const AMISTAD_ID = 7;
const token = jwt.sign({ userId: MY_USER_ID }, 'moodmatch-dev-secret');
const friendToken = jwt.sign({ userId: FRIEND_ID }, 'moodmatch-dev-secret');
const amistad = { id: AMISTAD_ID, userId: FRIEND_ID, friendId: MY_USER_ID };
const mascota = {
  id: 'pet-1', amistadId: AMISTAD_ID, nombre: 'Lumi', nivelCarino: 0, energia: 50, experiencia: 0,
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
  prisma.cheer.count.mockResolvedValue(0);
});

describe('GET /api/mascota/:amistadId', () => {
  test('requiere autenticación', async () => {
    const res = await request(app).get(`/api/mascota/${AMISTAD_ID}`);
    expect(res.status).toBe(401);
  });

  test('rechaza ids inválidos', async () => {
    const res = await request(app)
      .get('/api/mascota/no-es-id')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  test('no expone mascotas de amistades ajenas', async () => {
    prisma.friendship.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .get(`/api/mascota/${AMISTAD_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(prisma.mascotaAmistad.findUnique).not.toHaveBeenCalled();
  });

  test('devuelve la mascota cuando la invitación está aceptada, sin crearla de nuevo', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    const res = await request(app)
      .get(`/api/mascota/${AMISTAD_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.mascota).toEqual(expect.objectContaining({ nombre: 'Lumi', nivelCarino: 0, personalidad: 'curiosa' }));
    expect(prisma.mascotaAmistad.upsert).not.toHaveBeenCalled();
  });

  test('responde 404 si la mascota todavía no fue aceptada (opt-in)', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({ ...mascota, invitacionEstado: 'pendiente' });
    const res = await request(app)
      .get(`/api/mascota/${AMISTAD_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  test('responde 404 si no existe mascota para la amistad', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .get(`/api/mascota/${AMISTAD_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe('mecánicas avanzadas de mascota', () => {
  test('alimentar suma cariño y no cuesta estamina', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({ ...mascota, retoCooperativo: null });
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascota, nivelCarino: 6 });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/alimentar`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(prisma.mascotaAmistad.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        energia: 50,
        nivelCarino: { increment: 6 },
      }),
    }));
  });

  test('jugar descuenta el costo de estamina sin sumar cariño base', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({ ...mascota, retoCooperativo: null });
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascota, energia: 35 });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/jugar`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    const data = prisma.mascotaAmistad.update.mock.calls[0][0].data;
    expect(data.energia).toBe(50 - COSTOS_ENERGIA.JUGAR);
    expect(data).not.toHaveProperty('nivelCarino');
    expect(data.ultimoCuidadoUsuario2).toEqual(expect.any(Date));
  });

  test('jugar cobra sobre la energía ya regenerada, no sobre la guardada', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    // Cuatro intervalos de recarga acumulados desde la última escritura.
    prisma.mascotaAmistad.findUnique.mockResolvedValue({
      ...mascota,
      energia: 20,
      updatedAt: new Date(Date.now() - 4 * INTERVALO_REGEN_SEGUNDOS * 1000),
      retoCooperativo: null,
    });
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascota, energia: 13 });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/jugar`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    const regenerada = 20 + 4 * PUNTOS_POR_INTERVALO;
    expect(prisma.mascotaAmistad.update.mock.calls[0][0].data.energia)
      .toBe(regenerada - COSTOS_ENERGIA.JUGAR);
  });

  test('la recarga nunca deja el saldo por encima del máximo', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({
      ...mascota,
      energia: 95,
      updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      retoCooperativo: null,
    });
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascota, energia: 85 });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/jugar`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(prisma.mascotaAmistad.update.mock.calls[0][0].data.energia)
      .toBe(ENERGIA_MAXIMA - COSTOS_ENERGIA.JUGAR);
  });

  test('jugar con saldo insuficiente responde 422 y no escribe nada', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({
      ...mascota,
      energia: COSTOS_ENERGIA.JUGAR - 1,
      updatedAt: new Date(),
      retoCooperativo: null,
    });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/jugar`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(422);
    expect(res.body).toEqual(expect.objectContaining({
      error: 'ENERGIA_INSUFICIENTE',
      energiaActual: COSTOS_ENERGIA.JUGAR - 1,
      energiaRequerida: COSTOS_ENERGIA.JUGAR,
    }));
    // El rechazo corta antes de cualquier escritura: ni experiencia ni marcador.
    expect(prisma.mascotaAmistad.update).not.toHaveBeenCalled();
    expect(prisma.cheer.create).not.toHaveBeenCalled();
    // Y lleva la mascota para que el cliente pinte el contador de recarga.
    expect(res.body.mascota.segundosSiguienteRecarga).toBe(INTERVALO_REGEN_SEGUNDOS);
  });

  test('con la barra agotada tampoco se puede iniciar un minijuego', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({
      ...mascota,
      energia: 0,
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/mascota/cuidar')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID, accion: 'MINIJUEGO', minijuego: 'ATRAPALA' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('ENERGIA_INSUFICIENTE');
    expect(res.body.energiaActual).toBe(0);
    expect(res.body.mascota.estadoEnergia).toBe('AGOTADO');
    expect(prisma.mascotaAmistad.update).not.toHaveBeenCalled();
    expect(prisma.cheer.create).not.toHaveBeenCalled();
  });

  test('dos minijuegos seguidos: el segundo ve el saldo ya descontado y se corta', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    const saldoInicial = COSTOS_ENERGIA.MINIJUEGO + 1;
    // Cada lectura ocurre dentro de su transacción: la segunda ya ve el gasto de
    // la primera, que es lo que impide gastar dos veces la misma estamina.
    prisma.mascotaAmistad.findUnique
      .mockResolvedValueOnce({ ...mascota, energia: saldoInicial, updatedAt: new Date() })
      .mockResolvedValue({ ...mascota, energia: 1, updatedAt: new Date() });
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascota, energia: 1 });

    const cuerpo = { amistadId: AMISTAD_ID, accion: 'MINIJUEGO', minijuego: 'ATRAPALA' };
    const primero = await request(app)
      .post('/api/mascota/cuidar')
      .set('Authorization', `Bearer ${token}`)
      .send(cuerpo);
    const segundo = await request(app)
      .post('/api/mascota/cuidar')
      .set('Authorization', `Bearer ${token}`)
      .send(cuerpo);

    expect(primero.status).toBe(200);
    expect(segundo.status).toBe(422);
    expect(segundo.body.energiaActual).toBe(1);
    expect(prisma.mascotaAmistad.update).toHaveBeenCalledTimes(1);
    expect(prisma.mascotaAmistad.update.mock.calls[0][0].data.energia)
      .toBe(saldoInicial - COSTOS_ENERGIA.MINIJUEGO);
  });

  test('el minijuego cobra estamina aunque el límite diario ya no dé experiencia', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({ ...mascota, updatedAt: new Date() });
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascota, energia: 30 });
    prisma.cheer.count.mockResolvedValue(5);

    const res = await request(app)
      .post('/api/mascota/cuidar')
      .set('Authorization', `Bearer ${token}`)
      .send({ amistadId: AMISTAD_ID, accion: 'MINIJUEGO', minijuego: 'RITMO_CARINO' });

    expect(res.status).toBe(200);
    expect(res.body.experienciaOtorgada).toBe(0);
    expect(res.body.limiteDiarioAlcanzado).toBe(true);
    expect(prisma.mascotaAmistad.update.mock.calls[0][0].data.energia)
      .toBe(50 - COSTOS_ENERGIA.MINIJUEGO);
  });

  test('alimentar respeta el cooldown iniciado al jugar', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({ ...mascota, retoCooperativo: null });
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascota, energia: 35 });

    const juego = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/jugar`)
      .set('Authorization', `Bearer ${token}`);
    expect(juego.status).toBe(201);

    prisma.mascotaAmistad.findUnique.mockResolvedValue({
      ...mascota,
      ultimoCuidadoUsuario2: new Date(),
      retoCooperativo: null,
    });
    const alimento = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/alimentar`)
      .set('Authorization', `Bearer ${token}`);

    expect(alimento.status).toBe(429);
    expect(prisma.mascotaAmistad.update).toHaveBeenCalledTimes(1);
  });

  test('reintenta un conflicto serializable antes de responder', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({ ...mascota, retoCooperativo: null });
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascota, energia: 35 });
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('write conflict'), { code: 'P2034' }));

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/jugar`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    // El reintento vuelve a leer y cobra una sola vez.
    expect(prisma.mascotaAmistad.update).toHaveBeenCalledTimes(1);
    expect(prisma.mascotaAmistad.update.mock.calls[0][0].data.energia)
      .toBe(50 - COSTOS_ENERGIA.JUGAR);
  });

  test('no cuida una mascota archivada mientras comenzaba la acción', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique
      .mockResolvedValueOnce(mascota)
      .mockResolvedValue({ ...mascota, activa: false, retoCooperativo: null });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/jugar`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(prisma.mascotaAmistad.update).not.toHaveBeenCalled();
  });

  test('expone el contrato de estamina sin un mensaje culpabilizante', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({
      ...mascota,
      energia: 20,
      updatedAt: new Date(),
    });

    const res = await request(app)
      .get(`/api/mascota/${AMISTAD_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.mascota).toEqual(expect.objectContaining({
      energia: 20,
      energiaActual: 20,
      energiaMaxima: ENERGIA_MAXIMA,
      segundosSiguienteRecarga: INTERVALO_REGEN_SEGUNDOS,
      estadoEnergia: 'CRITICO',
      cansada: true,
      // Poca energía se lee como siesta: jugó mucho, no la abandonaron.
      poseEnergia: 'siesta',
    }));
    expect(res.body.mascota.segundosRecargaTotal)
      .toBe((ENERGIA_MAXIMA - 20) / PUNTOS_POR_INTERVALO * INTERVALO_REGEN_SEGUNDOS);
  });

  test('el paso del tiempo recarga la barra sin necesidad de escribir', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({
      ...mascota,
      energia: 10,
      updatedAt: new Date(Date.now() - 5 * INTERVALO_REGEN_SEGUNDOS * 1000),
    });

    const res = await request(app)
      .get(`/api/mascota/${AMISTAD_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.mascota.energiaActual).toBe(10 + 5 * PUNTOS_POR_INTERVALO);
    // Leer no escribe: la recarga se deriva, no se materializa hasta la próxima
    // escritura real.
    expect(prisma.mascotaAmistad.update).not.toHaveBeenCalled();
  });

  test('el cuidado suma más cariño que un par de mensajes y respeta 24 horas por usuario', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({ ...mascota, retoCooperativo: null });
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascota, nivelCarino: 6 });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/cuidado`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(prisma.mascotaAmistad.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        ultimoCuidadoUsuario2: expect.any(Date),
        nivelCarino: { increment: 6 },
      }),
    }));

    prisma.mascotaAmistad.findUnique.mockResolvedValue({
      ...mascota, ultimoCuidadoUsuario2: new Date(), retoCooperativo: null,
    });
    const bloqueado = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/cuidado`)
      .set('Authorization', `Bearer ${token}`);

    expect(bloqueado.status).toBe(429);
    expect(prisma.mascotaAmistad.update).toHaveBeenCalledTimes(1);
  });

  test('el reto expira y no entrega su premio fuera de la ventana', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({
      ...mascota,
      retoCooperativo: {
        tipo: 'CUIDADO_COMPARTIDO', expiraEn: '2000-01-01T00:00:00.000Z',
        progresoUsuario1: true, progresoUsuario2: true, completado: false,
      },
    });
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascota, nivelCarino: 6 });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/cuidado`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(prisma.mascotaAmistad.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ nivelCarino: { increment: 6 } }),
    }));
  });

  test('no reemplaza un reto todavía vigente', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({
      ...mascota,
      retoCooperativo: {
        tipo: 'CUIDADO_COMPARTIDO', expiraEn: '2099-01-01T00:00:00.000Z',
        progresoUsuario1: false, progresoUsuario2: false, completado: false,
      },
    });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/reto`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(prisma.mascotaAmistad.update).not.toHaveBeenCalled();
  });

  test('al completar ambos cuidados antes de vencer avanza a la siguiente etapa y guarda un hito', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({
      ...mascota,
      nivelCarino: 3,
      retoCooperativo: {
        tipo: 'CUIDADO_COMPARTIDO', expiraEn: '2099-01-01T00:00:00.000Z',
        progresoUsuario1: true, progresoUsuario2: false, completado: false,
      },
    });
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascota, nivelCarino: 10 });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/cuidado`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    const data = prisma.mascotaAmistad.update.mock.calls[0][0].data;
    expect(data.nivelCarino).toEqual({ increment: 7 });
    expect(data.retoCooperativo.completado).toBe(true);
    expect(data.historialHitos).toEqual([expect.objectContaining({ hito: expect.stringMatching(/Completaron/) })]);
  });

  test('negocia el nombre: una persona propone y la otra confirma el mismo nombre', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(mascota);
    prisma.mascotaAmistad.update.mockResolvedValue({
      ...mascota,
      nombrePropuesto: JSON.stringify({ nombre: 'Nube', propuestoPor: MY_USER_ID }),
    });

    const propuesta = await request(app)
      .patch(`/api/mascota/${AMISTAD_ID}/nombre`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Nube' });
    expect(propuesta.status).toBe(200);
    expect(propuesta.body.confirmado).toBe(false);

    prisma.mascotaAmistad.findUnique.mockResolvedValue({
      ...mascota,
      nombrePropuesto: JSON.stringify({ nombre: 'Nube', propuestoPor: MY_USER_ID }),
    });
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascota, nombre: 'Nube', nombrePropuesto: null });
    const confirmacion = await request(app)
      .patch(`/api/mascota/${AMISTAD_ID}/nombre`)
      .set('Authorization', `Bearer ${friendToken}`)
      .send({ nombre: 'Nube' });
    expect(confirmacion.status).toBe(200);
    expect(confirmacion.body.confirmado).toBe(true);
    expect(prisma.mascotaAmistad.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ nombre: 'Nube', nombrePropuesto: null }),
    }));
  });

  test('solo devuelve una personalidad agregada, nunca los ánimos de cada persona', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.moodEntry.findMany.mockResolvedValue([{ moodType: 'FELIZ' }, { moodType: 'FELIZ' }]);

    const res = await request(app)
      .get(`/api/mascota/${AMISTAD_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.mascota.personalidad).toBe('más animada');
    expect(JSON.stringify(res.body.mascota)).not.toContain('FELIZ');
    expect(res.body.mascota).not.toHaveProperty('moodEntries');
  });
});

describe('POST /api/mascota/:amistadId/actividad', () => {
  test('registra una actividad compartida una sola vez y suma 3 de cariño', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.cheer.findFirst.mockResolvedValue(null);
    prisma.cheer.create.mockResolvedValue({ id: 20 });
    prisma.mascotaAmistad.upsert.mockResolvedValue({ ...mascota, nivelCarino: 3 });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/actividad`)
      .set('Authorization', `Bearer ${token}`)
      .send({ completionId: 'salida:2026-07-20' });

    expect(res.status).toBe(201);
    expect(res.body.registrada).toBe(true);
    expect(prisma.cheer.create).toHaveBeenCalledWith({
      data: {
        fromUserId: MY_USER_ID,
        toUserId: FRIEND_ID,
        message: '__MASCOTA_ACTIVIDAD__:salida:2026-07-20',
        seen: true,
      },
    });
    // El cariño va acompañado de la energía regenerada: la escritura mueve
    // `updatedAt` y sin materializar se perdería la recarga acumulada.
    expect(prisma.mascotaAmistad.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { nivelCarino: { increment: 3 }, energia: 50 },
    }));
    expect(notifySharedActivity).toHaveBeenCalledWith({
      fromUserId: MY_USER_ID,
      toUserId: FRIEND_ID,
    });
  });

  test('la misma completionId es idempotente incluso si la marcó el otro usuario', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.cheer.findFirst.mockResolvedValue({ id: 20 });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/actividad`)
      .set('Authorization', `Bearer ${token}`)
      .send({ completionId: 'salida:2026-07-20' });

    expect(res.status).toBe(200);
    expect(res.body.registrada).toBe(false);
    expect(prisma.cheer.create).not.toHaveBeenCalled();
    expect(prisma.mascotaAmistad.upsert).not.toHaveBeenCalled();
    expect(notifySharedActivity).not.toHaveBeenCalled();
  });

  test('registra la actividad pero no suma cariño si la mascota no está activa', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(null);
    prisma.cheer.findFirst.mockResolvedValue(null);
    prisma.cheer.create.mockResolvedValue({ id: 21 });

    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/actividad`)
      .set('Authorization', `Bearer ${token}`)
      .send({ completionId: 'salida:2026-07-21' });

    expect(res.status).toBe(201);
    expect(res.body.registrada).toBe(true);
    expect(res.body.mascota).toBeNull();
    expect(prisma.cheer.create).toHaveBeenCalled();
    expect(prisma.mascotaAmistad.upsert).not.toHaveBeenCalled();
    expect(notifySharedActivity).not.toHaveBeenCalled();
  });

  test('valida completionId', async () => {
    const res = await request(app)
      .post(`/api/mascota/${AMISTAD_ID}/actividad`)
      .set('Authorization', `Bearer ${token}`)
      .send({ completionId: '   ' });

    expect(res.status).toBe(400);
    expect(prisma.friendship.findFirst).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/mascota/:amistadId/accesorios', () => {
  // Nivel alto → muchos accesorios desbloqueados para las pruebas de equipar.
  const mascotaNivelAlto = { ...mascota, nivelCarino: 50, historialHitos: [] };

  test('equipa un accesorio desbloqueado de la categoría correcta', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(mascotaNivelAlto);
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascotaNivelAlto, accesorioCabeza: 'gorrito' });

    const res = await request(app)
      .patch(`/api/mascota/${AMISTAD_ID}/accesorios`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cabeza: 'gorrito' });

    expect(res.status).toBe(200);
    expect(prisma.mascotaAmistad.update).toHaveBeenCalledWith({
      where: { amistadId: AMISTAD_ID, activa: true, invitacionEstado: 'aceptada' },
      data: { accesorioCabeza: 'gorrito', energia: 50 },
    });
    expect(res.body.mascota.accesorios.cabeza).toBe('gorrito');
  });

  test('rechaza un accesorio no desbloqueado', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({ ...mascota, nivelCarino: 2, historialHitos: [] });

    const res = await request(app)
      .patch(`/api/mascota/${AMISTAD_ID}/accesorios`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cabeza: 'corona' });

    expect(res.status).toBe(400);
    expect(prisma.mascotaAmistad.update).not.toHaveBeenCalled();
  });

  test('rechaza un id de la categoría equivocada', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(mascotaNivelAlto);

    const res = await request(app)
      .patch(`/api/mascota/${AMISTAD_ID}/accesorios`)
      .set('Authorization', `Bearer ${token}`)
      .send({ color: 'gorrito' });

    expect(res.status).toBe(400);
    expect(prisma.mascotaAmistad.update).not.toHaveBeenCalled();
  });

  test('permite desequipar con null', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue(mascotaNivelAlto);
    prisma.mascotaAmistad.update.mockResolvedValue({ ...mascotaNivelAlto, accesorioColor: null });

    const res = await request(app)
      .patch(`/api/mascota/${AMISTAD_ID}/accesorios`)
      .set('Authorization', `Bearer ${token}`)
      .send({ color: null });

    expect(res.status).toBe(200);
    expect(prisma.mascotaAmistad.update).toHaveBeenCalledWith({
      where: { amistadId: AMISTAD_ID, activa: true, invitacionEstado: 'aceptada' },
      data: { accesorioColor: null, energia: 50 },
    });
  });

  test('404 si la mascota no está aceptada (opt-in)', async () => {
    prisma.friendship.findFirst.mockResolvedValue(amistad);
    prisma.mascotaAmistad.findUnique.mockResolvedValue({ ...mascotaNivelAlto, invitacionEstado: 'pendiente' });

    const res = await request(app)
      .patch(`/api/mascota/${AMISTAD_ID}/accesorios`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cabeza: 'gorrito' });

    expect(res.status).toBe(404);
    expect(prisma.mascotaAmistad.update).not.toHaveBeenCalled();
  });
});
