// Catálogo cerrado de retos cooperativos de la mascota (Fase 14). Amplía el
// único reto de cuidado simultáneo de Fase 12 a una lista fija de 4 tipos, sin
// convertirlo en un sistema abierto/configurable. Lógica pura y sin dependencia
// de Prisma para poder testear la selección y la evaluación de progreso sin
// montar la ruta (backend/__tests__/retosCooperativos.test.js).
//
// El tono sigue las reglas del proyecto: se celebra la constancia conjunta, sin
// presión ni competencia. Ningún texto culpabiliza por no cumplir.

const DURACION_RETO_MS = 48 * 60 * 60 * 1000;

// Cuántos pares de mensajes (A→B + B→A) cierran el reto de conversación.
const META_PARES_MENSAJES = 3;

// Lista cerrada. El orden define la rotación (ver elegirTipo): cada reto nuevo
// toma el siguiente tipo distinto al anterior, para variar sin repetir.
const CATALOGO_RETOS = [
  {
    tipo: 'CUIDADO_DUO',
    // señal: cada integrante pasa a cuidar dentro de la ventana.
    senal: 'cuidado',
    titulo: 'Cuidarla en dúo',
    descripcion: 'Los dos pasan a cuidarla antes de que cierre la ventana. Cuando a cada quien le acomode, sin apuro.',
  },
  {
    tipo: 'ANIMO_MISMO_DIA',
    senal: 'animo',
    titulo: 'Un día en sintonía',
    descripcion: 'Registren cómo se sienten el mismo día. Cualquier ánimo cuenta: se trata de compartir el momento, no de estar bien.',
  },
  {
    tipo: 'RACHA_MENSAJES',
    senal: 'mensajes',
    meta: META_PARES_MENSAJES,
    titulo: 'Mantener el hilo',
    descripcion: 'Intercambien algunos mensajes durante estos días. Un hola también cuenta.',
  },
  {
    tipo: 'ACTIVIDAD_JUNTOS',
    senal: 'actividad',
    titulo: 'Algo juntos',
    descripcion: 'Marquen una actividad que hayan hecho juntos desde "Con amigos".',
  },
];

const TIPOS_RETO = CATALOGO_RETOS.map((r) => r.tipo);

// El reto original de Fase 12 se guardaba como 'CUIDADO_COMPARTIDO'. Se trata
// como equivalente al de cuidado en dúo para que los retos ya en curso al subir
// esta versión sigan evaluándose sin romperse.
const TIPO_LEGADO = 'CUIDADO_COMPARTIDO';

const definicion = (tipo) =>
  CATALOGO_RETOS.find((r) => r.tipo === tipo)
  ?? (tipo === TIPO_LEGADO ? CATALOGO_RETOS[0] : null);

// Texto e info pública de un reto por su tipo, tolerante a tipos desconocidos.
function infoReto(tipo) {
  const def = definicion(tipo) ?? CATALOGO_RETOS[0];
  return { titulo: def.titulo, descripcion: def.descripcion, meta: def.meta ?? null };
}

// Qué señal hay que juntar para evaluar el progreso de un tipo de reto. El
// llamador (la ruta) usa esto para pedir a la base solo lo justo.
const senalDeReto = (tipo) => (definicion(tipo) ?? CATALOGO_RETOS[0]).senal;

// Elige el tipo del próximo reto: el siguiente del catálogo distinto al
// anterior, para que no se repita dos veces seguidas. Rotación determinista
// (fácil de testear) en vez de azar.
function elegirTipo(tipoAnterior) {
  const idx = TIPOS_RETO.indexOf(tipoAnterior);
  if (idx === -1) return TIPOS_RETO[0];
  return TIPOS_RETO[(idx + 1) % TIPOS_RETO.length];
}

function crearReto(ahora = new Date(), tipoAnterior = null) {
  const tipo = elegirTipo(tipoAnterior);
  const def = definicion(tipo);
  return {
    tipo,
    titulo: def.titulo,
    descripcion: def.descripcion,
    ...(def.meta ? { meta: def.meta } : {}),
    iniciadoEn: ahora.toISOString(),
    expiraEn: new Date(ahora.getTime() + DURACION_RETO_MS).toISOString(),
    progresoUsuario1: false,
    progresoUsuario2: false,
    completado: false,
  };
}

// Recalcula el progreso de un reto a partir de la acción de cuidado que se
// acaba de hacer y de las señales ya consultadas por la ruta. Devuelve una
// copia (no muta el original) con los booleanos por usuario y `completado`.
//
// `esUsuario1` indica si quien cuida es el usuario1 del vínculo (amistad.userId).
// `senales` trae los datos ya leídos de la base para el tipo de reto:
//   - animo:     { animoUsuario1, animoUsuario2, ambosMismoDia }
//   - mensajes:  { paresMensajes, mensajesUsuario1, mensajesUsuario2 }
//   - actividad: { actividadUsuario1, actividadUsuario2 }
function aplicarProgresoReto(reto, { esUsuario1, senales = {} } = {}) {
  const siguiente = { ...reto };
  const tipo = definicion(reto.tipo)?.tipo ?? 'CUIDADO_DUO';

  switch (tipo) {
    case 'ANIMO_MISMO_DIA':
      siguiente.progresoUsuario1 = Boolean(senales.animoUsuario1);
      siguiente.progresoUsuario2 = Boolean(senales.animoUsuario2);
      siguiente.completado = Boolean(senales.ambosMismoDia);
      break;
    case 'RACHA_MENSAJES':
      siguiente.progresoUsuario1 = Number(senales.mensajesUsuario1) > 0;
      siguiente.progresoUsuario2 = Number(senales.mensajesUsuario2) > 0;
      siguiente.completado = Number(senales.paresMensajes) >= (reto.meta ?? META_PARES_MENSAJES);
      break;
    case 'ACTIVIDAD_JUNTOS':
      siguiente.progresoUsuario1 = Boolean(senales.actividadUsuario1);
      siguiente.progresoUsuario2 = Boolean(senales.actividadUsuario2);
      siguiente.completado = siguiente.progresoUsuario1 && siguiente.progresoUsuario2;
      break;
    default: // CUIDADO_DUO y el legado CUIDADO_COMPARTIDO
      // El cuidado que se acaba de hacer marca la parte de quien cuida.
      if (esUsuario1) siguiente.progresoUsuario1 = true;
      else siguiente.progresoUsuario2 = true;
      siguiente.completado = siguiente.progresoUsuario1 && siguiente.progresoUsuario2;
      break;
  }
  return siguiente;
}

module.exports = {
  CATALOGO_RETOS,
  DURACION_RETO_MS,
  META_PARES_MENSAJES,
  TIPOS_RETO,
  TIPO_LEGADO,
  aplicarProgresoReto,
  crearReto,
  elegirTipo,
  infoReto,
  senalDeReto,
};
