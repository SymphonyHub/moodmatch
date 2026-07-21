const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const {
  dispatchNotification,
  notifyFriendAccepted,
  notifyNewMessage,
} = require('../lib/notificationEvents');

const VALID_CHEERS = [
  '💚 Pensando en ti',
  '✨ Espero que tengas un buen día',
  '🤗 Aquí estoy si me necesitas',
  '🌟 Eres más fuerte de lo que crees',
  '☕ ¿Una pausa te vendría bien?',
  '🙌 ¡Vas muy bien, sigue así!',
];

// La amistad se guarda como una sola fila (quien escaneó → escaneado) pero se
// trata como vínculo simétrico: ambos lados se ven como amigos y pueden chatear.
const findFriendshipBetween = (a, b) =>
  prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: a, friendId: b },
        { userId: b, friendId: a },
      ],
    },
  });

// POST /api/friendships
router.post('/', requireAuth, async (req, res) => {
  const { qrCode } = req.body;

  if (!qrCode || !qrCode.trim()) {
    return res.status(400).json({ error: 'qrCode es requerido' });
  }

  const friend = await prisma.user.findUnique({
    where: { qrCode: qrCode.trim() },
    select: { id: true, nombre: true, email: true, qrCode: true, avatarUrl: true },
  });

  if (!friend) {
    return res.status(404).json({ error: 'No se encontró un usuario con ese código' });
  }

  if (friend.id === req.user.userId) {
    return res.status(400).json({ error: 'No puedes agregarte a ti mismo' });
  }

  const existing = await findFriendshipBetween(req.user.userId, friend.id);

  if (existing) {
    return res.status(409).json({ error: 'Ya son amigos' });
  }

  // La mascota ya no nace con la amistad (Fase 14): es opt-in y se crea solo
  // cuando alguien envía una invitación explícita desde la sección Mascota.
  const friendship = await prisma.friendship.create({
    data: {
      userId: req.user.userId,
      friendId: friend.id,
    },
  });

  dispatchNotification(notifyFriendAccepted({
    acceptedByUserId: req.user.userId,
    invitationOwnerId: friend.id,
  }));

  res.status(201).json({ friendship, friend });
});

// GET /api/friendships
router.get('/', requireAuth, async (req, res) => {
  const me = req.user.userId;

  const userSelect = {
    id: true,
    nombre: true,
    avatarUrl: true,
    moodEntries: {
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: { moodType: true, createdAt: true },
    },
  };

  const [friendships, unreadGroups] = await Promise.all([
    prisma.friendship.findMany({
      where: { OR: [{ userId: me }, { friendId: me }] },
      include: {
        user: { select: userSelect },
        friend: { select: userSelect },
      },
    }),
    prisma.cheer.groupBy({
      by: ['fromUserId'],
      where: { toUserId: me, seen: false },
      _count: { _all: true },
    }),
  ]);

  const unreadByFriend = Object.fromEntries(
    unreadGroups.map((g) => [g.fromUserId, g._count._all]),
  );

  const vistos = new Set();
  const amigos = [];
  for (const f of friendships) {
    const other = f.userId === me ? f.friend : f.user;
    if (vistos.has(other.id)) continue;
    vistos.add(other.id);
    amigos.push({
      id: other.id,
      amistadId: f.id,
      nombre: other.nombre,
      avatarUrl: other.avatarUrl,
      moodReciente: other.moodEntries[0]?.moodType ?? null,
      fechaReciente: other.moodEntries[0]?.createdAt ?? null,
      unread: unreadByFriend[other.id] ?? 0,
    });
  }

  res.json({ amigos });
});

// GET /api/friendships/count — conteo ligero para el hook global del frontend
// (FriendsCountContext). Misma semántica de vínculo simétrico que GET /:
// pueden existir filas espejo A→B y B→A, así que se deduplica por el otro id.
router.get('/count', requireAuth, async (req, res) => {
  const me = req.user.userId;

  const rows = await prisma.friendship.findMany({
    where: { OR: [{ userId: me }, { friendId: me }] },
    select: { userId: true, friendId: true },
  });

  const otros = new Set(rows.map((f) => (f.userId === me ? f.friendId : f.userId)));

  res.json({ count: otros.size });
});

// POST /api/friendships/:friendId/cheer
// Deprecated: la UI nueva envía por /api/messages; se mantiene para builds viejos.
router.post('/:friendId/cheer', requireAuth, async (req, res) => {
  const friendId = parseInt(req.params.friendId, 10);
  const { message } = req.body;

  if (!VALID_CHEERS.includes(message)) {
    return res.status(400).json({ error: 'Mensaje no válido' });
  }

  const friendship = await findFriendshipBetween(req.user.userId, friendId);
  if (!friendship) {
    return res.status(403).json({ error: 'No son amigos' });
  }

  const cheer = await prisma.cheer.create({
    data: { fromUserId: req.user.userId, toUserId: friendId, message },
  });

  dispatchNotification(notifyNewMessage({
    fromUserId: req.user.userId,
    toUserId: friendId,
  }));

  res.status(201).json({ cheer });
});

module.exports = router;
