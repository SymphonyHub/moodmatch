const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { filtroMensajesVisibles, registrarMensajeReciproco } = require('../lib/mascota');
const {
  dispatchNotification,
  notifyNewMessage,
} = require('../lib/notificationEvents');

const MAX_LENGTH = 500;

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
    })),
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
    },
    mascota,
  });
});

module.exports = router;
