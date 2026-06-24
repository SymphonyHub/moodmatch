const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const VALID_MOODS = ['FELIZ', 'TRISTE', 'ANSIOSO', 'CALMADO', 'ENOJADO', 'NEUTRO'];

// GET /api/activities?categoria=social
router.get('/', requireAuth, async (req, res) => {
  const { categoria } = req.query;
  const where = categoria ? { categoria } : {};

  const activities = await prisma.activity.findMany({
    where,
    orderBy: { id: 'asc' },
  });

  res.json({ activities });
});

module.exports = router;
