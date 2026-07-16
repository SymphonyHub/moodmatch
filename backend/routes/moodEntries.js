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

// GET /api/mood-entries?days=30 — registros del usuario dentro de la ventana
// de días pedida (para la vista de historial). Sin suggestions: aquí solo
// importan los ánimos y sus notas. Lista vacía = 200 (estado normal).
router.get('/', requireAuth, async (req, res) => {
  const days = req.query.days === undefined ? 30 : Number(req.query.days);
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    return res.status(400).json({ error: 'days debe ser un entero entre 1 y 90' });
  }

  const corte = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const entries = await prisma.moodEntry.findMany({
    where: { userId: req.user.userId, createdAt: { gte: corte } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, moodType: true, nota: true, createdAt: true },
    take: 200,
  });

  res.json({ entries });
});

// GET /api/mood-entries/latest — último registro del usuario + su sugerencia
// más reciente, aplanada como `actividad`. Sin registros responde 200 con
// nulls: para la pestaña "Para mí" el vacío es un estado normal, no un error.
router.get('/latest', requireAuth, async (req, res) => {
  const entry = await prisma.moodEntry.findFirst({
    where: { userId: req.user.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      suggestions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { activity: true },
      },
    },
  });

  if (!entry) return res.json({ moodEntry: null, actividad: null });

  const { suggestions, ...moodEntry } = entry;
  res.json({ moodEntry, actividad: suggestions[0]?.activity ?? null });
});

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
