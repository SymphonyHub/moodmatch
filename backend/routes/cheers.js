const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

// GET /api/cheers — retorna cheers no vistos y los marca como vistos
router.get('/', requireAuth, async (req, res) => {
  const cheers = await prisma.cheer.findMany({
    where: { toUserId: req.user.userId, seen: false },
    include: { fromUser: { select: { id: true, nombre: true } } },
    orderBy: { createdAt: 'asc' },
  });

  if (cheers.length > 0) {
    await prisma.cheer.updateMany({
      where: { toUserId: req.user.userId, seen: false },
      data: { seen: true },
    });
  }

  res.json({ cheers: cheers.map((c) => ({ id: c.id, message: c.message, fromNombre: c.fromUser.nombre })) });
});

module.exports = router;
