// Invitación de "Salida con amigos" sobre el chat de texto libre existente.
// Los mensajes son filas Cheer de solo texto (sin campo de tipo), así que la
// invitación y su respuesta viajan como mensajes normales con un sentinel al
// inicio que la UI reconoce y oculta al mostrar. Núcleo puro (patrón de
// [mensajesChat]): la pantalla de chat solo clasifica y renderiza.
//
// Sin migración ni backend nuevo: "a través del chat ya existente".

const SENTINEL_INVITACION = '[[mm:salida]]';
const SENTINEL_ACEPTA = '[[mm:salida:si]]';
const SENTINEL_RECHAZA = '[[mm:salida:no]]';

const TEXTO_INVITACION =
  '¿Te gustaría que hagamos algo juntos pronto? Un café, una vuelta, o solo conversar. 🙂';
const TEXTO_ACEPTA = '¡Me encantaría! Contá conmigo. 🙌';
const TEXTO_RECHAZA = 'Esta vez no voy a poder, pero gracias por pensar en mí. 🙏';

// Prefijo sentinel + texto legible: si un build viejo lo mostrara crudo, igual
// se entiende el mensaje.
export function crearInvitacion() {
  return `${SENTINEL_INVITACION} ${TEXTO_INVITACION}`;
}

export function crearRespuesta(acepta) {
  return acepta
    ? `${SENTINEL_ACEPTA} ${TEXTO_ACEPTA}`
    : `${SENTINEL_RECHAZA} ${TEXTO_RECHAZA}`;
}

// { tipo: 'invitacion' | 'aceptar' | 'rechazar' | 'texto', texto }
// `texto` es el mensaje sin el sentinel, listo para mostrar.
export function clasificar(message) {
  const raw = typeof message === 'string' ? message : '';
  const quitar = (sentinel) => raw.slice(sentinel.length).trimStart();

  if (raw.startsWith(SENTINEL_INVITACION)) {
    return { tipo: 'invitacion', texto: quitar(SENTINEL_INVITACION) };
  }
  if (raw.startsWith(SENTINEL_ACEPTA)) {
    return { tipo: 'aceptar', texto: quitar(SENTINEL_ACEPTA) };
  }
  if (raw.startsWith(SENTINEL_RECHAZA)) {
    return { tipo: 'rechazar', texto: quitar(SENTINEL_RECHAZA) };
  }
  return { tipo: 'texto', texto: raw };
}

const esRespuesta = (tipo) => tipo === 'aceptar' || tipo === 'rechazar';

// ¿El receptor ya respondió esta invitación? True si existe una respuesta
// (aceptar/rechazar) posterior a la invitación enviada por el receptor (es
// decir, con `mine` opuesto al de la invitación). Decide si aún se muestran
// los botones Aceptar/Rechazar.
export function estaRespondida(mensajes, invitacion) {
  const idx = mensajes.findIndex((m) => m.id === invitacion.id);
  if (idx === -1) return false;
  return mensajes
    .slice(idx + 1)
    .some((m) => m.mine !== invitacion.mine && esRespuesta(clasificar(m.message).tipo));
}
