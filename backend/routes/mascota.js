const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const {
  CARINO_POR_ACTIVIDAD,
  CARINO_POR_CUIDADO,
  COOLDOWN_CUIDADO_MS,
  agregarHito,
  asegurarMascota,
  bonusReto,
  calcularPersonalidad,
  claveUsuarioReto,
  crearReto,
  guardarPropuesta,
  leerPropuesta,
  mensajeActividad,
  presentarMascota,
  retoExpirado,
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

async function mascotaVisible(db, mascota, amistad, userId) {
  const entries = await db.moodEntry.findMany({
    where: {
      userId: { in: [amistad.userId, amistad.friendId] },
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    select: { moodType: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return presentarMascota(mascota, amistad, userId, calcularPersonalidad(entries));
}

// GET /api/mascota/:amistadId — también cubre amistades anteriores a Fase 11.
router.get('/:amistadId', requireAuth, async (req, res) => {
  const amistadId = parseAmistadId(req.params.amistadId);
  if (!amistadId) return res.status(400).json({ error: 'amistadId inválido' });

  const amistad = await buscarAmistadPropia(amistadId, req.user.userId);
  if (!amistad) return res.status(404).json({ error: 'Amistad no encontrada' });

  const mascota = await asegurarMascota(prisma, amistad.id);
  return res.json({ mascota: await mascotaVisible(prisma, mascota, amistad, req.user.userId) });
});

// POST /api/mascota/:amistadId/cuidado — cada integrante tiene su propio
// cooldown; completar ambos cuidados antes de vencer evoluciona la mascota.
router.post('/:amistadId/cuidado', requireAuth, async (req, res) => {
  const amistadId = parseAmistadId(req.params.amistadId);
  if (!amistadId) return res.status(400).json({ error: 'amistadId inválido' });

  const amistad = await buscarAmistadPropia(amistadId, req.user.userId);
  if (!amistad) return res.status(404).json({ error: 'Amistad no encontrada' });

  const ahora = new Date();
  const resultado = await prisma.$transaction(async (tx) => {
    const actual = await asegurarMascota(tx, amistad.id);
    const campoCuidado = amistad.userId === req.user.userId
      ? 'ultimoCuidadoUsuario1'
      : 'ultimoCuidadoUsuario2';
    const ultimoCuidado = actual[campoCuidado];
    if (ultimoCuidado && ahora.getTime() - new Date(ultimoCuidado).getTime() < COOLDOWN_CUIDADO_MS) {
      return { cooldown: true, mascota: actual };
    }

    let reto = actual.retoCooperativo;
    if (!reto || retoExpirado(reto, ahora) || reto.completado) reto = crearReto(ahora);
    const clavePropia = claveUsuarioReto(amistad, req.user.userId);
    reto[clavePropia] = true;
    const completado = reto.progresoUsuario1 && reto.progresoUsuario2;
    reto.completado = completado;

    const premioReto = completado ? bonusReto(actual.nivelCarino + CARINO_POR_CUIDADO) : 0;
    const nuevoNivel = actual.nivelCarino + CARINO_POR_CUIDADO + premioReto;
    let historial = actual.historialHitos;
    if (completado) {
      historial = agregarHito(historial, `Completaron un reto y llegaron a ${nuevoNivel} cariño`, ahora);
    }

    const mascota = await tx.mascotaAmistad.update({
      where: { amistadId: amistad.id },
      data: {
        [campoCuidado]: ahora,
        nivelCarino: { increment: CARINO_POR_CUIDADO + premioReto },
        retoCooperativo: reto,
        historialHitos: historial,
      },
    });
    return { cooldown: false, mascota };
  }, { isolationLevel: 'Serializable' });

  if (resultado.cooldown) {
    return res.status(429).json({
      error: 'Tu próximo cuidado estará disponible en menos de 24 horas',
      mascota: await mascotaVisible(prisma, resultado.mascota, amistad, req.user.userId),
    });
  }
  return res.status(201).json({ mascota: await mascotaVisible(prisma, resultado.mascota, amistad, req.user.userId) });
});

router.post('/:amistadId/reto', requireAuth, async (req, res) => {
  const amistadId = parseAmistadId(req.params.amistadId);
  if (!amistadId) return res.status(400).json({ error: 'amistadId inválido' });
  const amistad = await buscarAmistadPropia(amistadId, req.user.userId);
  if (!amistad) return res.status(404).json({ error: 'Amistad no encontrada' });

  const resultado = await prisma.$transaction(async (tx) => {
    const actual = await asegurarMascota(tx, amistad.id);
    if (actual.retoCooperativo && !actual.retoCooperativo.completado && !retoExpirado(actual.retoCooperativo)) {
      return { activo: true, mascota: actual };
    }
    const mascota = await tx.mascotaAmistad.update({
      where: { amistadId: amistad.id },
      data: { retoCooperativo: crearReto() },
    });
    return { activo: false, mascota };
  });
  if (resultado.activo) return res.status(409).json({ error: 'Ya hay un reto cooperativo en curso' });
  return res.status(201).json({ mascota: await mascotaVisible(prisma, resultado.mascota, amistad, req.user.userId) });
});

router.patch('/:amistadId/nombre', requireAuth, async (req, res) => {
  const amistadId = parseAmistadId(req.params.amistadId);
  if (!amistadId) return res.status(400).json({ error: 'amistadId inválido' });
  const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
  if (!nombre || nombre.length > 30) {
    return res.status(400).json({ error: 'El nombre debe tener entre 1 y 30 caracteres' });
  }
  const amistad = await buscarAmistadPropia(amistadId, req.user.userId);
  if (!amistad) return res.status(404).json({ error: 'Amistad no encontrada' });

  const resultado = await prisma.$transaction(async (tx) => {
    const actual = await asegurarMascota(tx, amistad.id);
    const propuesta = leerPropuesta(actual.nombrePropuesto);
    const confirma = propuesta
      && propuesta.nombre.toLocaleLowerCase() === nombre.toLocaleLowerCase()
      && propuesta.propuestoPor !== null
      && propuesta.propuestoPor !== req.user.userId;
    if (propuesta?.propuestoPor === req.user.userId && propuesta.nombre === nombre) {
      return { pendientePropia: true, mascota: actual };
    }
    const mascota = await tx.mascotaAmistad.update({
      where: { amistadId: amistad.id },
      data: confirma ? {
        nombre,
        nombrePropuesto: null,
        historialHitos: agregarHito(actual.historialHitos, `Ahora se llama ${nombre}`),
      } : {
        nombrePropuesto: guardarPropuesta(nombre, req.user.userId),
      },
    });
    return { pendientePropia: false, mascota, confirmado: Boolean(confirma) };
  }, { isolationLevel: 'Serializable' });

  if (resultado.pendientePropia) {
    return res.status(409).json({ error: 'Tu propuesta está esperando la confirmación de tu amistad' });
  }
  return res.json({
    mascota: await mascotaVisible(prisma, resultado.mascota, amistad, req.user.userId),
    confirmado: resultado.confirmado,
  });
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
