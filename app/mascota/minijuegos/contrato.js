// Contrato de transporte de los minijuegos: qué se envía, qué se acepta como
// respuesta y qué se le dice a la persona cuando algo no sale. `logica.js`
// resuelve la mecánica de cada juego; este módulo es lo único del cliente que
// conoce el shape de la API, y es el mismo para cualquier minijuego del
// catálogo. El documento normativo es CONTRATO-MINIJUEGOS-FASE17.md.

import { TIPOS_MINIJUEGO } from './logica';

// Único lugar donde se declara qué recompensas existen y cómo se nombran. Si
// mañana entra un tipo nuevo, se agrega aquí y lo heredan la validación de la
// respuesta y la pantalla de resultado.
export const RECOMPENSAS = Object.freeze([
  Object.freeze({ clave: 'energia', icono: 'flash', etiqueta: 'energía' }),
  Object.freeze({ clave: 'carino', icono: 'heart', etiqueta: 'cariño' }),
  Object.freeze({ clave: 'monedas', icono: 'leaf', etiqueta: 'semillitas' }),
]);

export const TIPOS_RECOMPENSA = Object.freeze(RECOMPENSAS.map(({ clave }) => clave));

export const ENERGIA_MAXIMA = 100;

const enteroNoNegativo = (valor) => Number.isInteger(valor) && valor >= 0;
const fechaValida = (valor) => typeof valor === 'string'
  && Number.isFinite(new Date(valor).getTime());

export function esEstadoCooldown(valor) {
  if (!valor || typeof valor.puedeJugar !== 'boolean') return false;
  return valor.puedeJugar ? valor.disponibleEn === null : fechaValida(valor.disponibleEn);
}

// El bloque `minijuegos` del detalle debe traer los dos tipos o ninguno: un
// estado a medias haría que la sección ofreciera un juego que el backend aún
// no sabe resolver.
export function normalizarEstadosMinijuego(valor) {
  if (!valor || typeof valor !== 'object') return null;
  if (!TIPOS_MINIJUEGO.every((tipo) => esEstadoCooldown(valor[tipo]))) return null;
  return Object.freeze(Object.fromEntries(
    TIPOS_MINIJUEGO.map((tipo) => [tipo, { ...valor[tipo] }]),
  ));
}

export function recompensasVisibles(recompensa) {
  if (!recompensa || typeof recompensa !== 'object') return [];
  return RECOMPENSAS
    .filter(({ clave }) => Number.isFinite(recompensa[clave]) && recompensa[clave] > 0)
    .map(({ clave, icono, etiqueta }) => ({
      clave,
      icono,
      texto: `+${recompensa[clave]} ${etiqueta}`,
    }));
}

const errorContrato = () => new Error('Respuesta inválida del minijuego');

// Ticket de partida. El cliente lo trata como opaco: no lo abre, no lo
// interpreta y no deriva tiempo de él. Solo lo devuelve al completar.
export function validarRespuestaIniciar(data) {
  const valido = data
    && typeof data.sesion === 'string'
    && data.sesion.length > 0
    && fechaValida(data.expiraEn)
    && enteroNoNegativo(data.duracionMinimaMs);
  if (!valido) throw errorContrato();
  return {
    sesion: data.sesion,
    expiraEn: data.expiraEn,
    duracionMinimaMs: data.duracionMinimaMs,
  };
}

export function validarRespuestaCompletar(data, { tipo, puntuacion }) {
  const estados = normalizarEstadosMinijuego(data?.mascota?.minijuegos);
  const valido = data
    && data.mascota
    && enteroNoNegativo(data.mascota.energia)
    && data.mascota.energia <= ENERGIA_MAXIMA
    && enteroNoNegativo(data.mascota.monedas)
    && estados !== null
    // Completar consume el cooldown de ese tipo: si el backend lo devuelve
    // disponible, el estado que veríamos en pantalla contradice lo persistido.
    && estados[tipo]?.puedeJugar === false
    && data.minijuego?.tipo === tipo
    && data.minijuego.puntuacion === puntuacion
    && fechaValida(data.minijuego.completadoEn)
    && fechaValida(data.minijuego.disponibleEn)
    && data.recompensa
    && TIPOS_RECOMPENSA.every((clave) => enteroNoNegativo(data.recompensa[clave]));
  if (!valido) throw errorContrato();
  return data;
}

// --- Errores ---------------------------------------------------------------
// La pantalla nunca muestra el texto crudo del backend: traduce el código a
// esta copia, que informa disponibilidad sin culpar ni apurar. `reintentable`
// dice si repetir el mismo POST puede prosperar; `requiereNuevaPartida`, si el
// camino es volver a jugar en vez de reintentar el guardado.

export const CODIGO_DESCANSO = 'EN_DESCANSO';

const GUION_ERRORES = Object.freeze({
  EN_DESCANSO: {
    titulo: 'Este juego toma una pausa',
    mensaje: 'La disponibilidad se guarda por persona y por juego. Podrás volver cuando pasen 24 horas, sin apuro.',
    reintentable: false,
    requiereNuevaPartida: false,
  },
  SESION_INVALIDA: {
    titulo: 'El momento no quedó registrado',
    mensaje: 'Puedes abrir el juego otra vez cuando quieras, sin apuro.',
    reintentable: false,
    requiereNuevaPartida: true,
  },
  SESION_EXPIRADA: {
    titulo: 'La partida quedó abierta un buen rato',
    mensaje: 'Puedes empezar otra cuando quieras, con calma.',
    reintentable: false,
    requiereNuevaPartida: true,
  },
  MASCOTA_NO_ENCONTRADA: {
    titulo: 'El juego está descansando',
    mensaje: 'No pudimos encontrar esta mascota ahora mismo.',
    reintentable: false,
    requiereNuevaPartida: false,
  },
  AUTENTICACION: {
    titulo: 'Tu sesión se cerró',
    mensaje: 'Vuelve a entrar y el momento con la mascota sigue esperándote.',
    reintentable: false,
    requiereNuevaPartida: false,
  },
  CONEXION: {
    titulo: 'El momento sigue aquí',
    mensaje: 'Puedes intentar guardarlo otra vez sin repetir el juego.',
    reintentable: true,
    requiereNuevaPartida: false,
  },
  DESCONOCIDO: {
    titulo: 'El momento no quedó registrado',
    mensaje: 'Puedes abrir el juego otra vez cuando quieras, sin apuro.',
    reintentable: false,
    requiereNuevaPartida: true,
  },
});

const CODIGO_POR_STATUS = Object.freeze({
  401: 'AUTENTICACION',
  403: 'AUTENTICACION',
  404: 'MASCOTA_NO_ENCONTRADA',
  429: CODIGO_DESCANSO,
});

function codigoDeError(error) {
  const declarado = error?.codigo;
  if (typeof declarado === 'string' && GUION_ERRORES[declarado]) return declarado;

  const { status } = error ?? {};
  // Sin status es un corte de red: el resultado local sobrevive y el reintento
  // tiene sentido. Un 5xx se trata igual porque puede ser un fallo pasajero.
  if (!Number.isFinite(status) || status >= 500) return 'CONEXION';
  return CODIGO_POR_STATUS[status] ?? 'DESCONOCIDO';
}

export function interpretarErrorMinijuego(error) {
  const codigo = codigoDeError(error);
  return {
    codigo,
    ...GUION_ERRORES[codigo],
    disponibleEn: fechaValida(error?.disponibleEn) ? error.disponibleEn : null,
  };
}
