export const PERFIL_PERSONALIDAD_VERSION = 1;

export const PREGUNTAS_PERSONALIDAD = [
  {
    id: 'compania',
    titulo: '¿Con cuánta gente disfrutas más un plan?',
    opciones: [
      { valor: 'uno_a_uno', etiqueta: 'De a dos', icono: 'person-outline' },
      { valor: 'grupo_pequeno', etiqueta: 'Grupo pequeño', icono: 'people-outline' },
      { valor: 'grupo_grande', etiqueta: 'Grupo grande', icono: 'megaphone-outline' },
    ],
  },
  {
    id: 'ritmo',
    titulo: '¿Qué ritmo te hace sentir mejor?',
    opciones: [
      { valor: 'tranquilo', etiqueta: 'Sin apuro', icono: 'leaf-outline' },
      { valor: 'equilibrado', etiqueta: 'Un poco de todo', icono: 'options-outline' },
      { valor: 'activo', etiqueta: 'Con energía', icono: 'flash-outline' },
    ],
  },
  {
    id: 'entorno',
    titulo: '¿Dónde prefieres pasar tu tiempo libre?',
    opciones: [
      { valor: 'casa', etiqueta: 'En casa', icono: 'home-outline' },
      { valor: 'aire_libre', etiqueta: 'Al aire libre', icono: 'sunny-outline' },
      { valor: 'indistinto', etiqueta: 'Me da igual', icono: 'shuffle-outline' },
    ],
  },
  {
    id: 'actividad',
    titulo: '¿Qué tipo de actividad te atrae primero?',
    opciones: [
      { valor: 'creativa', etiqueta: 'Crear algo', icono: 'color-palette-outline' },
      { valor: 'movimiento', etiqueta: 'Moverme', icono: 'walk-outline' },
      { valor: 'entretenimiento', etiqueta: 'Ver o jugar', icono: 'game-controller-outline' },
      { valor: 'reflexion', etiqueta: 'Pensar y aprender', icono: 'book-outline' },
    ],
  },
  {
    id: 'recarga',
    titulo: 'Cuando necesitas recargar, ¿qué eliges?',
    opciones: [
      { valor: 'musica', etiqueta: 'Música', icono: 'musical-notes-outline' },
      { valor: 'naturaleza', etiqueta: 'Naturaleza', icono: 'flower-outline' },
      { valor: 'conversar', etiqueta: 'Conversar', icono: 'chatbubbles-outline' },
      { valor: 'desconectar', etiqueta: 'Estar a solas', icono: 'moon-outline' },
    ],
  },
  {
    id: 'novedad',
    titulo: '¿Cómo te llevas con los planes nuevos?',
    opciones: [
      { valor: 'conocido', etiqueta: 'Prefiero lo conocido', icono: 'heart-outline' },
      { valor: 'mezcla', etiqueta: 'Depende del día', icono: 'git-compare-outline' },
      { valor: 'explorar', etiqueta: 'Me encanta explorar', icono: 'compass-outline' },
    ],
  },
];

const VALORES_POR_PREGUNTA = Object.fromEntries(
  PREGUNTAS_PERSONALIDAD.map((pregunta) => [
    pregunta.id,
    pregunta.opciones.map((opcion) => opcion.valor),
  ]),
);

export function respuestasCompletas(respuestas) {
  return PREGUNTAS_PERSONALIDAD.every((pregunta) =>
    VALORES_POR_PREGUNTA[pregunta.id].includes(respuestas[pregunta.id]),
  );
}

/**
 * Contrato exacto persistido en User.perfilPersonalidad y consumido por Agente B:
 * {
 *   version: 1,
 *   completadoEn: string, // fecha ISO-8601
 *   respuestas: {
 *     compania: 'uno_a_uno' | 'grupo_pequeno' | 'grupo_grande',
 *     ritmo: 'tranquilo' | 'equilibrado' | 'activo',
 *     entorno: 'casa' | 'aire_libre' | 'indistinto',
 *     actividad: 'creativa' | 'movimiento' | 'entretenimiento' | 'reflexion',
 *     recarga: 'musica' | 'naturaleza' | 'conversar' | 'desconectar',
 *     novedad: 'conocido' | 'mezcla' | 'explorar'
 *   }
 * }
 */
export function crearPerfilPersonalidad(respuestas, fecha = new Date()) {
  if (!respuestasCompletas(respuestas)) {
    throw new Error('Las respuestas de personalidad están incompletas');
  }

  return {
    version: PERFIL_PERSONALIDAD_VERSION,
    completadoEn: fecha.toISOString(),
    respuestas: Object.fromEntries(
      PREGUNTAS_PERSONALIDAD.map((pregunta) => [pregunta.id, respuestas[pregunta.id]]),
    ),
  };
}
