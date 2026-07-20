const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const {
  CARINO_POR_ACTIVIDAD,
  asegurarMascota,
  mensajeActividad,
  sumarCarino,
} = require('../lib/mascota');

const buscarAmistadPropia = (amistadId, userId, db = prisma) =>
  db.friendship.findFirst({
    where: {
      id: amistadId,
      OR: [{ userId }, { friendId: userId }],
    },
  });

const parseAmistadId = (raw) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// GET /api/mascota/:amistadId — también cubre amistades anteriores a Fase 11.
router.get('/:amistadId', requireAuth, async (req, res) => {
  const amistadId = parseAmistadId(req.params.amistadId);
  if (!amistadId) return res.status(400).json({ error: 'amistadId inválido' });

  const amistad = await buscarAmistadPropia(amistadId, req.user.userId);
  if (!amistad) return res.status(404).json({ error: 'Amistad no encontrada' });

  const mascota = await asegurarMascota(prisma, amistad.id);
  return res.json({ mascota });
});

// Una marca representa que la actividad se hizo con el otro integrante del
// vínculo. completionId la vuelve idempotente aunque ambos la marquen.
router.post('/:amistadId/actividad', requireAuth, async (req, res) => {
  const amistadId = parseAmistadId(req.params.amistadId);
  if (!amistadId) return res.status(400).json({ error: 'amistadId inválido' });

  const completionId = typeof req.body.completionId === 'string'
    ? req.body.completionId.trim()
    : '';
  if (!completionId || completionId.length > 200) {
    return res.status(400).json({ error: 'completionId debe tener entre 1 y 200 caracteres' });
  }

  const amistad = await buscarAmistadPropia(amistadId, req.user.userId);
  if (!amistad) return res.status(404).json({ error: 'Amistad no encontrada' });

  const otroId = amistad.userId === req.user.userId ? amistad.friendId : amistad.userId;
  const marker = mensajeActividad(completionId);
  const resultado = await prisma.$transaction(async (tx) => {
    const existente = await tx.cheer.findFirst({
      where: {
        message: marker,
        OR: [
          { fromUserId: req.user.userId, toUserId: otroId },
          { fromUserId: otroId, toUserId: req.user.userId },
        ],
      },
    });
    if (existente) {
      return { mascota: await asegurarMascota(tx, amistad.id), registrada: false };
    }

    await tx.cheer.create({
      data: {
        fromUserId: req.user.userId,
        toUserId: otroId,
        message: marker,
        seen: true,
      },
    });
    return {
      mascota: await sumarCarino(tx, amistad.id, CARINO_POR_ACTIVIDAD),
      registrada: true,
    };
  }, { isolationLevel: 'Serializable' });

  return res.status(resultado.registrada ? 201 : 200).json(resultado);
});

module.exports = router;
