const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const VALID_MOODS = ['FELIZ', 'TRISTE', 'ANSIOSO', 'CALMADO', 'ENOJADO', 'NEUTRO'];

async function nextSuggestion(userId, moodType, moodEntryId) {
  const moodActivities = await prisma.moodActivity.findMany({
    where: { moodType },
    include: { activity: true },
    orderBy: { activityId: 'asc' },
  });

  if (moodActivities.length === 0) return null;

  const idx = Math.floor(Math.random() * moodActivities.length);
  const chosen = moodActivities[idx].activity;

  await prisma.suggestion.create({
    data: { moodEntryId, activityId: chosen.id },
  });

  return chosen;
}

// POST /api/mood-entries
router.post('/', requireAuth, async (req, res) => {
  const { moodType, nota } = req.body;

  if (!moodType) return res.status(400).json({ error: 'moodType es requerido' });
  if (!VALID_MOODS.includes(moodType)) {
    return res.status(400).json({ error: `moodType debe ser uno de: ${VALID_MOODS.join(', ')}` });
  }

  const moodEntry = await prisma.moodEntry.create({
    data: { userId: req.user.userId, moodType, nota: nota || null },
  });

  const actividadSugerida = await nextSuggestion(req.user.userId, moodType, moodEntry.id);

  res.status(201).json({ moodEntry, actividadSugerida });
});

// POST /api/mood-entries/:id/suggestion — "Quiero otra idea"
router.post('/:id/suggestion', requireAuth, async (req, res) => {
  const moodEntryId = parseInt(req.params.id, 10);

  const moodEntry = await prisma.moodEntry.findUnique({ where: { id: moodEntryId } });
  if (!moodEntry || moodEntry.userId !== req.user.userId) {
    return res.status(404).json({ error: 'Registro no encontrado' });
  }

  const activity = await nextSuggestion(req.user.userId, moodEntry.moodType, moodEntryId);
  res.json({ activity });
});

module.exports = router;
