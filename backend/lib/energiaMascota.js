const ENERGIA_INICIAL = 50;
const ENERGIA_MAXIMA = 100;
const ENERGIA_POR_JUEGO = 20;
const DESGASTE_ENERGIA_POR_DIA = 10;
const INTERVALO_DESGASTE_MS = 24 * 60 * 60 * 1000;
const UMBRAL_ENERGIA_CON_SUENO = 20;

function normalizarEnergia(valor) {
  if (!Number.isFinite(valor)) return ENERGIA_INICIAL;
  return Math.min(ENERGIA_MAXIMA, Math.max(0, Math.trunc(valor)));
}

function normalizarPuntos(puntos) {
  return Number.isFinite(puntos) ? Math.max(0, Math.trunc(puntos)) : 0;
}

function desgastarEnergia(energia, puntos = DESGASTE_ENERGIA_POR_DIA) {
  return Math.max(0, normalizarEnergia(energia) - normalizarPuntos(puntos));
}

function recuperarEnergia(energia, puntos = ENERGIA_POR_JUEGO) {
  return Math.min(ENERGIA_MAXIMA, normalizarEnergia(energia) + normalizarPuntos(puntos));
}

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

// El desgaste se deriva del ultimo cuidado y solo se materializa al alimentar
// o jugar. Asi las lecturas no escriben y los reintentos devuelven el mismo valor.
function calcularEnergiaActual(mascota = {}, ahora = new Date()) {
  const energia = normalizarEnergia(mascota.energia);
  const ultimaMarca = ultimoCuidadoMs(mascota);
  const ahoraMs = new Date(ahora).getTime();
  if (ultimaMarca === null || !Number.isFinite(ahoraMs) || ahoraMs <= ultimaMarca) {
    return energia;
  }

  const diasCompletos = Math.floor((ahoraMs - ultimaMarca) / INTERVALO_DESGASTE_MS);
  return desgastarEnergia(energia, diasCompletos * DESGASTE_ENERGIA_POR_DIA);
}

function estadoEnergia(energia) {
  const cansada = normalizarEnergia(energia) <= UMBRAL_ENERGIA_CON_SUENO;
  return {
    estado: cansada ? 'con_sueno' : 'activa',
    cansada,
    pose: cansada ? 'siesta' : 'normal',
  };
}

function presentarEnergia(mascota, ahora = new Date()) {
  const energia = calcularEnergiaActual(mascota, ahora);
  return {
    energia,
    energiaMaxima: ENERGIA_MAXIMA,
    estadoEnergia: estadoEnergia(energia),
  };
}

module.exports = {
  DESGASTE_ENERGIA_POR_DIA,
  ENERGIA_INICIAL,
  ENERGIA_MAXIMA,
  ENERGIA_POR_JUEGO,
  INTERVALO_DESGASTE_MS,
  UMBRAL_ENERGIA_CON_SUENO,
  calcularEnergiaActual,
  desgastarEnergia,
  estadoEnergia,
  normalizarEnergia,
  presentarEnergia,
  recuperarEnergia,
  ultimoCuidadoMs,
};
