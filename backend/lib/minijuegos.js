// Reglas puras de los minijuegos de mascota (Fase 17). La ruta y la
// persistencia pertenecen al adaptador del Agente A; este modulo no depende de
// Prisma y es la fuente unica de tipos, rangos, cooldown y recompensas nominales.

const COOLDOWN_MINIJUEGO_MS = 24 * 60 * 60 * 1000;
const PREFIJO_MINIJUEGO = 'MASCOTA.MINIJUEGO:';

const REGLAS_MINIJUEGO = Object.freeze({
  ATRAPALA: Object.freeze({ puntuacionMinima: 0, puntuacionMaxima: 8 }),
  RITMO_CARINO: Object.freeze({ puntuacionMinima: 0, puntuacionMaxima: 10 }),
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
  PREFIJO_MINIJUEGO,
  REGLAS_MINIJUEGO,
  SEGMENTOS_MARCADOR,
  TIPOS_MINIJUEGO,
  estadoCooldownMinijuego,
  marcadorMinijuego,
  prefijoMarcadorMinijuego,
  recompensaMinijuego,
  validarPuntuacionMinijuego,
  validarTipoMinijuego,
};
