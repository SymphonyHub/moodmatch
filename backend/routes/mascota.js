const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const {
  CARINO_POR_ACTIVIDAD,
  CARINO_POR_CUIDADO,
  COOLDOWN_CUIDADO_MS,
  NOMBRE_MASCOTA,
  agregarHito,
  asegurarMascota,
  bonusReto,
  calcularPersonalidad,
  claveUsuarioReto,
  crearReto,
  etapaVisual,
  guardarPropuesta,
  leerPropuesta,
  mascotaAceptada,
  mensajeActividad,
  necesitaAtencion,
  presentarMascota,
  retoExpirado,
  sumarCarino,
} = require('../lib/mascota');
const { derivarEspecie } = require('../lib/especies');
const { CATEGORIAS, derivarDesbloqueados, puedeEquipar } = require('../lib/accesorios');
const {
  dispatchNotification,
  notifyPetInvitation,
  notifySharedActivity,
} = require('../lib/notificationEvents');

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

// Carga la mascota sin crearla y exige que la invitación esté aceptada. Si no,
// responde 404 y devuelve null para que el handler corte. La mascota es opt-in
// (Fase 14): las acciones de cuidado solo aplican a una mascota activa.
async function exigirAceptada(res, amistadId) {
  const mascota = await prisma.mascotaAmistad.findUnique({ where: { amistadId } });
  if (!mascotaAceptada(mascota)) {
    res.status(404).json({ error: 'No hay una mascota activa para esta amistad' });
    return null;
  }
  return mascota;
}

// Tarjeta ligera para la pantalla lista. No expone ánimos individuales, solo la
// etapa y si necesita atención (mismo umbral de 48h que la push de Fase 12).
const presentarResumen = (mascota, amigo, ahora) => ({
  amistadId: mascota.amistadId,
  amigo,
  nombre: mascota.nombre,
  nivelCarino: mascota.nivelCarino,
  // Especie negociada (MascotaAmistad.especie); derivarEspecie solo como
  // fallback para mascotas previas a Fase 14 (especie null tras el backfill).
  especie: mascota.especie ?? derivarEspecie(mascota.amistadId),
  etapa: etapaVisual(mascota.nivelCarino),
  accesorioCabeza: mascota.accesorioCabeza ?? null,
  accesorioColor: mascota.accesorioColor ?? null,
  necesitaAtencion: necesitaAtencion(mascota, ahora),
});

// GET /api/mascota — índice de la sección: mascotas activas del usuario,
// invitaciones (recibidas y enviadas) y amigos elegibles para invitar.
router.get('/', requireAuth, async (req, res) => {
  const me = req.user.userId;
  const ahora = new Date();

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userId: me }, { friendId: me }] },
    include: {
      user: { select: { id: true, nombre: true, avatarUrl: true } },
      friend: { select: { id: true, nombre: true, avatarUrl: true } },
      mascota: true,
    },
  });

  // Vínculo simétrico: pueden existir filas espejo A→B y B→A. Se deduplica por
  // el otro usuario y se prefiere la fila que ya tenga mascota.
  const porAmigo = new Map();
  for (const f of friendships) {
    const other = f.userId === me ? f.friend : f.user;
    const previo = porAmigo.get(other.id);
    if (!previo || (!previo.f.mascota && f.mascota)) porAmigo.set(other.id, { f, other });
  }

  const mascotas = [];
  const recibidas = [];
  const enviadas = [];
  const amigosElegibles = [];

  for (const { f, other } of porAmigo.values()) {
    const amigo = {
      id: other.id, amistadId: f.id, nombre: other.nombre, avatarUrl: other.avatarUrl,
    };
    const m = f.mascota;
    if (!m || m.invitacionEstado === 'rechazada') {
      // Sin mascota, o rechazada: el vínculo puede (re)invitar cuando quiera.
      amigosElegibles.push(amigo);
    } else if (m.invitacionEstado === 'pendiente') {
      const invitacion = { ...amigo, mascotaNombre: m.nombre };
      if (m.invitadaPor === me) enviadas.push(invitacion);
      else recibidas.push(invitacion);
    } else if (mascotaAceptada(m)) {
      mascotas.push(presentarResumen(m, amigo, ahora));
    }
    // aceptada pero archivada (activa:false) → no se muestra en la lista.
  }

  return res.json({ mascotas, invitaciones: { recibidas, enviadas }, amigosElegibles });
});

// POST /api/mascota/invitacion — crea la mascota en estado "pendiente" y avisa
// al otro integrante. Reutiliza la fila si una invitación previa fue rechazada.
router.post('/invitacion', requireAuth, async (req, res) => {
  const amistadId = parseAmistadId(req.body.amistadId);
  if (!amistadId) return res.status(400).json({ error: 'amistadId inválido' });

  const amistad = await buscarAmistadPropia(amistadId, req.user.userId);
  if (!amistad) return res.status(404).json({ error: 'Amistad no encontrada' });

  const existente = await prisma.mascotaAmistad.findUnique({ where: { amistadId } });
  if (existente && existente.invitacionEstado !== 'rechazada') {
    return res.status(409).json({ error: 'Ya existe una mascota o una invitación para esta amistad' });
  }

  const datos = {
    invitacionEstado: 'pendiente',
    invitadaPor: req.user.userId,
    activa: true,
  };
  const mascota = existente
    ? await prisma.mascotaAmistad.update({ where: { amistadId }, data: datos })
    : await prisma.mascotaAmistad.create({
      data: { amistadId, nombre: NOMBRE_MASCOTA, ...datos },
    });

  const otroId = amistad.userId === req.user.userId ? amistad.friendId : amistad.userId;
  dispatchNotification(notifyPetInvitation({ toUserId: otroId, friendshipId: amistadId }));

  return res.status(201).json({ mascota: await mascotaVisible(prisma, mascota, amistad, req.user.userId) });
});

// POST /api/mascota/:amistadId/invitacion/aceptar — solo el invitado responde.
router.post('/:amistadId/invitacion/aceptar', requireAuth, async (req, res) => {
  const amistadId = parseAmistadId(req.params.amistadId);
  if (!amistadId) return res.status(400).json({ error: 'amistadId inválido' });

  const amistad = await buscarAmistadPropia(amistadId, req.user.userId);
  if (!amistad) return res.status(404).json({ error: 'Amistad no encontrada' });

  const existente = await prisma.mascotaAmistad.findUnique({ where: { amistadId } });
  if (!existente || existente.invitacionEstado !== 'pendiente') {
    return res.status(409).json({ error: 'No hay una invitación pendiente para esta amistad' });
  }
  if (existente.invitadaPor === req.user.userId) {
    return res.status(403).json({ error: 'No puedes responder tu propia invitación' });
  }

  const mascota = await prisma.mascotaAmistad.update({
    where: { amistadId },
    data: { invitacionEstado: 'aceptada', activa: true },
  });
  return res.json({ mascota: await mascotaVisible(prisma, mascota, amistad, req.user.userId) });
});

// POST /api/mascota/:amistadId/invitacion/rechazar — el invitado declina; la
// fila queda "rechazada" (el otro puede reintentar más adelante), sin insistir.
router.post('/:amistadId/invitacion/rechazar', requireAuth, async (req, res) => {
  const amistadId = parseAmistadId(req.params.amistadId);
  if (!amistadId) return res.status(400).json({ error: 'amistadId inválido' });

  const amistad = await buscarAmistadPropia(amistadId, req.user.userId);
  if (!amistad) return res.status(404).json({ error: 'Amistad no encontrada' });

  const existente = await prisma.mascotaAmistad.findUnique({ where: { amistadId } });
  if (!existente || existente.invitacionEstado !== 'pendiente') {
    return res.status(409).json({ error: 'No hay una invitación pendiente para esta amistad' });
  }
  if (existente.invitadaPor === req.user.userId) {
    return res.status(403).json({ error: 'No puedes responder tu propia invitación' });
  }

  await prisma.mascotaAmistad.update({
    where: { amistadId },
    data: { invitacionEstado: 'rechazada', activa: false },
  });
  return res.json({ estado: 'rechazada' });
});

// GET /api/mascota/:amistadId — detalle de una mascota activa. Ya no crea la
// mascota de forma diferida: sin invitación aceptada responde 404.
router.get('/:amistadId', requireAuth, async (req, res) => {
  const amistadId = parseAmistadId(req.params.amistadId);
  if (!amistadId) return res.status(400).json({ error: 'amistadId inválido' });

  const amistad = await buscarAmistadPropia(amistadId, req.user.userId);
  if (!amistad) return res.status(404).json({ error: 'Amistad no encontrada' });

  const mascota = await exigirAceptada(res, amistadId);
  if (!mascota) return undefined;

  return res.json({ mascota: await mascotaVisible(prisma, mascota, amistad, req.user.userId) });
});

// POST /api/mascota/:amistadId/cuidado — cada integrante tiene su propio
// cooldown; completar ambos cuidados antes de vencer evoluciona la mascota.
router.post('/:amistadId/cuidado', requireAuth, async (req, res) => {
  const amistadId = parseAmistadId(req.params.amistadId);
  if (!amistadId) return res.status(400).json({ error: 'amistadId inválido' });

  const amistad = await buscarAmistadPropia(amistadId, req.user.userId);
  if (!amistad) return res.status(404).json({ error: 'Amistad no encontrada' });
  if (!(await exigirAceptada(res, amistadId))) return undefined;

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
  if (!(await exigirAceptada(res, amistadId))) return undefined;

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
  if (!(await exigirAceptada(res, amistadId))) return undefined;

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
// vínculo. completionId la vuelve idempotente aunque ambos la marquen. Si la
// amistad no tiene mascota activa, la actividad se registra pero no suma cariño
// (la mascota es opt-in: no se crea sola por completar una actividad).
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
    const actual = await tx.mascotaAmistad.findUnique({ where: { amistadId: amistad.id } });
    const activa = mascotaAceptada(actual);

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
      return { mascota: actual, activa, registrada: false };
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
      mascota: activa ? await sumarCarino(tx, amistad.id, CARINO_POR_ACTIVIDAD) : actual,
      activa,
      registrada: true,
    };
  }, { isolationLevel: 'Serializable' });

  if (resultado.registrada && resultado.activa) {
    dispatchNotification(notifySharedActivity({
      fromUserId: req.user.userId,
      toUserId: otroId,
    }));
  }

  return res.status(resultado.registrada ? 201 : 200).json({
    registrada: resultado.registrada,
    mascota: resultado.activa && resultado.mascota
      ? await mascotaVisible(prisma, resultado.mascota, amistad, req.user.userId)
      : null,
  });
});

// PATCH /api/mascota/:amistadId/accesorios — equipa/desequipa accesorios
// cosméticos. Solo se aceptan ids desbloqueados de la categoría correcta; `null`
// desequipa. Los accesorios son visibles para ambos integrantes del vínculo.
router.patch('/:amistadId/accesorios', requireAuth, async (req, res) => {
  const amistadId = parseAmistadId(req.params.amistadId);
  if (!amistadId) return res.status(400).json({ error: 'amistadId inválido' });

  const amistad = await buscarAmistadPropia(amistadId, req.user.userId);
  if (!amistad) return res.status(404).json({ error: 'Amistad no encontrada' });
  const mascota = await exigirAceptada(res, amistadId);
  if (!mascota) return undefined;

  const normalizar = (valor) => {
    if (valor === null) return null;
    return typeof valor === 'string' && valor.trim() ? valor.trim() : undefined;
  };

  const desbloqueados = derivarDesbloqueados(mascota.nivelCarino, mascota.historialHitos);
  const data = {};
  const campos = { cabeza: 'accesorioCabeza', color: 'accesorioColor' };
  for (const [categoria, campo] of Object.entries(campos)) {
    if (!(categoria in req.body)) continue;
    const id = normalizar(req.body[categoria]);
    if (id === undefined || !puedeEquipar(id, categoria, desbloqueados)) {
      return res.status(400).json({ error: `Accesorio de ${categoria} no disponible` });
    }
    data[campo] = id;
  }
  if (!CATEGORIAS.some((c) => c in req.body) || Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'Nada que actualizar' });
  }

  const actualizada = await prisma.mascotaAmistad.update({ where: { amistadId }, data });
  return res.json({ mascota: await mascotaVisible(prisma, actualizada, amistad, req.user.userId) });
});

module.exports = router;
