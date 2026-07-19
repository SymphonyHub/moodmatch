const jwt = require('jsonwebtoken');

// Secreto de firma de los JWT de sesión. En producción DEBE venir del entorno
// (dashboard de Render): si falta, el backend no arranca en vez de caer en
// silencio a un default público conocido, que permitiría forjar tokens de
// cualquier usuario. En desarrollo/test se permite el fallback para no romper
// el entorno local ni los tests.
const DEV_SECRET = 'moodmatch-dev-secret';

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET no está definida — revisa las variables de entorno de Render. ' +
        'El backend no arranca en producción sin un secreto de firma explícito.',
    );
  }

  return DEV_SECRET;
}

const JWT_SECRET = resolveJwtSecret();

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = { requireAuth, JWT_SECRET, resolveJwtSecret, DEV_SECRET };
