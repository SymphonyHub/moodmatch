const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

// Debe coincidir con VALID_THEME_CHOICES del frontend (app/theme/themes/index.js).
const VALID_THEME_PREFERENCES = ['sereno', 'nocturno', 'amanecer', 'contraste', 'fiesta', 'auto'];

const USER_SELECT = {
  id: true,
  nombre: true,
  email: true,
  qrCode: true,
  themePreference: true,
  createdAt: true,
};

// GET /api/users/me
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: USER_SELECT,
  });

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  res.json({ user });
});

// PATCH /api/users/me — por ahora solo permite actualizar themePreference.
// null es válido: vuelve al tema por defecto.
router.patch('/me', requireAuth, async (req, res) => {
  const body = req.body ?? {};

  if (!('themePreference' in body)) {
    return res.status(400).json({ error: 'Nada que actualizar' });
  }

  const { themePreference } = body;
  if (themePreference !== null && !VALID_THEME_PREFERENCES.includes(themePreference)) {
    return res.status(400).json({ error: 'Tema inválido' });
  }

  const user = await prisma.user.update({
    where: { id: req.user.userId },
    data: { themePreference },
    select: USER_SELECT,
  });

  res.json({ user });
});

module.exports = router;
