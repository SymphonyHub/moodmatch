// Reglas puras de los minijuegos de mascota (Fase 17). La ruta y la
// persistencia pertenecen al adaptador del Agente A; este modulo no depende de
// Prisma y es la fuente unica de tipos, rangos, cooldown, sesiones firmadas,
// errores de dominio y recompensas nominales.

const { createHmac, randomBytes, timingSafeEqual } = require('crypto');

const COOLDOWN_MINIJUEGO_MS = 24 * 60 * 60 * 1000;
const PREFIJO_MINIJUEGO = 'MASCOTA.MINIJUEGO:';

// Ventana en la que un ticket de partida sigue sirviendo. Acota el margen de
// una sesion olvidada abierta sin obligar a terminar con prisa.
const SESION_MINIJUEGO_TTL_MS = 30 * 60 * 1000;
const VERSION_SESION = 'v1';
// Separacion de dominio: la clave del ticket se deriva del secreto de sesion,
// pero no es el secreto de sesion. Filtrar una no permite firmar la otra.
const ETIQUETA_CLAVE_SESION = 'moodmatch.minijuegos.sesion.v1';

// `duracionMinimaMs` es el piso temporal que el propio juego impone por sus
// timers, no un tiempo de reaccion humano: ATRAPALA encadena 8 rondas de 450 ms
// de pausa y RITMO_CARINO 5 rondas de 720 ms de feedback, o sea 3600 ms reales
// en ambos casos. 3000 ms deja margen para jitter sin dejar pasar un POST
// instantaneo que nunca abrio el juego.
const REGLAS_MINIJUEGO = Object.freeze({
  ATRAPALA: Object.freeze({ puntuacionMinima: 0, puntuacionMaxima: 8, duracionMinimaMs: 3000 }),
  RITMO_CARINO: Object.freeze({ puntuacionMinima: 0, puntuacionMaxima: 10, duracionMinimaMs: 3000 }),
});

const TIPOS_MINIJUEGO = Object.freeze(Object.keys(REGLAS_MINIJUEGO));
const SEGMENTOS_MARCADOR = Object.freeze({
  ATRAPALA: 'ATRAPALA',
  RITMO_CARINO: 'RITMO-CARINO',
});

const validarTipoMinijuego = (tipo) => TIPOS_MINIJUEGO.includes(tipo);

function validarPuntuacionMinijuego(tipo, puntuacion) {
  const regla = REGLAS_MINIJUEGO[tipo];
  return Boolean(regla)
    && Number.isInteger(puntuacion)
    && puntuacion >= regla.puntuacionMinima
    && puntuacion <= regla.puntuacionMaxima;
}

function prefijoMarcadorMinijuego(tipo) {
  if (!validarTipoMinijuego(tipo)) throw new TypeError('Tipo de minijuego invalido');
  return `${PREFIJO_MINIJUEGO}${SEGMENTOS_MARCADOR[tipo]}:`;
}

function marcadorMinijuego(tipo, epoch = Date.now()) {
  const prefijo = prefijoMarcadorMinijuego(tipo);
  if (!Number.isSafeInteger(epoch) || epoch < 0) throw new TypeError('Epoch de minijuego invalido');
  return `${prefijo}${epoch}`;
}

// A partir del epoch de la ultima finalizacion del usuario para un tipo, deriva
// un cooldown rodante de 24 horas. `ahora` lo inyecta la ruta desde el servidor.
function estadoCooldownMinijuego(ultimaFinalizacionMs, ahora = new Date()) {
  const ahoraMs = ahora instanceof Date ? ahora.getTime() : Number.NaN;
  if (!Number.isFinite(ahoraMs)) throw new TypeError('Fecha de servidor invalida');

  if (ultimaFinalizacionMs === null) {
    return { puedeJugar: true, disponibleEn: null };
  }
  if (!Number.isSafeInteger(ultimaFinalizacionMs) || ultimaFinalizacionMs < 0) {
    throw new TypeError('Fecha de ultima finalizacion invalida');
  }

  const disponibleMs = ultimaFinalizacionMs + COOLDOWN_MINIJUEGO_MS;
  if (ahoraMs >= disponibleMs) return { puedeJugar: true, disponibleEn: null };
  return { puedeJugar: false, disponibleEn: new Date(disponibleMs).toISOString() };
}

// --- Sesion de partida firmada -------------------------------------------
// El cliente no aporta tiempo: pide un ticket al empezar y lo devuelve al
// terminar. El instante de inicio viaja firmado dentro del propio ticket, asi
// que el backend sigue siendo la unica autoridad temporal sin necesitar tabla
// ni migracion. Un ticket reenviado no multiplica recompensas porque el
// cooldown de 24 h ya limita a una por ventana.

const normalizarId = (valor) => {
  if (typeof valor === 'number') return Number.isSafeInteger(valor) && valor > 0 ? valor : null;
  if (typeof valor === 'string' && /^[1-9][0-9]{0,14}$/.test(valor)) return Number(valor);
  return null;
};

function claveSesion(secreto) {
  if (typeof secreto !== 'string' || secreto.length === 0) {
    throw new TypeError('Secreto de sesion de minijuego invalido');
  }
  return createHmac('sha256', secreto).update(ETIQUETA_CLAVE_SESION).digest();
}

const firmarSesion = (cuerpo, secreto) => createHmac('sha256', claveSesion(secreto))
  .update(cuerpo)
  .digest('base64url');

// Contexto que la ruta ya valido antes de llegar aqui: un fallo es un error de
// programacion del servidor, no una entrada rechazable del cliente.
function contextoSesion({ usuarioId, amistadId, tipo, ahora, secreto }) {
  if (!validarTipoMinijuego(tipo)) throw new TypeError('Tipo de minijuego invalido');
  const usuario = normalizarId(usuarioId);
  const amistad = normalizarId(amistadId);
  if (usuario === null) throw new TypeError('Usuario de sesion de minijuego invalido');
  if (amistad === null) throw new TypeError('Amistad de sesion de minijuego invalida');
  const ahoraMs = ahora instanceof Date ? ahora.getTime() : Number.NaN;
  if (!Number.isFinite(ahoraMs)) throw new TypeError('Fecha de servidor invalida');
  claveSesion(secreto);
  return { usuario, amistad, ahoraMs };
}

function crearSesionMinijuego({
  usuarioId,
  amistadId,
  tipo,
  ahora = new Date(),
  secreto,
  nonce = randomBytes(8).toString('hex'),
}) {
  const { usuario, amistad, ahoraMs } = contextoSesion({
    usuarioId, amistadId, tipo, ahora, secreto,
  });
  if (typeof nonce !== 'string' || !/^[0-9a-f]{1,32}$/.test(nonce)) {
    throw new TypeError('Nonce de sesion de minijuego invalido');
  }

  const datos = {
    v: VERSION_SESION, u: usuario, a: amistad, t: tipo, i: ahoraMs, n: nonce,
  };
  const cuerpo = Buffer.from(JSON.stringify(datos), 'utf8').toString('base64url');
  const firmado = `${VERSION_SESION}.${cuerpo}`;

  return {
    sesion: `${firmado}.${firmarSesion(firmado, secreto)}`,
    iniciadoEn: new Date(ahoraMs).toISOString(),
    expiraEn: new Date(ahoraMs + SESION_MINIJUEGO_TTL_MS).toISOString(),
    duracionMinimaMs: REGLAS_MINIJUEGO[tipo].duracionMinimaMs,
  };
}

const sesionInvalida = (motivo) => ({ valida: false, motivo });

function verificarSesionMinijuego(sesion, {
  usuarioId, amistadId, tipo, ahora = new Date(), secreto,
}) {
  const { usuario, amistad, ahoraMs } = contextoSesion({
    usuarioId, amistadId, tipo, ahora, secreto,
  });

  if (typeof sesion !== 'string' || sesion.length === 0) return sesionInvalida('SESION_AUSENTE');
  const partes = sesion.split('.');
  if (partes.length !== 3 || partes[0] !== VERSION_SESION || !partes[1] || !partes[2]) {
    return sesionInvalida('SESION_FORMATO');
  }

  // La firma se comprueba antes de interpretar el cuerpo: nada de lo que
  // decodificamos despues proviene de un ticket que no emitio este backend.
  const esperada = Buffer.from(firmarSesion(`${partes[0]}.${partes[1]}`, secreto), 'base64url');
  const recibida = Buffer.from(partes[2], 'base64url');
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) {
    return sesionInvalida('SESION_FIRMA');
  }

  let datos = null;
  try {
    datos = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
  } catch {
    return sesionInvalida('SESION_FORMATO');
  }
  if (!datos || typeof datos !== 'object' || !Number.isSafeInteger(datos.i) || datos.i < 0) {
    return sesionInvalida('SESION_FORMATO');
  }
  if (datos.u !== usuario || datos.a !== amistad || datos.t !== tipo) {
    return sesionInvalida('SESION_VINCULO');
  }

  const duracionMs = ahoraMs - datos.i;
  if (duracionMs > SESION_MINIJUEGO_TTL_MS) return sesionInvalida('SESION_EXPIRADA');
  // Una duracion negativa solo aparece si el reloj retrocedio o si el ticket se
  // fabrico; en ambos casos no es una partida jugada.
  if (duracionMs < REGLAS_MINIJUEGO[tipo].duracionMinimaMs) {
    return sesionInvalida('SESION_DEMASIADO_RAPIDA');
  }

  return {
    valida: true,
    iniciadoEn: new Date(datos.i).toISOString(),
    duracionMs,
    nonce: typeof datos.n === 'string' ? datos.n : null,
  };
}

// --- Payload y errores de dominio ----------------------------------------
// Un unico esquema de entrada y un unico mapa de salida para los dos tipos, de
// modo que cualquier minijuego futuro herede las mismas reglas y la misma copia.

function validarPayloadCompletar(body, tipo) {
  if (!validarTipoMinijuego(tipo)) throw new TypeError('Tipo de minijuego invalido');
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, motivo: 'PAYLOAD_INVALIDO' };
  }
  if (!validarPuntuacionMinijuego(tipo, body.puntuacion)) {
    return { ok: false, motivo: 'PUNTUACION_INVALIDA' };
  }
  if (typeof body.sesion !== 'string' || body.sesion.length === 0) {
    return { ok: false, motivo: 'SESION_AUSENTE' };
  }
  return { ok: true, valor: { puntuacion: body.puntuacion, sesion: body.sesion } };
}

// Los motivos internos son precisos para el log; la respuesta agrupa los fallos
// de ticket bajo un mismo codigo publico para no ir narrando a un cliente
// modificado que comprobacion fallo. La copia informa y no reprocha.
const ERRORES_MINIJUEGO = Object.freeze({
  TIPO_DESCONOCIDO: Object.freeze({
    status: 400,
    codigo: 'TIPO_DESCONOCIDO',
    mensaje: 'Este juego no está disponible por ahora.',
  }),
  AMISTAD_INVALIDA: Object.freeze({
    status: 400,
    codigo: 'AMISTAD_INVALIDA',
    mensaje: 'No pudimos identificar esta mascota.',
  }),
  PAYLOAD_INVALIDO: Object.freeze({
    status: 400,
    codigo: 'PAYLOAD_INVALIDO',
    mensaje: 'No pudimos leer el resultado de la partida.',
  }),
  SESION_INVALIDA: Object.freeze({
    status: 400,
    codigo: 'SESION_INVALIDA',
    mensaje: 'No pudimos registrar esta partida. Puedes abrir el juego otra vez cuando quieras.',
  }),
  SESION_EXPIRADA: Object.freeze({
    status: 400,
    codigo: 'SESION_EXPIRADA',
    mensaje: 'La partida quedó abierta un buen rato. Puedes empezar otra cuando quieras.',
  }),
  MASCOTA_NO_ENCONTRADA: Object.freeze({
    status: 404,
    codigo: 'MASCOTA_NO_ENCONTRADA',
    mensaje: 'Mascota no encontrada',
  }),
  EN_DESCANSO: Object.freeze({
    status: 429,
    codigo: 'EN_DESCANSO',
    mensaje: 'Este minijuego está tomando una pausa. Podrás volver a jugar más adelante.',
  }),
});

const ERROR_POR_MOTIVO = Object.freeze({
  TIPO_DESCONOCIDO: ERRORES_MINIJUEGO.TIPO_DESCONOCIDO,
  AMISTAD_INVALIDA: ERRORES_MINIJUEGO.AMISTAD_INVALIDA,
  PAYLOAD_INVALIDO: ERRORES_MINIJUEGO.PAYLOAD_INVALIDO,
  PUNTUACION_INVALIDA: ERRORES_MINIJUEGO.PAYLOAD_INVALIDO,
  SESION_AUSENTE: ERRORES_MINIJUEGO.SESION_INVALIDA,
  SESION_FORMATO: ERRORES_MINIJUEGO.SESION_INVALIDA,
  SESION_FIRMA: ERRORES_MINIJUEGO.SESION_INVALIDA,
  SESION_VINCULO: ERRORES_MINIJUEGO.SESION_INVALIDA,
  SESION_DEMASIADO_RAPIDA: ERRORES_MINIJUEGO.SESION_INVALIDA,
  SESION_EXPIRADA: ERRORES_MINIJUEGO.SESION_EXPIRADA,
  MASCOTA_NO_ENCONTRADA: ERRORES_MINIJUEGO.MASCOTA_NO_ENCONTRADA,
  EN_DESCANSO: ERRORES_MINIJUEGO.EN_DESCANSO,
});

function errorMinijuego(motivo) {
  const error = ERROR_POR_MOTIVO[motivo];
  if (!error) throw new TypeError('Motivo de error de minijuego invalido');
  return error;
}

function recompensaMinijuego(tipo, puntuacion) {
  if (!validarTipoMinijuego(tipo)) throw new TypeError('Tipo de minijuego invalido');
  if (!validarPuntuacionMinijuego(tipo, puntuacion)) {
    throw new RangeError('Puntuacion de minijuego invalida');
  }

  if (tipo === 'ATRAPALA') {
    return {
      energia: 2 * puntuacion,
      carino: 0,
      monedas: Math.min(3, 1 + Math.floor(puntuacion / 3)),
    };
  }

  return {
    energia: 0,
    carino: puntuacion,
    monedas: Math.min(3, 1 + Math.floor(puntuacion / 4)),
  };
}

module.exports = {
  COOLDOWN_MINIJUEGO_MS,
  ERRORES_MINIJUEGO,
  PREFIJO_MINIJUEGO,
  REGLAS_MINIJUEGO,
  SEGMENTOS_MARCADOR,
  SESION_MINIJUEGO_TTL_MS,
  TIPOS_MINIJUEGO,
  crearSesionMinijuego,
  errorMinijuego,
  estadoCooldownMinijuego,
  marcadorMinijuego,
  prefijoMarcadorMinijuego,
  recompensaMinijuego,
  validarPayloadCompletar,
  validarPuntuacionMinijuego,
  validarTipoMinijuego,
  verificarSesionMinijuego,
};
