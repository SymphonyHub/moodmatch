// Lógica pura de la pantalla raíz de Mascota, separada del render para poder
// testear la elección de estado sin montar componentes
// (app/__tests__/seccionMascota.test.js). Corresponde a la tabla de casos de
// FASE14 sección 3 (Pantalla raíz).

export function clasificarSeccion(data = {}) {
  const mascotas = data.mascotas ?? [];
  const recibidas = data.invitaciones?.recibidas ?? [];
  const enviadas = data.invitaciones?.enviadas ?? [];
  const amigosElegibles = data.amigosElegibles ?? [];

  const hayInvitaciones = recibidas.length > 0 || enviadas.length > 0;
  const totalAmigos = mascotas.length + recibidas.length + enviadas.length + amigosElegibles.length;

  // 0 amigos: estado vacío que invita a agregar a alguien por QR.
  if (totalAmigos === 0) return { modo: 'sin-amigos' };

  // Una sola mascota y nada más que mostrar: se salta directo al detalle para
  // no hacer pasar por una lista de un solo elemento. Si hay invitaciones o
  // amigos por invitar, se muestra la lista para no esconder esas acciones.
  if (mascotas.length === 1 && !hayInvitaciones && amigosElegibles.length === 0) {
    return { modo: 'detalle-directo', amistadId: mascotas[0].amistadId };
  }

  return {
    modo: 'lista',
    mascotas,
    recibidas,
    enviadas,
    amigosElegibles,
  };
}
