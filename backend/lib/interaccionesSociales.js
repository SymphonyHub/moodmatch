// Lógica pura de las interacciones sociales de la mascota (Fase 14): regalos
// entre amigos y racha compartida "blanda". Sin dependencia de Prisma para
// poder testear los cálculos sin base de datos
// (backend/__tests__/interaccionesSociales.test.js). Las consultas viven en la
// ruta; aquí solo entra el dato ya leído.

// Regalo: un empujón de cariño que una persona le manda a la mascota del
// vínculo. Máximo uno por semana por amistad (da igual quién lo mande).
const CARINO_POR_REGALO = 5;
const COOLDOWN_REGALO_MS = 7 * 24 * 60 * 60 * 1000;
const PREFIJO_REGALO = '__MASCOTA_REGALO__:';

const marcadorRegalo = (ts = Date.now()) => `${PREFIJO_REGALO}${ts}`;

// A partir del último regalo del vínculo (ms epoch o null si nunca), dice si se
// puede regalar ahora y, si no, desde cuándo se podrá.
function estadoRegalo(ultimoRegaloMs, ahora = new Date()) {
  const ahoraMs = ahora.getTime();
  if (ultimoRegaloMs == null || !Number.isFinite(ultimoRegaloMs)) {
    return { puedeRegalar: true, disponibleEn: null };
  }
  const disponibleMs = ultimoRegaloMs + COOLDOWN_REGALO_MS;
  if (ahoraMs >= disponibleMs) return { puedeRegalar: true, disponibleEn: null };
  return { puedeRegalar: false, disponibleEn: new Date(disponibleMs).toISOString() };
}

// Día calendario en UTC (YYYY-MM-DD) de un instante. Se usa UTC por simplicidad
// y consistencia entre servidor y clientes; el desfase de zona no altera la
// intención "constancia día a día" a la escala de esta feature.
const diaUTC = (valor) => {
  const ms = valor ? new Date(valor).getTime() : Number.NaN;
  return Number.isNaN(ms) ? null : new Date(ms).toISOString().slice(0, 10);
};

const epochDia = (diaStr) => Math.floor(new Date(`${diaStr}T00:00:00.000Z`).getTime() / 86400000);

// Racha compartida "blanda": se calcula al vuelo desde los últimos cuidados de
// cada integrante (no se persiste un contador). Cuenta días consecutivos en que
// ALGUNO de los dos cuidó, terminando en hoy o ayer. Con solo el último cuidado
// de cada quien el conteo llega como mucho a 2 — es deliberado: se prioriza no
// guardar estado nuevo y celebrar la constancia reciente, no exhibir un número
// grande. Nunca es competitiva ni culpabiliza.
function rachaBlanda(mascota = {}, ahora = new Date()) {
  const dias = [mascota.ultimoCuidadoUsuario1, mascota.ultimoCuidadoUsuario2]
    .map(diaUTC)
    .filter((d) => d !== null);
  const unicos = [...new Set(dias)].map(epochDia).sort((a, b) => b - a);

  const hoy = epochDia(diaUTC(ahora));
  const cuidadaHoy = unicos.includes(hoy);
  const masReciente = unicos[0];
  const viva = masReciente === hoy || masReciente === hoy - 1;

  if (!viva || masReciente === undefined) {
    return { dias: 0, viva: false, cuidadaHoy: false };
  }

  // Corre hacia atrás mientras los días sean consecutivos desde el más reciente.
  let cuenta = 1;
  for (let i = 1; i < unicos.length; i += 1) {
    if (unicos[i] === masReciente - i) cuenta += 1;
    else break;
  }
  return { dias: cuenta, viva: true, cuidadaHoy };
}

module.exports = {
  CARINO_POR_REGALO,
  COOLDOWN_REGALO_MS,
  PREFIJO_REGALO,
  diaUTC,
  estadoRegalo,
  marcadorRegalo,
  rachaBlanda,
};
