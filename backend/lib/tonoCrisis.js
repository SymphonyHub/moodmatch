// Réplica CommonJS de la capa de reglas del frontend — segunda capa del
// escudo de crisis y validador de tono del endpoint de IA (CONTRATO-GEMINI.md
// sección 2). Fuente autoritativa: app/features/emociones/crisis.js y
// app/features/emociones/tono.js. El test de paridad (chatParidad.test.js)
// falla si estas copias divergen de aquellas.

function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const PATRONES = [
  /suicid/, // suicidio, suicidarme, suicida
  /matarme|me quiero matar/,
  /quitarme la vida/,
  /(quiero|quisiera) morir(me)?\b/,
  /me quiero morir/,
  /no quiero (seguir )?vivi/, // vivir, viviendo
  /no vale la pena (seguir )?vivi/,
  /hacerme dano|me quiero hacer dano/,
  /cortarme|me estoy cortando/,
  /autolesi/,
  /acabar con todo|terminar con todo/,
  /no le (veo|encuentro) sentido a (la vida|vivir|seguir)/,
  /mejor estaria muert|estarian mejor sin mi/,
  /quiero desaparecer/,
];

function detectarCrisis(texto) {
  const t = normalizar(texto);
  if (!t) return false;
  return PATRONES.some((p) => p.test(t));
}

const MENSAJE_CRISIS =
  'Lo que me cuentas suena muy duro, y no quiero que lo lleves en silencio. ' +
  'Hablar con alguien de confianza puede ayudar más de lo que parece. ' +
  'Y si necesitas apoyo ahora, en Chile puedes llamar gratis a la Línea de ' +
  'Prevención del Suicidio *4141 (24 horas) o a Salud Responde 600 360 7777. ' +
  'No estás solo/a en esto.';

const MOODS_DIFICILES = ['TRISTE', 'ANSIOSO', 'ENOJADO'];

const LISTA_NEGRA_UNIVERSAL = [
  'no es para tanto',
  'podria ser peor',
  'hay gente peor',
  'no te preocupes',
  'exagera', // cubre "exageras", "exageración"
  'depresion',
  'trastorno',
  'diagnos',
  'deberias sentirte',
];

const LISTA_NEGRA_POSITIVIDAD = [
  'animate',
  'alegrate',
  'sonrie',
  'piensa positivo',
  'piensa en positivo',
  'mira el lado bueno',
  'todo pasa por algo',
  'se feliz',
  'calmate',
  'relajate',
  'no estes triste',
  'todo va a estar bien',
];

// Recursos de crisis que el modelo NUNCA puede emitir por su cuenta: esa
// pieza es exclusiva de MENSAJE_CRISIS (capa de reglas). Los dígitos cubren
// cualquier teléfono; las frases, menciones sin número.
const PATRONES_RECURSOS_CRISIS = [
  /\d{4,}/, // teléfonos (4141, 600 360 7777, etc., ya sin espacios)
  /\*\d+/,
  /salud responde/,
  /linea de prevencion/,
  /linea de ayuda/,
  /linea de crisis/,
];

const LARGO_MAXIMO = 600;

// Validador post-respuesta del texto del modelo (CONTRATO-GEMINI.md 2.3):
// true = utilizable, false = descartar y responder por plantilla.
function validarTono(texto, mood) {
  const t = normalizar(texto).trim();
  if (!t || t.length > LARGO_MAXIMO) return false;
  const sinEspacios = t.replace(/[\s.\-()]/g, '');
  if (PATRONES_RECURSOS_CRISIS.some((p) => p.test(t) || p.test(sinEspacios))) return false;
  if (LISTA_NEGRA_UNIVERSAL.some((frase) => t.includes(frase))) return false;
  if (MOODS_DIFICILES.includes(mood)) {
    if (LISTA_NEGRA_POSITIVIDAD.some((frase) => t.includes(frase))) return false;
  }
  return true;
}

module.exports = {
  normalizar,
  PATRONES,
  detectarCrisis,
  MENSAJE_CRISIS,
  MOODS_DIFICILES,
  LISTA_NEGRA_UNIVERSAL,
  LISTA_NEGRA_POSITIVIDAD,
  validarTono,
};
