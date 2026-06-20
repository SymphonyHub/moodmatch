const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

// POST /api/friendships
router.post('/', requireAuth, async (req, res) => {
  const { qrCode } = req.body;

  if (!qrCode || !qrCode.trim()) {
    return res.status(400).json({ error: 'qrCode es requerido' });
  }

  const friend = await prisma.user.findUnique({
    where: { qrCode: qrCode.trim() },
    select: { id: true, nombre: true, email: true, qrCode: true },
  });

  if (!friend) {
    return res.status(404).json({ error: 'No se encontró un usuario con ese código QR' });
  }

  if (friend.id === req.user.userId) {
    return res.status(400).json({ error: 'No puedes agregarte a ti mismo' });
  }

  const existing = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId: req.user.userId, friendId: friend.id } },
  });

  if (existing) {
    return res.status(409).json({ error: 'Ya son amigos' });
  }

  const friendship = await prisma.friendship.create({
    data: { userId: req.user.userId, friendId: friend.id },
  });

  res.status(201).json({ friendship, friend });
});

// GET /api/friendships
router.get('/', requireAuth, async (req, res) => {
  const friendships = await prisma.friendship.findMany({
    where: { userId: req.user.userId },
    include: {
      friend: {
        select: {
          id: true,
          nombre: true,
          moodEntries: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { moodType: true, createdAt: true },
          },
        },
      },
    },
  });

  const amigos = friendships.map((f) => ({
    id: f.friend.id,
    nombre: f.friend.nombre,
    moodReciente: f.friend.moodEntries[0]?.moodType ?? null,
    fechaReciente: f.friend.moodEntries[0]?.createdAt ?? null,
  }));

  res.json({ amigos });
});

module.exports = router;
