const { diaUTC } = require('./interaccionesSociales');

const EXPERIENCIA_INICIAL = 0;
const PREFIJO_INTERNO_MASCOTA = '__MASCOTA_';
const PREFIJO_RECOMPENSA_EXP = '__MASCOTA_EXP__:';

const ETAPAS = Object.freeze({
  BEBE: 'BEBE',
  JOVEN: 'JOVEN',
  ADULTA: 'ADULTA',
});

const RECOMPENSAS_EXP = Object.freeze({
  ANIMO: Object.freeze({ puntos: 50, limiteDiario: 1 }),
  MINIJUEGO: Object.freeze({ puntos: 20, limiteDiario: 1 }),
  CUIDADO: Object.freeze({ puntos: 5, limiteDiario: 3 }),
  CARICIA: Object.freeze({ puntos: 2, limiteDiario: 5 }),
});

const MINIJUEGOS = Object.freeze(['ATRAPALA', 'RITMO_CARINO']);

function normalizarExperiencia(valor) {
  return Number.isFinite(valor) ? Math.max(0, Math.trunc(valor)) : EXPERIENCIA_INICIAL;
}

function experienciaNecesaria(nivel) {
  if (!Number.isInteger(nivel) || nivel < 1) {
    throw new RangeError('nivel debe ser un entero positivo');
  }
  return Math.floor(50 * Math.pow(nivel, 2));
}

function calcularNivel(experiencia = EXPERIENCIA_INICIAL) {
  const total = normalizarExperiencia(experiencia);
  return Math.floor(Math.sqrt(total / 50)) + 1;
}

function etapaPorNivel(nivel) {
  if (nivel >= 15) return ETAPAS.ADULTA;
  if (nivel >= 5) return ETAPAS.JOVEN;
  return ETAPAS.BEBE;
}

function numeroEtapa(etapa) {
  if (etapa === ETAPAS.ADULTA) return 3;
  if (etapa === ETAPAS.JOVEN) return 2;
  return 1;
}

function etapaVisual(experiencia = EXPERIENCIA_INICIAL) {
  const etapa = etapaPorNivel(calcularNivel(experiencia));
  const nombres = {
    [ETAPAS.BEBE]: 'Bebe',
    [ETAPAS.JOVEN]: 'Joven',
    [ETAPAS.ADULTA]: 'Adulta',
  };
  return { numero: numeroEtapa(etapa), nombre: nombres[etapa] };
}

function calcularProgresion(experiencia = EXPERIENCIA_INICIAL) {
  const total = normalizarExperiencia(experiencia);
  const nivel = calcularNivel(total);
  return {
    experiencia: total,
    nivel,
    subioDeNivel: false,
    evoluciono: false,
    etapa: etapaPorNivel(nivel),
  };
}

function aplicarExperiencia(experienciaActual, puntos) {
  const anterior = calcularProgresion(experienciaActual);
  const experienciaOtorgada = normalizarExperiencia(puntos);
  const siguiente = calcularProgresion(anterior.experiencia + experienciaOtorgada);
  return {
    ...siguiente,
    subioDeNivel: siguiente.nivel > anterior.nivel,
    evoluciono: siguiente.etapa !== anterior.etapa,
    experienciaOtorgada,
  };
}

function respuestaProgresion(progresion) {
  return {
    experiencia: progresion.experiencia,
    nivel: progresion.nivel,
    subioDeNivel: Boolean(progresion.subioDeNivel),
    evoluciono: Boolean(progresion.evoluciono),
    etapa: progresion.etapa,
  };
}

function normalizarMinijuego(valor) {
  if (typeof valor !== 'string') return null;
  const normalizado = valor.trim().toUpperCase().replace(/[\s-]+/g, '_');
  const canonico = normalizado === 'RITMO_DE_CARINO' ? 'RITMO_CARINO' : normalizado;
  return MINIJUEGOS.includes(canonico) ? canonico : null;
}

function obtenerRecompensa(tipo, minijuego) {
  const normalizado = typeof tipo === 'string' ? tipo.trim().toUpperCase() : '';
  const config = RECOMPENSAS_EXP[normalizado];
  if (!config) return null;
  if (normalizado !== 'MINIJUEGO') {
    return { tipo: normalizado, clave: normalizado, ...config };
  }
  const juego = normalizarMinijuego(minijuego);
  return juego ? { tipo: normalizado, minijuego: juego, clave: `${normalizado}_${juego}`, ...config } : null;
}

function prefijoRecompensaDiaria({ amistadId, userId, recompensa, ahora = new Date() }) {
  return `${PREFIJO_RECOMPENSA_EXP}${amistadId}:${userId}:${recompensa.clave}:${diaUTC(ahora)}:`;
}

async function reclamarRecompensaDiaria(db, {
  amistad, userId, tipo, minijuego, ahora = new Date(),
}) {
  const recompensa = obtenerRecompensa(tipo, minijuego);
  if (!recompensa) throw new RangeError('Recompensa de experiencia invalida');

  const toUserId = amistad.userId === userId
    ? amistad.friendId
    : amistad.friendId === userId ? amistad.userId : null;
  if (!toUserId) throw new RangeError('El usuario no pertenece a la amistad');

  const prefijo = prefijoRecompensaDiaria({
    amistadId: amistad.id, userId, recompensa, ahora,
  });
  const totalUsos = await db.cheer.count({
    where: { fromUserId: userId, toUserId, message: { startsWith: prefijo } },
  });
  const usos = Number.isInteger(totalUsos) ? totalUsos : 0;
  if (usos >= recompensa.limiteDiario) {
    return {
      experienciaOtorgada: 0,
      limiteDiarioAlcanzado: true,
      recompensa,
    };
  }

  await db.cheer.create({
    data: {
      fromUserId: userId,
      toUserId,
      message: `${prefijo}${usos + 1}`,
      seen: true,
    },
  });
  return {
    experienciaOtorgada: recompensa.puntos,
    limiteDiarioAlcanzado: false,
    recompensa,
  };
}

function prepararActualizacionExperiencia(mascota, puntos, ahora = new Date()) {
  const progresion = aplicarExperiencia(mascota?.experiencia, puntos);
  const data = {};
  if (progresion.experienciaOtorgada === 0) return { progresion, data };

  data.experiencia = { increment: progresion.experienciaOtorgada };
  data.etapa = numeroEtapa(progresion.etapa);
  if (progresion.evoluciono) {
    const historial = Array.isArray(mascota?.historialHitos) ? mascota.historialHitos : [];
    data.historialHitos = [
      ...historial,
      {
        hito: `Evolucion a ${progresion.etapa} en el nivel ${progresion.nivel}`,
        fecha: ahora.toISOString(),
      },
    ].slice(-20);
  }
  return { progresion, data };
}

module.exports = {
  ETAPAS,
  EXPERIENCIA_INICIAL,
  MINIJUEGOS,
  PREFIJO_INTERNO_MASCOTA,
  PREFIJO_RECOMPENSA_EXP,
  RECOMPENSAS_EXP,
  aplicarExperiencia,
  calcularNivel,
  calcularProgresion,
  etapaPorNivel,
  etapaVisual,
  experienciaNecesaria,
  EXP_Necesaria: experienciaNecesaria,
  normalizarMinijuego,
  numeroEtapa,
  obtenerRecompensa,
  prefijoRecompensaDiaria,
  prepararActualizacionExperiencia,
  reclamarRecompensaDiaria,
  respuestaProgresion,
};
