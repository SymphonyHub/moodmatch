const { derivarEspecie } = require('./especies');
const { derivarDesbloqueados } = require('./accesorios');

const NOMBRE_MASCOTA = 'Lumi';
const CARINO_POR_PAR_DE_MENSAJES = 2;
const CARINO_POR_ACTIVIDAD = 3;
const CARINO_POR_CUIDADO = 6;
const COOLDOWN_CUIDADO_MS = 24 * 60 * 60 * 1000;
const DURACION_RETO_MS = 48 * 60 * 60 * 1000;
const PET_ATTENTION_AFTER_MS = 48 * 60 * 60 * 1000;
const PREFIJO_ACTIVIDAD = '__MASCOTA_ACTIVIDAD__:';
const UMBRALES_ETAPA = [4, 10, 20, 40];

// Estados del ciclo de vida de la invitación (Fase 14): la mascota ya no se
// crea al agregar un amigo, solo cuando alguien invita explícitamente.
const ESTADOS_INVITACION = ['pendiente', 'aceptada', 'rechazada'];

// Etapas de evolución estilo Pokémon (Parte B). Aquí solo se deriva el nombre
// visible desde el nivel de cariño; el sprite y la animación de transición son
// del Agente C. Umbrales 16/36 según FASE14 sección 4.
const UMBRALES_EVOLUCION = [
  { etapa: 1, desde: 0, nombre: 'Cachorro' },
  { etapa: 2, desde: 16, nombre: 'Joven' },
  { etapa: 3, desde: 36, nombre: 'Adulta' },
];

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

const historialSeguro = (historial) => (Array.isArray(historial) ? historial : []);

const agregarHito = (historial, hito, fecha = new Date()) => [
  ...historialSeguro(historial),
  { hito, fecha: fecha.toISOString() },
].slice(-20);

const crearReto = (ahora = new Date()) => ({
  tipo: 'CUIDADO_COMPARTIDO',
  iniciadoEn: ahora.toISOString(),
  expiraEn: new Date(ahora.getTime() + DURACION_RETO_MS).toISOString(),
  progresoUsuario1: false,
  progresoUsuario2: false,
  completado: false,
});

const retoExpirado = (reto, ahora = new Date()) => !reto
  || !reto.expiraEn
  || new Date(reto.expiraEn).getTime() <= ahora.getTime();

const siguienteUmbral = (nivelCarino) =>
  UMBRALES_ETAPA.find((umbral) => umbral > nivelCarino) ?? nivelCarino + CARINO_POR_CUIDADO;

const bonusReto = (nivelCarino) => Math.max(0, siguienteUmbral(nivelCarino) - nivelCarino);

const claveUsuarioReto = (amistad, userId) =>
  amistad.userId === userId ? 'progresoUsuario1' : 'progresoUsuario2';

function etapaVisual(nivelCarino = 0) {
  const nivel = Math.max(0, Number.isFinite(nivelCarino) ? nivelCarino : 0);
  const actual = [...UMBRALES_EVOLUCION].reverse().find(({ desde }) => nivel >= desde)
    ?? UMBRALES_EVOLUCION[0];
  return { numero: actual.etapa, nombre: actual.nombre };
}

// Última señal de cuidado: el momento más reciente entre la creación de la
// mascota y ambos cuidados. Espeja latestPetCare de dueNotifications para que
// el badge de "necesita atención" coincida con cuándo se dispara la push.
function ultimoCuidadoMs(mascota) {
  const marcas = [mascota.createdAt, mascota.ultimoCuidadoUsuario1, mascota.ultimoCuidadoUsuario2]
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

function presentarMascota(mascota, amistad, userId, personalidad) {
  const reto = mascota.retoCooperativo;
  const propuesta = leerPropuesta(mascota.nombrePropuesto);
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

  return {
    id: mascota.id,
    amistadId: mascota.amistadId,
    nombre: mascota.nombre,
    nivelCarino: mascota.nivelCarino,
    personalidad,
    // Fuente de verdad: la especie negociada por ambos (Agente A), persistida en
    // MascotaAmistad.especie. derivarEspecie es solo fallback para las mascotas
    // previas a Fase 14 (especie null tras el backfill de Fase 0).
    especie: mascota.especie ?? derivarEspecie(mascota.amistadId),
    etapa: etapaVisual(mascota.nivelCarino),
    accesorios: {
      desbloqueados: derivarDesbloqueados(mascota.nivelCarino, mascota.historialHitos),
      cabeza: mascota.accesorioCabeza ?? null,
      color: mascota.accesorioColor ?? null,
    },
    invitacionEstado: mascota.invitacionEstado ?? 'aceptada',
    invitacionMia: mascota.invitadaPor != null && mascota.invitadaPor === userId,
    activa: mascota.activa !== false,
    necesitaAtencion: necesitaAtencion(mascota),
    puedeCuidar: !ultimoCuidado || new Date(proximoCuidadoEn).getTime() <= Date.now(),
    proximoCuidadoEn,
    reto: reto ? {
      tipo: reto.tipo,
      expiraEn: reto.expiraEn,
      progresoPropio: Boolean(reto[clavePropia]),
      progresoCompanero: Boolean(reto[claveCompanero]),
      completado: Boolean(reto.completado),
      expirado: retoExpirado(reto),
    } : null,
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
  COOLDOWN_CUIDADO_MS,
  DURACION_RETO_MS,
  ESTADOS_INVITACION,
  NOMBRE_MASCOTA,
  PET_ATTENTION_AFTER_MS,
  agregarHito,
  asegurarMascota,
  bonusReto,
  calcularPersonalidad,
  claveUsuarioReto,
  crearReto,
  etapaVisual,
  filtroMensajesVisibles,
  guardarPropuesta,
  historialSeguro,
  leerPropuesta,
  mascotaAceptada,
  mensajeActividad,
  necesitaAtencion,
  presentarMascota,
  registrarMensajeReciproco,
  retoExpirado,
  sumarCarino,
};
