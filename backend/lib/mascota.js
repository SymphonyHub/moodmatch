const {
  DURACION_RETO_MS,
  aplicarProgresoReto,
  crearReto,
  infoReto,
  senalDeReto,
} = require('./retosCooperativos');
const {
  CARINO_POR_REGALO,
  COOLDOWN_REGALO_MS,
  PREFIJO_REGALO,
  estadoRegalo,
  marcadorRegalo,
  rachaBlanda,
} = require('./interaccionesSociales');
const { derivarEspecie } = require('./especies');
const { derivarDesbloqueados } = require('./accesorios');
const {
  ENERGIA_INICIAL,
  datosEnergia,
  presentarEnergia,
} = require('./energiaMascota');
const {
  EXPERIENCIA_INICIAL,
  PREFIJO_INTERNO_MASCOTA,
  calcularProgresion,
  etapaVisual,
  respuestaProgresion,
} = require('./mascotaProgresion');

const NOMBRE_MASCOTA = 'Lumi';
const CARINO_POR_PAR_DE_MENSAJES = 2;
const CARINO_POR_ACTIVIDAD = 3;
const CARINO_POR_CUIDADO = 6;
const COOLDOWN_CUIDADO_MS = 24 * 60 * 60 * 1000;
const PET_ATTENTION_AFTER_MS = 48 * 60 * 60 * 1000;
const PREFIJO_ACTIVIDAD = '__MASCOTA_ACTIVIDAD__:';
const UMBRALES_ETAPA = [4, 10, 20, 40];

// Estados del ciclo de vida de la invitación (Fase 14): la mascota ya no se
// crea al agregar un amigo, solo cuando alguien invita explícitamente.
const ESTADOS_INVITACION = ['pendiente', 'aceptada', 'rechazada'];

const filtroMensajesVisibles = {
  NOT: { message: { startsWith: PREFIJO_INTERNO_MASCOTA } },
};

const datosMascota = (amistadId, nivelCarino = 0) => ({
  amistadId,
  nombre: NOMBRE_MASCOTA,
  nivelCarino,
  energia: ENERGIA_INICIAL,
  experiencia: EXPERIENCIA_INICIAL,
});

// Devuelve la fila tal como está, creándola si falta. A diferencia del upsert
// con `increment: 0` que hacía antes, no escribe cuando la mascota existe: esa
// escritura vacía movía `updatedAt` —el ancla de la estamina— antes de que nadie
// pudiera leerla, y se comía la recarga acumulada.
// Devuelve la fila cruda a propósito: `energia` y `updatedAt` tienen que viajar
// juntos para que quien derive la recarga (`datosEnergia`, `resolverConsumo`) la
// cuente una sola vez.
async function asegurarMascota(db, amistadId) {
  const actual = await db.mascotaAmistad.findUnique({ where: { amistadId } });
  return actual ?? db.mascotaAmistad.create({ data: datosMascota(amistadId) });
}

// `extra` viaja al lado del incremento de cariño para que quien ya leyó la fila
// materialice también su energía en la misma escritura.
const sumarCarino = (db, amistadId, puntos, extra = {}) =>
  db.mascotaAmistad.upsert({
    where: { amistadId },
    create: datosMascota(amistadId, puntos),
    update: { nivelCarino: { increment: puntos }, ...extra },
  });

// Un envío suma solamente cuando completa un nuevo par A→B + B→A. Así una
// persona no puede subir el cariño enviando muchos mensajes sin respuesta.
// `ahora` fija el instante contra el que se calcula la recarga materializada.
async function registrarMensajeReciproco(db, amistad, fromUserId, ahora = new Date()) {
  const toUserId = amistad.userId === fromUserId ? amistad.friendId : amistad.userId;
  const [enviados, recibidos] = await Promise.all([
    db.cheer.count({
      where: { fromUserId, toUserId, ...filtroMensajesVisibles },
    }),
    db.cheer.count({
      where: { fromUserId: toUserId, toUserId: fromUserId, ...filtroMensajesVisibles },
    }),
  ]);

  const actual = await asegurarMascota(db, amistad.id);
  if (enviados <= recibidos) {
    return sumarCarino(db, amistad.id, CARINO_POR_PAR_DE_MENSAJES, datosEnergia(actual, ahora));
  }
  return actual;
}

const mensajeActividad = (completionId) => `${PREFIJO_ACTIVIDAD}${completionId}`;

const historialSeguro = (historial) => (Array.isArray(historial) ? historial : []);

const agregarHito = (historial, hito, fecha = new Date()) => [
  ...historialSeguro(historial),
  { hito, fecha: fecha.toISOString() },
].slice(-20);

const retoExpirado = (reto, ahora = new Date()) => !reto
  || !reto.expiraEn
  || new Date(reto.expiraEn).getTime() <= ahora.getTime();

const siguienteUmbral = (nivelCarino) =>
  UMBRALES_ETAPA.find((umbral) => umbral > nivelCarino) ?? nivelCarino + CARINO_POR_CUIDADO;

const bonusReto = (nivelCarino) => Math.max(0, siguienteUmbral(nivelCarino) - nivelCarino);

const claveUsuarioReto = (amistad, userId) =>
  amistad.userId === userId ? 'progresoUsuario1' : 'progresoUsuario2';

// Marca más reciente de cuidado del vínculo, mirando los dos lados. Vivía en
// energiaMascota mientras la energía se desgastaba por abandono; con el modelo
// de estamina la energía ya no depende del cuidado, solo "necesita atención".
function ultimoCuidadoMs(mascota = {}) {
  const marcas = [
    mascota.createdAt,
    mascota.ultimoCuidadoUsuario1,
    mascota.ultimoCuidadoUsuario2,
  ]
    .map((valor) => (valor ? new Date(valor).getTime() : null))
    .filter((ms) => ms !== null && Number.isFinite(ms));
  return marcas.length ? Math.max(...marcas) : null;
}

function necesitaAtencion(mascota, ahora = new Date()) {
  const ultimo = ultimoCuidadoMs(mascota);
  if (ultimo === null) return true;
  return ahora.getTime() - ultimo >= PET_ATTENTION_AFTER_MS;
}

const mascotaAceptada = (mascota) =>
  Boolean(mascota) && mascota.invitacionEstado === 'aceptada' && mascota.activa !== false;

// La mascota nunca se borra, se archiva (activa:false) conservando el historial
// de hitos. Todas las mecánicas quedan inertes vía mascotaAceptada(). Es el
// punto único de archivado: lo usa la pausa que cualquiera de los dos puede
// pedir (Fase 16) y le corresponderá también al borrado de amistad cuando
// exista esa ruta. `extra` permite acompañar el archivado con otros campos
// (por ejemplo el hito de la pausa) en la misma escritura.
// El filtro activa:true lo vuelve seguro ante carreras: si los dos pausan a la
// vez, solo una llamada reporta count 1.
const archivarMascota = (db, amistadId, extra = {}) =>
  db.mascotaAmistad.updateMany({
    where: { amistadId, activa: true },
    data: { activa: false, ...extra },
  });

function calcularPersonalidad(entries) {
  const moods = Array.isArray(entries) ? entries.map((entry) => entry.moodType) : [];
  if (moods.length === 0) return 'curiosa';
  const contar = (tipos) => moods.filter((mood) => tipos.includes(mood)).length;
  const animados = contar(['FELIZ']);
  const tranquilos = contar(['CALMADO', 'NEUTRO']);
  const sensibles = contar(['TRISTE', 'ANSIOSO', 'ENOJADO']);

  if (animados > sensibles && animados >= tranquilos) return 'más animada';
  if (tranquilos >= animados && tranquilos >= sensibles) return 'más tranquila';
  if (sensibles > animados) return 'más sensible';
  return 'curiosa';
}

function leerPropuesta(valor) {
  if (!valor) return null;
  try {
    const propuesta = JSON.parse(valor);
    return propuesta?.nombre && Number.isInteger(propuesta.propuestoPor) ? propuesta : null;
  } catch {
    // Compatibilidad con propuestas creadas antes de guardar el autor.
    return { nombre: valor, propuestoPor: null };
  }
}

const guardarPropuesta = (nombre, propuestoPor) => JSON.stringify({ nombre, propuestoPor });

function presentarMascota(mascota, amistad, userId, personalidad, extra = {}) {
  const reto = mascota.retoCooperativo;
  const propuesta = leerPropuesta(mascota.nombrePropuesto);
  const progresion = extra.progresion
    ? respuestaProgresion(extra.progresion)
    : calcularProgresion(mascota.experiencia);
  const clavePropia = claveUsuarioReto(amistad, userId);
  const claveCompanero = clavePropia === 'progresoUsuario1'
    ? 'progresoUsuario2'
    : 'progresoUsuario1';
  const ultimoCuidado = amistad.userId === userId
    ? mascota.ultimoCuidadoUsuario1
    : mascota.ultimoCuidadoUsuario2;
  const proximoCuidadoEn = ultimoCuidado
    ? new Date(new Date(ultimoCuidado).getTime() + COOLDOWN_CUIDADO_MS).toISOString()
    : null;
  const puedeCuidar = !ultimoCuidado || new Date(proximoCuidadoEn).getTime() <= Date.now();

  return {
    id: mascota.id,
    amistadId: mascota.amistadId,
    nombre: mascota.nombre,
    nivelCarino: mascota.nivelCarino,
    experiencia: progresion.experiencia,
    nivel: progresion.nivel,
    progresion,
    ...presentarEnergia(mascota),
    personalidad,
    // Fuente de verdad: la especie negociada por ambos (Agente A), persistida en
    // MascotaAmistad.especie. derivarEspecie es solo fallback para las mascotas
    // previas a Fase 14 (especie null tras el backfill de Fase 0).
    especie: mascota.especie ?? derivarEspecie(mascota.amistadId),
    etapa: etapaVisual(mascota.experiencia),
    especiePropuestaPor: mascota.especiePropuestaPor ?? null,
    propuestaMia: mascota.especiePropuestaPor != null && mascota.especiePropuestaPor === userId,
    accesorios: {
      desbloqueados: derivarDesbloqueados(mascota.nivelCarino, mascota.historialHitos),
      cabeza: mascota.accesorioCabeza ?? null,
      color: mascota.accesorioColor ?? null,
    },
    invitacionEstado: mascota.invitacionEstado ?? 'aceptada',
    invitacionMia: mascota.invitadaPor != null && mascota.invitadaPor === userId,
    activa: mascota.activa !== false,
    necesitaAtencion: necesitaAtencion(mascota),
    puedeCuidar,
    puedeAlimentar: puedeCuidar,
    puedeJugar: puedeCuidar,
    proximoCuidadoEn,
    reto: reto ? {
      tipo: reto.tipo,
      ...infoReto(reto.tipo),
      expiraEn: reto.expiraEn,
      progresoPropio: Boolean(reto[clavePropia]),
      progresoCompanero: Boolean(reto[claveCompanero]),
      completado: Boolean(reto.completado),
      expirado: retoExpirado(reto),
    } : null,
    racha: rachaBlanda(mascota),
    // El estado del regalo depende de una consulta (último regalo del vínculo);
    // la ruta lo pasa en `extra`. Si no viene, se omite en vez de inventarlo.
    ...(extra.regalo ? { regalo: extra.regalo } : {}),
    nombrePropuesto: propuesta ? {
      nombre: propuesta.nombre,
      puedeConfirmar: propuesta.propuestoPor !== null && propuesta.propuestoPor !== userId,
    } : null,
    historialHitos: historialSeguro(mascota.historialHitos),
  };
}

module.exports = {
  CARINO_POR_ACTIVIDAD,
  CARINO_POR_CUIDADO,
  CARINO_POR_REGALO,
  COOLDOWN_CUIDADO_MS,
  COOLDOWN_REGALO_MS,
  DURACION_RETO_MS,
  ESTADOS_INVITACION,
  NOMBRE_MASCOTA,
  PET_ATTENTION_AFTER_MS,
  PREFIJO_ACTIVIDAD,
  PREFIJO_REGALO,
  agregarHito,
  aplicarProgresoReto,
  archivarMascota,
  asegurarMascota,
  bonusReto,
  calcularPersonalidad,
  claveUsuarioReto,
  crearReto,
  estadoRegalo,
  etapaVisual,
  filtroMensajesVisibles,
  guardarPropuesta,
  historialSeguro,
  leerPropuesta,
  marcadorRegalo,
  mascotaAceptada,
  mensajeActividad,
  necesitaAtencion,
  presentarMascota,
  rachaBlanda,
  registrarMensajeReciproco,
  retoExpirado,
  senalDeReto,
  sumarCarino,
};
