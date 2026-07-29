// Estamina de la mascota (Fase 17, Bloque 2).
//
// La energía se regenera sola con el paso del tiempo y se gasta al hacer
// actividades. Nunca baja por abandono: una mascota con poca energía es una
// mascota que jugó mucho y está descansando, no un reproche por no haberla
// cuidado. Esa lectura es la que sostiene el tono de la sección 6 de la fase.
//
// El ancla del cálculo es `updatedAt`. Prisma lo toca en cualquier escritura de
// la fila, así que TODA escritura a MascotaAmistad tiene que materializar la
// energía regenerada (ver `datosEnergia`). Con esa disciplina `updatedAt`
// significa "última vez que la energía quedó al día" y ninguna escritura ajena
// —renombrar, equipar un accesorio, sumar cariño— se come el progreso.

const ENERGIA_MAXIMA = 100;
const ENERGIA_MINIMA = 0;
// Coincide con el @default(50) de MascotaAmistad.energia: el modelo de estamina
// no necesita migración, solo cambia cómo se interpreta la columna.
const ENERGIA_INICIAL = 50;

const INTERVALO_REGEN_SEGUNDOS = 300;
const PUNTOS_POR_INTERVALO = 2;
const INTERVALO_REGEN_MS = INTERVALO_REGEN_SEGUNDOS * 1000;

// Por debajo de este saldo la mascota se dibuja en pose de siesta. Está por
// encima del costo de un minijuego a propósito: se avisa antes de quedarse sin
// nada, no después.
const UMBRAL_CRITICO = 25;

const ESTADOS_ENERGIA = Object.freeze({
  LLENO: 'LLENO',
  DISPONIBLE: 'DISPONIBLE',
  CRITICO: 'CRITICO',
  AGOTADO: 'AGOTADO',
});

// Alimentar y acariciar son gratis: el gate de estamina existe para las
// actividades, no para los gestos de cuidado.
const COSTOS_ENERGIA = Object.freeze({
  ALIMENTAR: 0,
  CARICIA: 0,
  CUIDADO: 0,
  JUGAR: 15,
  MINIJUEGO: 20,
});

const ERROR_ENERGIA_INSUFICIENTE = 'ENERGIA_INSUFICIENTE';

function normalizarEnergia(valor) {
  if (!Number.isFinite(valor)) return ENERGIA_INICIAL;
  return Math.min(ENERGIA_MAXIMA, Math.max(ENERGIA_MINIMA, Math.trunc(valor)));
}

function normalizarCosto(valor) {
  return Number.isFinite(valor) ? Math.max(0, Math.trunc(valor)) : 0;
}

function costoDeAccion(accion) {
  const clave = typeof accion === 'string' ? accion.trim().toUpperCase() : '';
  return normalizarCosto(COSTOS_ENERGIA[clave]);
}

// Primera marca temporal utilizable de la fila. `createdAt` cubre a las filas
// recién creadas dentro de la misma transacción, donde todavía no hay
// `updatedAt`; sin ninguna de las dos no hay nada que regenerar.
function anclaRegeneracionMs(mascota = {}) {
  for (const valor of [mascota.updatedAt, mascota.createdAt]) {
    if (!valor) continue;
    const ms = new Date(valor).getTime();
    if (Number.isFinite(ms)) return ms;
  }
  return null;
}

function msTranscurridos(mascota = {}, ahora = new Date()) {
  const ancla = anclaRegeneracionMs(mascota);
  const ahoraMs = new Date(ahora).getTime();
  if (ancla === null || !Number.isFinite(ahoraMs) || ahoraMs <= ancla) return 0;
  return ahoraMs - ancla;
}

// Solo suman los intervalos completos. El resto no se pierde: sigue contando
// desde el ancla hasta que la próxima escritura materialice el saldo.
function regenerarEnergia(energia, ms) {
  const base = normalizarEnergia(energia);
  if (!Number.isFinite(ms) || ms <= 0) return base;
  const intervalos = Math.floor(ms / INTERVALO_REGEN_MS);
  return normalizarEnergia(base + intervalos * PUNTOS_POR_INTERVALO);
}

function calcularEnergiaActual(mascota = {}, ahora = new Date()) {
  return regenerarEnergia(mascota.energia, msTranscurridos(mascota, ahora));
}

function msSiguienteRecarga(mascota = {}, ahora = new Date()) {
  if (calcularEnergiaActual(mascota, ahora) >= ENERGIA_MAXIMA) return 0;
  return INTERVALO_REGEN_MS - (msTranscurridos(mascota, ahora) % INTERVALO_REGEN_MS);
}

function msRecargaTotal(mascota = {}, ahora = new Date()) {
  const faltan = ENERGIA_MAXIMA - calcularEnergiaActual(mascota, ahora);
  if (faltan <= 0) return 0;
  const intervalos = Math.ceil(faltan / PUNTOS_POR_INTERVALO);
  return msSiguienteRecarga(mascota, ahora) + (intervalos - 1) * INTERVALO_REGEN_MS;
}

const enSegundos = (ms) => Math.max(0, Math.ceil(ms / 1000));

function estadoEnergia(energia) {
  const actual = normalizarEnergia(energia);
  if (actual >= ENERGIA_MAXIMA) return ESTADOS_ENERGIA.LLENO;
  if (actual <= ENERGIA_MINIMA) return ESTADOS_ENERGIA.AGOTADO;
  return actual < UMBRAL_CRITICO ? ESTADOS_ENERGIA.CRITICO : ESTADOS_ENERGIA.DISPONIBLE;
}

// Lectura de tono para el rig: con poca energía la mascota se ve dormida, nunca
// enferma ni triste (regla no negociable de la fase).
const estaCansada = (energia) => {
  const estado = estadoEnergia(energia);
  return estado === ESTADOS_ENERGIA.CRITICO || estado === ESTADOS_ENERGIA.AGOTADO;
};

const poseEnergia = (energia) => (estaCansada(energia) ? 'siesta' : 'normal');

const puedeConsumir = (energiaActual, costo) =>
  normalizarEnergia(energiaActual) >= normalizarCosto(costo);

// Saldo tras el gasto, o null si no alcanza — así el llamador corta antes de
// escribir nada en vez de guardar un saldo negativo saneado a cero.
function consumirEnergia(energiaActual, costo) {
  const actual = normalizarEnergia(energiaActual);
  const requerida = normalizarCosto(costo);
  if (actual < requerida) return null;
  return normalizarEnergia(actual - requerida);
}

// `data` para cualquier escritura de MascotaAmistad que no gasta estamina: deja
// la energía regenerada en la fila justo cuando `updatedAt` se mueve.
const datosEnergia = (mascota, ahora = new Date()) => ({
  energia: calcularEnergiaActual(mascota, ahora),
});

// Resuelve un gasto sobre la fila leída dentro de la transacción. `ok:false`
// trae lo que necesita el 422 y no trae `data`: no hay nada que escribir.
function resolverConsumo(mascota, accion, ahora = new Date()) {
  const energiaActual = calcularEnergiaActual(mascota, ahora);
  const energiaRequerida = costoDeAccion(accion);
  if (energiaActual < energiaRequerida) {
    return { ok: false, energiaActual, energiaRequerida };
  }
  const energia = normalizarEnergia(energiaActual - energiaRequerida);
  return {
    ok: true, energiaActual, energiaRequerida, energia, data: { energia },
  };
}

const errorEnergiaInsuficiente = (consumo) => ({
  error: ERROR_ENERGIA_INSUFICIENTE,
  energiaActual: consumo.energiaActual,
  energiaRequerida: consumo.energiaRequerida,
});

function presentarEnergia(mascota, ahora = new Date()) {
  const energia = calcularEnergiaActual(mascota, ahora);
  return {
    // `energia` se conserva como alias del valor plano: es el nombre de la
    // columna y el que ya leen la tarjeta del índice y el detalle.
    energia,
    energiaActual: energia,
    energiaMaxima: ENERGIA_MAXIMA,
    segundosSiguienteRecarga: enSegundos(msSiguienteRecarga(mascota, ahora)),
    segundosRecargaTotal: enSegundos(msRecargaTotal(mascota, ahora)),
    estadoEnergia: estadoEnergia(energia),
    costosEnergia: COSTOS_ENERGIA,
    cansada: estaCansada(energia),
    poseEnergia: poseEnergia(energia),
  };
}

module.exports = {
  COSTOS_ENERGIA,
  ENERGIA_INICIAL,
  ENERGIA_MAXIMA,
  ENERGIA_MINIMA,
  ERROR_ENERGIA_INSUFICIENTE,
  ESTADOS_ENERGIA,
  INTERVALO_REGEN_MS,
  INTERVALO_REGEN_SEGUNDOS,
  PUNTOS_POR_INTERVALO,
  UMBRAL_CRITICO,
  anclaRegeneracionMs,
  calcularEnergiaActual,
  consumirEnergia,
  costoDeAccion,
  datosEnergia,
  errorEnergiaInsuficiente,
  estaCansada,
  estadoEnergia,
  msRecargaTotal,
  msSiguienteRecarga,
  msTranscurridos,
  normalizarEnergia,
  poseEnergia,
  presentarEnergia,
  puedeConsumir,
  regenerarEnergia,
  resolverConsumo,
};
