const router = require('express').Router();
const prisma = require('../lib/prisma');

// Página pública compartible por WhatsApp/otras apps: un link https clickeable
// que redirige a la app vía deep link, con el código visible como fallback.
// No requiere auth y solo expone el nombre (lo mismo que ya expone el flujo QR).

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

const page = ({ titulo, cuerpo, deepLink, code }) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MoodMatch — Invitación</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: system-ui, -apple-system, sans-serif;
    background: #232A3D; color: #F2F4FA; text-align: center;
  }
  .card { padding: 40px 28px; max-width: 420px; }
  h1 { font-size: 22px; margin: 0 0 10px; }
  p { color: #B9C0D4; line-height: 1.55; margin: 0 0 26px; font-size: 15px; }
  a.btn {
    display: inline-block; background: #4A5FC1; color: #fff; text-decoration: none;
    padding: 15px 32px; border-radius: 12px; font-weight: 700; font-size: 16px;
  }
  .code {
    margin-top: 26px; font-size: 13px; color: #8A93AD;
  }
  .code b { display: block; margin-top: 6px; font-size: 14px; color: #B9C0D4; word-break: break-all; user-select: all; }
</style>
</head>
<body>
  <div class="card">
    <h1>${titulo}</h1>
    <p>${cuerpo}</p>
    ${deepLink ? `<a class="btn" href="${deepLink}">Abrir en MoodMatch</a>` : ''}
    ${code ? `<div class="code">Si el botón no funciona, en la app entra a Amigos → Agregar por código y usa:<b>${code}</b></div>` : ''}
  </div>
</body>
</html>`;

// GET /invite/:code
router.get('/:code', async (req, res) => {
  const code = req.params.code.trim();

  const user = code
    ? await prisma.user.findUnique({
        where: { qrCode: code },
        select: { nombre: true },
      })
    : null;

  if (!user) {
    return res.status(404).type('html').send(page({
      titulo: 'Invitación no encontrada',
      cuerpo: 'Este link de invitación no es válido o ya no existe. Pídele a tu amigo que te comparta uno nuevo desde MoodMatch.',
    }));
  }

  const safeCode = escapeHtml(code);
  res.type('html').send(page({
    titulo: `${escapeHtml(user.nombre)} te invita a MoodMatch`,
    cuerpo: 'Acompáñense en el día a día: comparte cómo te sientes y envíense mensajes de ánimo.',
    deepLink: `moodmatch://add-friend?code=${encodeURIComponent(code)}`,
    code: safeCode,
  }));
});

module.exports = router;
