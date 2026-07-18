// Lógica pura de las 3 acciones de "Con amigos" (Fase 10). Sin React ni red:
// AccionConAmigos.jsx orquesta modales/navegación y delega aquí el mapeo de
// cada tarjeta y la selección de a quién sugerir.

// Las 3 acciones sociales llegan de /api/activities?categoria=social (orden por
// id asc). Verificado contra el seed: las 3 primeras son estos nombres. Un
// nombre fuera del mapa cae en fallback informativo (tarjeta sin onPress).
export const TIPO_POR_NOMBRE = {
  'Salida con amigos': 'salida',
  'Escribe a alguien que aprecias': 'aprecias',
  'Comparte tu energía positiva': 'energia',
};

export const tipoDeAccion = (nombre) => TIPO_POR_NOMBRE[nombre] ?? null;

// Ánimos "difíciles": alguien que podría estar pasándola mal. Mismo criterio de
// tono que el chat de emociones (validar, no forzar positividad).
export const ANIMOS_DIFICILES = ['TRISTE', 'ANSIOSO', 'ENOJADO'];

// GUARDRAIL DE PRIVACIDAD: solo lee `moodReciente`, el chip de ánimo que cada
// amigo YA comparte y que hoy se ve en la lista de amigos. No infiere ni usa
// ningún otro dato. Devuelve el amigo con ánimo difícil a quien sugerir
// contactar, o null si ninguno registró un ánimo difícil.
export function elegirSugerencia(amigos) {
  if (!Array.isArray(amigos)) return null;
  return amigos.find((a) => ANIMOS_DIFICILES.includes(a?.moodReciente)) ?? null;
}

// Textos sugeridos que se precargan en el campo de texto (editables por el
// usuario antes de enviar). `energia` se personaliza con el nombre del amigo.
export const MENSAJES_PRECARGA = {
  aprecias: 'Hola 💛 Solo quería decirte que te aprecio mucho y que me alegra tenerte cerca.',
  energia: (nombre) =>
    `Hola${nombre ? ` ${nombre}` : ''} 🌤️ Estaba pensando en ti. ¿Cómo vienes? Aquí estoy si quieres hablar.`,
};
