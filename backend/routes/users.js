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

// Debe coincidir con los validadores del frontend (app/theme/customTheme.js):
// isValidPaletteConfig / isValidPalette / isValidCustomTheme. El valor
// persistido es el contenedor { activeId, palettes[] }; también se acepta el
// objeto legacy de 4 claves para la transición (clientes viejos).
const HEX_RE = /^#[0-9a-f]{6}$/i;
const VALID_BODY_FONTS = [
  'manrope',
  'nunito',
  'baloo2',
  'rubik',
  'lora',
  'bitter',
  'fraunces',
  'grenzeGotisch',
  'macondo',
];
const CONFIG_KEYS = ['primary', 'accent', 'background', 'bodyFont'];
const PALETTE_KEYS = ['id', 'name', ...CONFIG_KEYS];
const CONTAINER_KEYS = ['activeId', 'palettes'];
const MAX_PALETAS = 5;
const NAME_MAX = 24;
const PERFIL_RESPUESTAS = {
  compania: ['uno_a_uno', 'grupo_pequeno', 'grupo_grande'],
  ritmo: ['tranquilo', 'equilibrado', 'activo'],
  entorno: ['casa', 'aire_libre', 'indistinto'],
  actividad: ['creativa', 'movimiento', 'entretenimiento', 'reflexion'],
  recarga: ['musica', 'naturaleza', 'conversar', 'desconectar'],
  novedad: ['conocido', 'mezcla', 'explorar'],
};
const AVATAR_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'g0vemv0z';

function isValidAvatarUrl(value) {
  if (value === null) return true;
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'res.cloudinary.com' &&
      url.pathname.startsWith(`/${AVATAR_CLOUD_NAME}/image/upload/`)
    );
  } catch {
    return false;
  }
}

function esObjeto(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isValidPaletteConfig(value) {
  if (!esObjeto(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== CONFIG_KEYS.length || !CONFIG_KEYS.every((k) => keys.includes(k))) {
    return false;
  }
  return (
    HEX_RE.test(value.primary) &&
    HEX_RE.test(value.accent) &&
    HEX_RE.test(value.background) &&
    VALID_BODY_FONTS.includes(value.bodyFont)
  );
}

function isValidPalette(value) {
  if (!esObjeto(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== PALETTE_KEYS.length || !PALETTE_KEYS.every((k) => keys.includes(k))) {
    return false;
  }
  if (typeof value.id !== 'string' || value.id.length === 0) return false;
  if (typeof value.name !== 'string') return false;
  const name = value.name.trim();
  if (name.length === 0 || value.name.length > NAME_MAX) return false;
  const { id, name: _n, ...config } = value;
  return isValidPaletteConfig(config);
}

function isValidContainer(value) {
  if (!esObjeto(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== CONTAINER_KEYS.length || !CONTAINER_KEYS.every((k) => keys.includes(k))) {
    return false;
  }
  if (!Array.isArray(value.palettes)) return false;
  if (value.palettes.length < 1 || value.palettes.length > MAX_PALETAS) return false;
  if (!value.palettes.every(isValidPalette)) return false;
  const ids = value.palettes.map((p) => p.id);
  if (new Set(ids).size !== ids.length) return false;
  return typeof value.activeId === 'string' && ids.includes(value.activeId);
}

// Acepta el contenedor nuevo o el objeto legacy de 4 claves.
function isValidCustomTheme(value) {
  return isValidContainer(value) || isValidPaletteConfig(value);
}

// Contrato v1 compartido con app/features/onboarding/perfilPersonalidad.js:
// { version: 1, completadoEn: ISO-8601, respuestas: { compania, ritmo,
// entorno, actividad, recarga, novedad } }. Cada valor debe pertenecer al
// enum declarado arriba; no se admiten claves extra para mantenerlo estable.
function isValidPerfilPersonalidad(value) {
  if (!esObjeto(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== 3 || !['version', 'completadoEn', 'respuestas'].every((k) => keys.includes(k))) {
    return false;
  }
  if (value.version !== 1 || typeof value.completadoEn !== 'string') return false;
  const timestamp = Date.parse(value.completadoEn);
  if (
    Number.isNaN(timestamp) ||
    new Date(timestamp).toISOString() !== value.completadoEn ||
    !esObjeto(value.respuestas)
  ) return false;

  const respuestaKeys = Object.keys(value.respuestas);
  const expectedKeys = Object.keys(PERFIL_RESPUESTAS);
  if (respuestaKeys.length !== expectedKeys.length || !expectedKeys.every((k) => respuestaKeys.includes(k))) {
    return false;
  }
  return expectedKeys.every((key) => PERFIL_RESPUESTAS[key].includes(value.respuestas[key]));
}

const USER_SELECT = {
  id: true,
  nombre: true,
  email: true,
  qrCode: true,
  themePreference: true,
  customTheme: true,
  perfilPersonalidad: true,
  avatarUrl: true,
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

// PATCH /api/users/me — actualiza preferencias permitidas del perfil.
// null es válido en los campos de tema: vuelve al default / borra la paleta.
router.patch('/me', requireAuth, async (req, res) => {
  const body = req.body ?? {};

  if (
    !('themePreference' in body) &&
    !('customTheme' in body) &&
    !('perfilPersonalidad' in body) &&
    !('avatarUrl' in body)
  ) {
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

  if ('perfilPersonalidad' in body) {
    const { perfilPersonalidad } = body;
    if (!isValidPerfilPersonalidad(perfilPersonalidad)) {
      return res.status(400).json({ error: 'Perfil de personalidad inválido' });
    }
    data.perfilPersonalidad = perfilPersonalidad;
  }

  if ('avatarUrl' in body) {
    if (!isValidAvatarUrl(body.avatarUrl)) {
      return res.status(400).json({ error: 'URL de avatar inválida' });
    }
    data.avatarUrl = body.avatarUrl;
  }

  const user = await prisma.user.update({
    where: { id: req.user.userId },
    data,
    select: USER_SELECT,
  });

  res.json({ user });
});

module.exports = router;
