const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const VALID_MOODS = ['FELIZ', 'TRISTE', 'ANSIOSO', 'CALMADO', 'ENOJADO', 'NEUTRO'];
const CLIENT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function nextSuggestion(db, moodType, moodEntryId) {
  const moodActivities = await db.moodActivity.findMany({
    where: { moodType },
    include: { activity: true },
    orderBy: { activityId: 'asc' },
  });

  if (moodActivities.length === 0) return null;

  const idx = Math.floor(Math.random() * moodActivities.length);
  const chosen = moodActivities[idx].activity;

  await db.suggestion.create({
    data: { moodEntryId, activityId: chosen.id },
  });

  return chosen;
}

const respuestaDesdeEntry = (entry, creada) => {
  const { suggestions = [], ...moodEntry } = entry;
  return {
    moodEntry,
    actividadSugerida: suggestions[0]?.activity ?? null,
    creada,
  };
};

const mismoRegistro = (entry, userId, moodType, nota, capturedAt) => (
  entry.userId === userId
  && entry.moodType === moodType
  && (entry.nota ?? null) === nota
  && (!capturedAt || new Date(entry.createdAt).toISOString() === capturedAt.toISOString())
);

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
  const {
    moodType, nota, clientId: clientIdRaw, capturedAt: capturedAtRaw,
  } = req.body;

  if (!moodType) return res.status(400).json({ error: 'moodType es requerido' });
  if (!VALID_MOODS.includes(moodType)) {
    return res.status(400).json({ error: `moodType debe ser uno de: ${VALID_MOODS.join(', ')}` });
  }
  if (nota !== undefined && nota !== null && typeof nota !== 'string') {
    return res.status(400).json({ error: 'nota debe ser texto' });
  }
  if (clientIdRaw !== undefined && clientIdRaw !== null && !CLIENT_ID_RE.test(clientIdRaw)) {
    return res.status(400).json({ error: 'clientId inválido' });
  }
  const capturedAt = capturedAtRaw ? new Date(capturedAtRaw) : null;
  if (capturedAtRaw && Number.isNaN(capturedAt.getTime())) {
    return res.status(400).json({ error: 'capturedAt inválido' });
  }

  const userId = req.user.userId;
  const clientId = clientIdRaw ?? null;
  const notaNormalizada = nota || null;
  let resultado;

  try {
    resultado = await prisma.$transaction(async (tx) => {
      if (clientId) {
        const existente = await tx.moodEntry.findUnique({
          where: { clientId },
          include: { suggestions: { take: 1, include: { activity: true } } },
        });
        if (existente) return respuestaDesdeEntry(existente, false);
      }

      const moodEntry = await tx.moodEntry.create({
        data: {
          userId,
          clientId,
          moodType,
          nota: notaNormalizada,
          ...(capturedAt && { createdAt: capturedAt }),
        },
      });
      const actividadSugerida = await nextSuggestion(tx, moodType, moodEntry.id);
      return { moodEntry, actividadSugerida, creada: true };
    });
  } catch (error) {
    // Dos sincronizaciones concurrentes pueden intentar insertar el mismo UUID.
    // La restricción única decide; el perdedor devuelve el registro ya creado.
    if (error?.code !== 'P2002' || !clientId) throw error;
    const existente = await prisma.moodEntry.findUnique({
      where: { clientId },
      include: { suggestions: { take: 1, include: { activity: true } } },
    });
    if (!existente) throw error;
    resultado = respuestaDesdeEntry(existente, false);
  }

  if (!mismoRegistro(resultado.moodEntry, userId, moodType, notaNormalizada, capturedAt)) {
    return res.status(409).json({ error: 'clientId ya fue usado para otro registro' });
  }

  const { creada, ...body } = resultado;
  res.status(creada ? 201 : 200).json(body);
});

// POST /api/mood-entries/:id/suggestion — "Quiero otra idea"
router.post('/:id/suggestion', requireAuth, async (req, res) => {
  const moodEntryId = parseInt(req.params.id, 10);

  const moodEntry = await prisma.moodEntry.findUnique({ where: { id: moodEntryId } });
  if (!moodEntry || moodEntry.userId !== req.user.userId) {
    return res.status(404).json({ error: 'Registro no encontrado' });
  }

  const activity = await nextSuggestion(prisma, moodEntry.moodType, moodEntryId);
  res.json({ activity });
});

module.exports = router;
