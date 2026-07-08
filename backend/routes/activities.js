const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const VALID_MOODS = ['FELIZ', 'TRISTE', 'ANSIOSO', 'CALMADO', 'ENOJADO', 'NEUTRO'];

// GET /api/activities/random?mood=FELIZ[&exclude=N]
router.get('/random', requireAuth, async (req, res) => {
  const { mood, exclude } = req.query;

  if (!mood || !VALID_MOODS.includes(mood)) {
    return res.status(400).json({ error: 'mood inválido o faltante' });
  }

  const where = { moodType: mood };
  if (exclude) {
    where.activityId = { not: parseInt(exclude, 10) };
  }

  const moodActivities = await prisma.moodActivity.findMany({
    where,
    include: { activity: true },
  });

  if (moodActivities.length === 0) {
    return res.json({ activity: null });
  }

  const idx = Math.floor(Math.random() * moodActivities.length);
  res.json({ activity: moodActivities[idx].activity });
});

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
