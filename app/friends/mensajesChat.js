// Transiciones puras del estado de mensajes del chat 1:1 (pantalla
// app/chat/[friendId].jsx). Sin React ni red: la pantalla orquesta
// apiGetMessages/apiSendMessage y delega aquí cómo evoluciona la lista.
// Garantías que dan sentido al diseño:
//   - el envío es optimista: el mensaje aparece al instante como pending
//   - un fallo NO descarta el texto: el mensaje queda failed y es
//     reintentable desde la misma burbuja (Fase 9 — ChatInputBar limpia su
//     input al enviar, así que la burbuja es el único lugar donde vive el
//     texto no confirmado)
//   - el poll del servidor nunca pisa mensajes locales en vuelo o fallidos

export const esLocal = (mensaje) => Boolean(mensaje.pending || mensaje.failed);

// Mensaje optimista con id temporal; `ahora` se inyecta en tests.
export function crearOptimista(message, ahora = new Date()) {
  return {
    id: `tmp-${ahora.getTime()}`,
    message,
    mine: true,
    pending: true,
    createdAt: ahora.toISOString(),
  };
}

// El servidor confirmó: el optimista se reemplaza por el mensaje real.
export function confirmar(mensajes, tempId, mensajeReal) {
  return mensajes.map((m) => (m.id === tempId ? mensajeReal : m));
}

// El envío falló: el mensaje queda visible y reintentable, no se pierde.
export function marcarFallido(mensajes, tempId) {
  return mensajes.map((m) =>
    m.id === tempId ? { ...m, pending: false, failed: true } : m,
  );
}

// Reintento desde la burbuja fallida: vuelve a pending antes de re-enviar.
export function prepararReintento(mensajes, tempId) {
  return mensajes.map((m) =>
    m.id === tempId ? { ...m, pending: true, failed: false } : m,
  );
}

// Resultado del poll: la verdad del servidor + los locales aún sin confirmar
// (pendientes en vuelo y fallidos esperando reintento) al final de la lista.
export function reconciliar(mensajesServidor, prev, mutacionesReaccion = new Map(), inicioCarga = Infinity) {
  const anteriores = new Map(prev.map((mensaje) => [mensaje.id, mensaje]));
  const servidorProtegido = mensajesServidor.map((mensaje) => {
    const mutadaEn = mutacionesReaccion.get(mensaje.id);
    const anterior = anteriores.get(mensaje.id);
    return mutadaEn >= inicioCarga && anterior
      ? { ...mensaje, reacciones: anterior.reacciones }
      : mensaje;
  });
  return [...servidorProtegido, ...prev.filter(esLocal)];
}

export function actualizarReacciones(mensajes, messageId, reacciones) {
  return mensajes.map((mensaje) => (
    mensaje.id === messageId ? { ...mensaje, reacciones } : mensaje
  ));
}
