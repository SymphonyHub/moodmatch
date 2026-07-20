const { createHash } = require('crypto');
const { detectarCrisis, validarTono } = require('./tonoCrisis');

const VALID_MOODS = ['FELIZ', 'TRISTE', 'ANSIOSO', 'CALMADO', 'ENOJADO', 'NEUTRO'];
const MOODS_DIFICILES = ['TRISTE', 'ANSIOSO', 'ENOJADO'];

const VALORES_PERFIL = {
  compania: ['uno_a_uno', 'grupo_pequeno', 'grupo_grande'],
  ritmo: ['tranquilo', 'equilibrado', 'activo'],
  entorno: ['casa', 'aire_libre', 'indistinto'],
  actividad: ['creativa', 'movimiento', 'entretenimiento', 'reflexion'],
  recarga: ['musica', 'naturaleza', 'conversar', 'desconectar'],
  novedad: ['conocido', 'mezcla', 'explorar'],
};

const PATRONES_RIESGO_SOCIAL = [
  /alcohol|cerveza|vino|trago|licor|pisco|vodka|whisk|fernet|champan|espumante|\bron\b/,
  /droga|cocaina|marihuana|cannabis/,
  /medicamento|pastilla|suplemento|remedio|ibuprofen|paracetam|aspirin|farmac/,
  /sin casco|sin proteccion|reto extremo|conducta peligrosa|arriesg|conducir|manejar|motocicleta|\bmoto\b/,
  /nad(ar|en|ando).{0,30}(noche|mar abierto|\brio\b|\blago\b)/,
  /gastar? mucho|gasto alto|caro|costoso|lujo|endeud|primera clase|cinco estrellas|5 estrellas|\bvuelo\b/,
  /(amig|alguien|persona).{0,50}(feliz|triste|ansios|calmad|enojad|neutr)/,
  /(feliz|triste|ansios|calmad|enojad|neutr).{0,50}(amig|alguien|persona)/,
];

const PLANTILLAS_SOCIALES = {
  acompanar: {
    nombre: 'Una pausa acompañada',
    descripcion:
      'Invita a un amigo a caminar o tomar algo sin apuro. El plan puede ser simplemente estar juntos y conversar si nace.',
  },
  compartir: {
    nombre: 'Playlist de ida y vuelta',
    descripcion:
      'Elijan tres canciones cada uno, escúchenlas juntos y cuenten qué recuerdo o sensación les trae cada una.',
  },
  generica: {
    nombre: 'Paseo con una parada rica',
    descripcion:
      'Propongan una caminata corta y elijan juntos una parada para tomar o comer algo que disfruten.',
  },
};

// Punto único de integración con el cuestionario del Agente A. Solo salen las
// seis preferencias v1; version, fecha y cualquier campo extra se descartan.
// Un perfil ausente, incompleto o de otro shape conserva la idea genérica.
function contextoPerfilPersonalidad(perfilPersonalidad) {
  if (!perfilPersonalidad || typeof perfilPersonalidad !== 'object') return null;
  const respuestas = perfilPersonalidad.respuestas;
  if (!respuestas || typeof respuestas !== 'object' || Array.isArray(respuestas)) return null;

  const contexto = {};
  for (const [campo, valores] of Object.entries(VALORES_PERFIL)) {
    if (!valores.includes(respuestas[campo])) return null;
    contexto[campo] = respuestas[campo];
  }
  return JSON.stringify(contexto);
}

function sanearMoodsVisibles(moods) {
  if (!Array.isArray(moods)) return [];
  return moods.filter((mood) => VALID_MOODS.includes(mood));
}

// Reduce los moods visibles a una orientación de tono. Gemini no recibe las
// categorías originales, nombres, conteos ni distribución entre amistades.
function orientacionSocial(moods) {
  const visibles = sanearMoodsVisibles(moods);
  if (visibles.some((mood) => MOODS_DIFICILES.includes(mood))) {
    return 'acompanar_sin_presion';
  }
  if (visibles.some((mood) => mood === 'FELIZ' || mood === 'CALMADO')) {
    return 'compartir_momento_agradable';
  }
  return 'plan_general';
}

function idSocial(sugerencia) {
  const contenido = `${sugerencia.nombre}|${sugerencia.descripcion}`;
  return `social-${createHash('sha256').update(contenido).digest('hex').slice(0, 12)}`;
}

function completarSugerenciaSocial(sugerencia) {
  return {
    id: idSocial(sugerencia),
    nombre: sugerencia.nombre.trim(),
    descripcion: sugerencia.descripcion.trim(),
    categoria: 'social',
  };
}

function sugerenciaSocialPlantilla(moods) {
  const visibles = sanearMoodsVisibles(moods);
  const base = visibles.some((mood) => MOODS_DIFICILES.includes(mood))
    ? PLANTILLAS_SOCIALES.acompanar
    : visibles.some((mood) => mood === 'FELIZ' || mood === 'CALMADO')
      ? PLANTILLAS_SOCIALES.compartir
      : PLANTILLAS_SOCIALES.generica;
  return completarSugerenciaSocial(base);
}

function validarSugerenciaSocial(sugerencia) {
  if (!sugerencia || typeof sugerencia !== 'object' || Array.isArray(sugerencia)) return false;
  const { nombre, descripcion } = sugerencia;
  if (typeof nombre !== 'string' || typeof descripcion !== 'string') return false;
  const titulo = nombre.trim();
  const detalle = descripcion.trim();
  if (!titulo || titulo.length > 80 || !detalle || detalle.length > 320) return false;

  const texto = `${titulo}. ${detalle}`;
  if (detectarCrisis(texto)) return false;
  const normalizado = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (PATRONES_RIESGO_SOCIAL.some((patron) => patron.test(normalizado))) return false;
  // TRISTE activa también el filtro de positividad forzada; una sugerencia
  // social debe ser segura aunque entre los amigos haya un ánimo difícil.
  return validarTono(texto, 'TRISTE');
}

module.exports = {
  VALID_MOODS,
  VALORES_PERFIL,
  PATRONES_RIESGO_SOCIAL,
  PLANTILLAS_SOCIALES,
  contextoPerfilPersonalidad,
  sanearMoodsVisibles,
  orientacionSocial,
  completarSugerenciaSocial,
  sugerenciaSocialPlantilla,
  validarSugerenciaSocial,
};
