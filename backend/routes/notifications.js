const router = require('express').Router();
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { JWT_SECRET, requireAuth } = require('../middleware/auth');
const {
  mergePreferencePatch,
  publicPreferences,
  validatePreferencePatch,
  withTimeZone,
} = require('../lib/notificationPreferences');
const { isExpoPushToken } = require('../lib/pushService');
const { mutatePreferences, runSerializable } = require('../lib/notificationStore');

const unregisterProof = (userId, expoPushToken) => crypto
  .createHmac('sha256', JWT_SECRET)
  .update(`${userId}\0${expoPushToken}`)
  .digest('hex');

const validUnregisterProof = (userId, expoPushToken, proof) => {
  if (!Number.isInteger(userId) || !isExpoPushToken(expoPushToken) || !/^[a-f0-9]{64}$/.test(proof)) {
    return false;
  }
  const expected = unregisterProof(userId, expoPushToken);
  return crypto.timingSafeEqual(Buffer.from(proof, 'hex'), Buffer.from(expected, 'hex'));
};

// Credencial limitada al token exacto: permite completar un logout que ocurrió
// offline sin conservar el JWT de sesión ni afectar otro dispositivo posterior.
router.post('/token/unregister', async (req, res) => {
  const userId = Number(req.body?.userId);
  const { expoPushToken, unregisterToken } = req.body ?? {};
  if (!validUnregisterProof(userId, expoPushToken, unregisterToken)) {
    return res.status(401).json({ error: 'Credencial de desvinculación inválida' });
  }
  await prisma.user.updateMany({
    where: { id: userId, expoPushToken },
    data: { expoPushToken: null },
  });
  return res.status(204).send();
});

router.get('/', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { expoPushToken: true, notificationPreferences: true },
  });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  return res.json({
    preferences: publicPreferences(user.notificationPreferences),
    tokenRegistered: Boolean(user.expoPushToken),
  });
});

router.put('/token', requireAuth, async (req, res) => {
  if (!isExpoPushToken(req.body?.expoPushToken)) {
    return res.status(400).json({ error: 'Token Expo Push inválido' });
  }

  const registered = await runSerializable(prisma, async (tx) => {
    // Serializa por token incluso si dos cuentas intentan registrarlo a la vez.
    // Neon/PostgreSQL libera el advisory lock automáticamente al cerrar el tx.
    if (typeof tx.$queryRawUnsafe === 'function') {
      await tx.$queryRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        req.body.expoPushToken,
      );
    }
    const current = await tx.user.findUnique({
      where: { id: req.user.userId },
      select: { notificationPreferences: true },
    });
    if (!current) return false;

    const notificationPreferences = withTimeZone(
      current.notificationPreferences,
      req.body.timeZone,
    );
    await tx.user.updateMany({
      where: {
        expoPushToken: req.body.expoPushToken,
        id: { not: req.user.userId },
      },
      data: { expoPushToken: null },
    });
    await tx.user.update({
      where: { id: req.user.userId },
      data: { expoPushToken: req.body.expoPushToken, notificationPreferences },
    });
    return true;
  });
  if (!registered) return res.status(404).json({ error: 'Usuario no encontrado' });
  return res.json({
    registered: true,
    unregister: {
      userId: req.user.userId,
      expoPushToken: req.body.expoPushToken,
      unregisterToken: unregisterProof(req.user.userId, req.body.expoPushToken),
    },
  });
});

router.delete('/token', requireAuth, async (req, res) => {
  if (!isExpoPushToken(req.body?.expoPushToken)) {
    return res.status(400).json({ error: 'Token Expo Push inválido' });
  }
  await prisma.user.updateMany({
    where: { id: req.user.userId, expoPushToken: req.body.expoPushToken },
    data: { expoPushToken: null },
  });
  return res.status(204).send();
});

router.patch('/preferences', requireAuth, async (req, res) => {
  if (!validatePreferencePatch(req.body)) {
    return res.status(400).json({ error: 'Preferencias de notificación inválidas' });
  }

  const notificationPreferences = await mutatePreferences(
    prisma,
    req.user.userId,
    (current) => mergePreferencePatch(current, req.body),
  );
  if (!notificationPreferences) return res.status(404).json({ error: 'Usuario no encontrado' });
  return res.json({ preferences: publicPreferences(notificationPreferences) });
});

module.exports = router;
