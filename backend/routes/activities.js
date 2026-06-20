const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const VALID_MOODS = ['FELIZ', 'TRISTE', 'ANSIOSO', 'CALMADO', 'ENOJADO', 'NEUTRO'];

// GET /api/activities/random?mood=FELIZ&exclude=3
router.get('/random', requireAuth, async (req, res) => {
  const { mood, exclude } = req.query;

  if (!mood || !VALID_MOODS.includes(mood)) {
    return res.status(400).json({ error: `mood debe ser uno de: ${VALID_MOODS.join(', ')}` });
  }

  const excludeId = exclude ? parseInt(exclude, 10) : null;

  const where = { moodType: mood };
  if (excludeId && !isNaN(excludeId)) {
    where.activityId = { not: excludeId };
  }

  const moodActivities = await prisma.moodActivity.findMany({
    where,
    include: { activity: true },
  });

  if (moodActivities.length === 0) {
    return res.json({ activity: null });
  }

  const random = moodActivities[Math.floor(Math.random() * moodActivities.length)];
  res.json({ activity: random.activity });
});

module.exports = router;
