const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { filtroMensajesVisibles, registrarMensajeReciproco } = require('../lib/mascota');
const {
  dispatchNotification,
  notifyNewMessage,
} = require('../lib/notificationEvents');

const MAX_LENGTH = 500;
const REACCIONES_PERMITIDAS = ['❤️', '👍', '😂', '😮', '😢'];
const MAX_REINTENTOS_TRANSACCION = 3;

const serializarReacciones = (reacciones, userId) => {
  const raw = reacciones && typeof reacciones === 'object' && !Array.isArray(reacciones)
    ? reacciones
    : {};
  return REACCIONES_PERMITIDAS.flatMap((emoji) => {
    const usuarios = Array.isArray(raw[emoji])
      ? [...new Set(raw[emoji].filter(Number.isInteger))]
      : [];
    return usuarios.length > 0
      ? [{ emoji, count: usuarios.length, mine: usuarios.includes(userId) }]
      : [];
  });
};

const cambiarReaccion = (reacciones, userId, emoji) => {
  const siguiente = {};
  for (const permitido of REACCIONES_PERMITIDAS) {
    const usuarios = Array.isArray(reacciones?.[permitido])
      ? [...new Set(reacciones[permitido].filter((id) => Number.isInteger(id) && id !== userId))]
      : [];
    if (usuarios.length > 0) siguiente[permitido] = usuarios;
  }
  if (emoji) siguiente[emoji] = [...(siguiente[emoji] ?? []), userId];
  return siguiente;
};

async function transaccionSerializable(operacion) {
  for (let intento = 1; intento <= MAX_REINTENTOS_TRANSACCION; intento += 1) {
    try {
      return await prisma.$transaction(operacion, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error?.code !== 'P2034' || intento === MAX_REINTENTOS_TRANSACCION) throw error;
    }
  }
  return null;
}

// Los mensajes directos reutilizan el modelo Cheer: ya tiene from/to/message/seen
// y así el chat no requiere migración. Una conversación son los cheers en ambas
// direcciones entre dos amigos.
const findFriendshipBetween = (a, b) =>
  prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: a, friendId: b },
        { userId: b, friendId: a },
      ],
    },
  });

// GET /api/messages/unread-count
router.get('/unread-count', requireAuth, async (req, res) => {
  const count = await prisma.cheer.count({
    where: { toUserId: req.user.userId, seen: false },
  });
  res.json({ count });
});

// GET /api/messages/:friendId — conversación completa; marca como vistos los entrantes
router.get('/:friendId', requireAuth, async (req, res) => {
  const me = req.user.userId;
  const friendId = parseInt(req.params.friendId, 10);
  if (Number.isNaN(friendId)) {
    return res.status(400).json({ error: 'friendId inválido' });
  }

  const friendship = await findFriendshipBetween(me, friendId);
  if (!friendship) {
    return res.status(403).json({ error: 'No son amigos' });
  }

  const mensajes = await prisma.cheer.findMany({
    where: {
      OR: [
        { fromUserId: me, toUserId: friendId },
        { fromUserId: friendId, toUserId: me },
      ],
      ...filtroMensajesVisibles,
    },
    orderBy: { createdAt: 'asc' },
  });

  await prisma.cheer.updateMany({
    where: { fromUserId: friendId, toUserId: me, seen: false },
    data: { seen: true },
  });

  res.json({
    mensajes: mensajes.map((m) => ({
      id: m.id,
      message: m.message,
      mine: m.fromUserId === me,
      createdAt: m.createdAt,
      reacciones: serializarReacciones(m.reacciones, me),
    })),
  });
});

// PUT /api/messages/:friendId/:messageId/reaction — agrega, cambia o quita
// la única reacción del usuario autenticado sobre ese mensaje.
router.put('/:friendId/:messageId/reaction', requireAuth, async (req, res) => {
  const me = req.user.userId;
  const friendId = Number(req.params.friendId);
  const messageId = Number(req.params.messageId);
  const emoji = req.body.emoji ?? null;

  if (!Number.isInteger(friendId) || !Number.isInteger(messageId)) {
    return res.status(400).json({ error: 'friendId o messageId inválido' });
  }
  if (emoji !== null && !REACCIONES_PERMITIDAS.includes(emoji)) {
    return res.status(400).json({ error: 'Reacción no permitida' });
  }

  const friendship = await findFriendshipBetween(me, friendId);
  if (!friendship) return res.status(403).json({ error: 'No son amigos' });

  const actualizado = await transaccionSerializable(async (tx) => {
    const mensaje = await tx.cheer.findFirst({
      where: {
        id: messageId,
        OR: [
          { fromUserId: me, toUserId: friendId },
          { fromUserId: friendId, toUserId: me },
        ],
        ...filtroMensajesVisibles,
      },
    });
    if (!mensaje) return null;

    return tx.cheer.update({
      where: { id: messageId },
      data: { reacciones: cambiarReaccion(mensaje.reacciones, me, emoji) },
    });
  });

  if (!actualizado) return res.status(404).json({ error: 'Mensaje no encontrado' });
  return res.json({
    mensaje: {
      id: actualizado.id,
      reacciones: serializarReacciones(actualizado.reacciones, me),
    },
  });
});

// POST /api/messages/:friendId — texto libre
router.post('/:friendId', requireAuth, async (req, res) => {
  const me = req.user.userId;
  const friendId = parseInt(req.params.friendId, 10);
  if (Number.isNaN(friendId)) {
    return res.status(400).json({ error: 'friendId inválido' });
  }

  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
  if (!message) {
    return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
  }
  if (message.length > MAX_LENGTH) {
    return res.status(400).json({ error: `El mensaje no puede superar los ${MAX_LENGTH} caracteres` });
  }

  const friendship = await findFriendshipBetween(me, friendId);
  if (!friendship) {
    return res.status(403).json({ error: 'No son amigos' });
  }

  const { mensaje, mascota } = await prisma.$transaction(async (tx) => {
    const creado = await tx.cheer.create({
      data: { fromUserId: me, toUserId: friendId, message },
    });
    const mascotaActual = await registrarMensajeReciproco(tx, friendship, me);
    return { mensaje: creado, mascota: mascotaActual };
  });

  dispatchNotification(notifyNewMessage({ fromUserId: me, toUserId: friendId }));

  res.status(201).json({
    mensaje: {
      id: mensaje.id,
      message: mensaje.message,
      mine: true,
      createdAt: mensaje.createdAt,
      reacciones: [],
    },
    mascota,
  });
});

module.exports = router;
