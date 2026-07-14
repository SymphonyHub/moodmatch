const router = require('express').Router();
const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

// Debe coincidir con VALID_THEME_CHOICES del frontend (app/theme/themes/index.js).
const VALID_THEME_PREFERENCES = [
  'sereno',
  'nocturno',
  'amanecer',
  'contraste',
  'fiesta',
  'auto',
  'personalizado',
];

// Debe coincidir con isValidCustomConfig del frontend (app/theme/customTheme.js).
const HEX_RE = /^#[0-9a-f]{6}$/i;
const VALID_BODY_FONTS = ['manrope', 'nunito', 'baloo2'];
const CUSTOM_THEME_KEYS = ['primary', 'accent', 'background', 'bodyFont'];

function isValidCustomTheme(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== CUSTOM_THEME_KEYS.length) return false;
  if (!CUSTOM_THEME_KEYS.every((k) => keys.includes(k))) return false;
  return (
    HEX_RE.test(value.primary) &&
    HEX_RE.test(value.accent) &&
    HEX_RE.test(value.background) &&
    VALID_BODY_FONTS.includes(value.bodyFont)
  );
}

const USER_SELECT = {
  id: true,
  nombre: true,
  email: true,
  qrCode: true,
  themePreference: true,
  customTheme: true,
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

// PATCH /api/users/me — permite actualizar themePreference y/o customTheme.
// null es válido en ambos: vuelve al tema por defecto / borra la paleta.
router.patch('/me', requireAuth, async (req, res) => {
  const body = req.body ?? {};

  if (!('themePreference' in body) && !('customTheme' in body)) {
    return res.status(400).json({ error: 'Nada que actualizar' });
  }

  const data = {};

  if ('themePreference' in body) {
    const { themePreference } = body;
    if (themePreference !== null && !VALID_THEME_PREFERENCES.includes(themePreference)) {
      return res.status(400).json({ error: 'Tema inválido' });
    }
    data.themePreference = themePreference;
  }

  if ('customTheme' in body) {
    const { customTheme } = body;
    if (customTheme !== null && !isValidCustomTheme(customTheme)) {
      return res.status(400).json({ error: 'Paleta personalizada inválida' });
    }
    // Prisma exige DbNull explícito para limpiar una columna Json.
    data.customTheme = customTheme === null ? Prisma.DbNull : customTheme;
  }

  const user = await prisma.user.update({
    where: { id: req.user.userId },
    data,
    select: USER_SELECT,
  });

  res.json({ user });
});

module.exports = router;
