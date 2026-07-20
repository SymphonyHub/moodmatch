const NOMBRE_MASCOTA = 'Lumi';
const CARINO_POR_PAR_DE_MENSAJES = 2;
const CARINO_POR_ACTIVIDAD = 3;
const PREFIJO_ACTIVIDAD = '__MASCOTA_ACTIVIDAD__:';

const filtroMensajesVisibles = {
  NOT: { message: { startsWith: PREFIJO_ACTIVIDAD } },
};

const datosMascota = (amistadId, nivelCarino = 0) => ({
  amistadId,
  nombre: NOMBRE_MASCOTA,
  nivelCarino,
});

const asegurarMascota = (db, amistadId) =>
  db.mascotaAmistad.upsert({
    where: { amistadId },
    create: datosMascota(amistadId),
    update: { nivelCarino: { increment: 0 } },
  });

const sumarCarino = (db, amistadId, puntos) =>
  db.mascotaAmistad.upsert({
    where: { amistadId },
    create: datosMascota(amistadId, puntos),
    update: { nivelCarino: { increment: puntos } },
  });

// Un envío suma solamente cuando completa un nuevo par A→B + B→A. Así una
// persona no puede subir el cariño enviando muchos mensajes sin respuesta.
async function registrarMensajeReciproco(db, amistad, fromUserId) {
  const toUserId = amistad.userId === fromUserId ? amistad.friendId : amistad.userId;
  const [enviados, recibidos] = await Promise.all([
    db.cheer.count({
      where: { fromUserId, toUserId, ...filtroMensajesVisibles },
    }),
    db.cheer.count({
      where: { fromUserId: toUserId, toUserId: fromUserId, ...filtroMensajesVisibles },
    }),
  ]);

  if (enviados <= recibidos) {
    return sumarCarino(db, amistad.id, CARINO_POR_PAR_DE_MENSAJES);
  }
  return asegurarMascota(db, amistad.id);
}

const mensajeActividad = (completionId) => `${PREFIJO_ACTIVIDAD}${completionId}`;

module.exports = {
  CARINO_POR_ACTIVIDAD,
  NOMBRE_MASCOTA,
  asegurarMascota,
  filtroMensajesVisibles,
  mensajeActividad,
  registrarMensajeReciproco,
  sumarCarino,
};
