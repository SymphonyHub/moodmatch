const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { detectarCrisis } = require('../lib/tonoCrisis');
const { generarSugerenciaSocial } = require('../lib/gemini');
const {
  contextoPerfilPersonalidad,
  sanearMoodsVisibles,
  orientacionSocial,
  completarSugerenciaSocial,
  sugerenciaSocialPlantilla,
  validarSugerenciaSocial,
} = require('../lib/socialSuggestions');

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

// POST /api/activities/suggest-social
// No acepta texto ni datos de amigos en el body. El backend obtiene solo el
// perfil propio y el último mood que ya expone GET /api/friendships; nombres,
// notas, mensajes e ids nunca se envían a Gemini.
router.post('/suggest-social', requireAuth, async (req, res) => {
  const me = req.user.userId;
  const moodSelect = {
    moodEntries: {
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: { moodType: true },
    },
  };

  const [user, friendships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: me },
      select: { perfilPersonalidad: true },
    }),
    prisma.friendship.findMany({
      where: { OR: [{ userId: me }, { friendId: me }] },
      select: {
        userId: true,
        friendId: true,
        user: { select: moodSelect },
        friend: { select: moodSelect },
      },
    }),
  ]);

  const vistos = new Set();
  const moods = [];
  for (const friendship of friendships) {
    const other = friendship.userId === me ? friendship.friend : friendship.user;
    const otherId = friendship.userId === me ? friendship.friendId : friendship.userId;
    if (vistos.has(otherId)) continue;
    vistos.add(otherId);
    const mood = other.moodEntries[0]?.moodType;
    if (mood) moods.push(mood);
  }

  // Gemini conoce qué estados están presentes, no cuántas amistades hay en
  // cada uno. La cantidad y distribución no hacen falta para sugerir un plan.
  const moodsVisibles = [...new Set(sanearMoodsVisibles(moods))];
  const perfilCrudo = user?.perfilPersonalidad;
  const perfil = contextoPerfilPersonalidad(perfilCrudo);
  const orientacion = orientacionSocial(moodsVisibles);
  const fallback = () =>
    res.json({ activity: sugerenciaSocialPlantilla(moodsVisibles), fuente: 'plantilla' });

  // Segunda capa del escudo: si el perfil libre llegara a contener una señal
  // de crisis, ese contexto no sale hacia Gemini. El cliente no manda body,
  // por lo que tampoco puede filtrar o ampliar los datos de amistades.
  if (detectarCrisis(JSON.stringify(perfilCrudo ?? ''))) return fallback();

  try {
    const sugerencia = await generarSugerenciaSocial({ orientacion, perfil });
    if (validarSugerenciaSocial(sugerencia)) {
      return res.json({ activity: completarSugerenciaSocial(sugerencia), fuente: 'gemini' });
    }
  } catch (err) {
    console.warn(`Gemini social fallback: ${err.message}`);
  }

  return fallback();
});

module.exports = router;
