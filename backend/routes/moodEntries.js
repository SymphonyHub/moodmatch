const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const VALID_MOODS = ['FELIZ', 'TRISTE', 'ANSIOSO', 'CALMADO', 'ENOJADO', 'NEUTRO'];

// POST /api/mood-entries
router.post('/', requireAuth, async (req, res) => {
  const { moodType, nota } = req.body;

  if (!moodType) {
    return res.status(400).json({ error: 'moodType es requerido' });
  }
  if (!VALID_MOODS.includes(moodType)) {
    return res.status(400).json({
      error: `moodType debe ser uno de: ${VALID_MOODS.join(', ')}`,
    });
  }

  const moodEntry = await prisma.moodEntry.create({
    data: { userId: req.user.userId, moodType, nota: nota || null },
  });

  // Buscar actividades para este estado de ánimo
  const moodActivities = await prisma.moodActivity.findMany({
    where: { moodType },
    include: { activity: true },
  });

  let actividadSugerida = null;
  if (moodActivities.length > 0) {
    const random = moodActivities[Math.floor(Math.random() * moodActivities.length)];
    const suggestion = await prisma.suggestion.create({
      data: { moodEntryId: moodEntry.id, activityId: random.activityId },
      include: { activity: true },
    });
    actividadSugerida = suggestion.activity;
  }

  res.status(201).json({ moodEntry, actividadSugerida });
});

module.exports = router;
