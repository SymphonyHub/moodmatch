// Wrapper del SDK oficial de Google Gen AI (@google/genai) para el chat de
// emociones. Expone generarRespuesta(); si algo falla (key ausente, red,
// timeout, respuesta vacía) LANZA — el route decide el fallback por plantilla,
// nunca un 5xx (CONTRATO-GEMINI.md).
//
// Fase 15: aquí vive también la identidad del bot (systemPrompt), las señales
// que se leen del historial para no pedirle al modelo que recuerde lo que no
// puede (senalesDeHistorial, pideRelato) y el extractor de memoria
// (extraerMemoria). Las 7 reglas no negociables se emiten literales en cada
// llamada, pase lo que pase con el resto del prompt.

const { GoogleGenAI } = require('@google/genai');
const { normalizar } = require('./tonoCrisis');
const { contextoMemoria, MAX_NOTAS, MAX_LARGO_NOTA } = require('./memoriaChat');

// Alias estable de Google (sigue al Flash-Lite vigente): evita 404 por
// modelos retirados (gemini-2.5-flash ya no acepta usuarios nuevos) y es el
// único de la familia con latencia de chat (~0,5 s medido; gemini-flash-latest
// tardó ~9 s, más que el timeout). Sobreescribible con GEMINI_MODEL.
const MODELO = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const TIMEOUT_MS = 8000;
// Ventana de contexto dentro de una conversación (Fase 15). Los 8 turnos
// originales alcanzaban para el guion corto de 4 intercambios, pero la charla
// extendida de Fase 9 pasa fácil de 20 turnos y el bot perdía el hilo de lo
// que la propia persona le había contado diez líneas antes. Son turnos
// cortos: 40 sigue siendo un contexto barato.
const MAX_HISTORIAL = 40;

// Etiquetas humanas de los moods (mismas de app/constants/moods.js).
const MOOD_LABELS = {
  FELIZ: 'feliz',
  TRISTE: 'triste',
  ANSIOSO: 'ansioso/a',
  CALMADO: 'calmado/a',
  ENOJADO: 'enojado/a',
  NEUTRO: 'neutro, sin un ánimo marcado',
};

const MOODS_DIFICILES = ['TRISTE', 'ANSIOSO', 'ENOJADO'];

// Sugerencia sutil del Wellness Hub según el ánimo (regla 6 del encargo):
// se ofrece como posibilidad, nunca como orden.
const HUB_POR_MOOD = {
  FELIZ: 'Si fluye natural, puedes mencionar una sola vez que en la pestaña "Con amigos" podría compartir ese buen ánimo o mandarle ánimo a un amigo.',
  CALMADO: 'Si fluye natural, puedes mencionar una sola vez que en la pestaña "Con amigos" podría compartir esa calma con alguien cercano.',
  TRISTE: 'Si fluye natural, puedes mencionar una sola vez que en la pestaña "Para mí" hay una actividad suave pensada para este ánimo, cuando quiera.',
  ANSIOSO: 'Si fluye natural, puedes mencionar una sola vez que en la pestaña "Para mí" hay una actividad pensada para soltar tensión, cuando quiera.',
  ENOJADO: 'Si fluye natural, puedes mencionar una sola vez que en la pestaña "Para mí" hay una actividad para descargar energía, cuando quiera.',
  NEUTRO: 'Si fluye natural, puedes mencionar una sola vez que en la pestaña "Para mí" puede explorar alguna actividad si le tienta.',
};

const RE_HUB_EN_RESPUESTA = /para mi|con amigos|pestana/;

function terminaEnPregunta(turno) {
  return /\?\s*[)\]"'”’]*\s*$/.test(String(turno?.texto ?? '').trim());
}

// Señales que se leen del propio historial en vez de pedirle al modelo que
// se acuerde. El bot no tiene memoria de lo que ya dijo dentro de un turno:
// si la instrucción "menciónalo una sola vez" se reinyecta intacta cada vez,
// la cumple cada vez. Estas señales apagan la instrucción en origen.
function senalesDeHistorial(historial = []) {
  const turnosBot = historial.filter((t) => t.autor === 'bot');
  const hubMencionado = turnosBot.some((t) => RE_HUB_EN_RESPUESTA.test(normalizar(t.texto)));
  // Dos respuestas seguidas terminadas en pregunta: basta para que se sienta
  // cuestionario. La tercera va sin pregunta, por regla y no por criterio.
  const ultimasDos = turnosBot.slice(-2);
  const evitarPregunta = ultimasDos.length === 2 && ultimasDos.every(terminaEnPregunta);
  return { hubMencionado, evitarPregunta };
}

// Petición explícita de algo más largo o más liviano. Determinista a
// propósito: habilita el tope de largo extendido del validador, y eso no
// puede quedar a criterio del modelo.
const RE_PIDE_RELATO =
  /(cuenta(me)?|dime|echa(te)?|tira(me)?|hazme|quiero|necesito|puedes contar(me)?|sabes)\s+(un[ao]?\s+|algo\s+|una\s+)?(chiste|historia|cuento|relato|anecdota|talla|broma|algo (gracioso|divertido|entretenido))|hazme reir|hacerme reir|distraeme|distraerme/;

function pideRelato(mensaje) {
  return RE_PIDE_RELATO.test(normalizar(mensaje));
}

// opciones: { esUltimo, memoria, hubMencionado, evitarPregunta, relato }
function systemPrompt(mood, opciones = {}) {
  const {
    esUltimo = false,
    memoria = null,
    hubMencionado = true,
    evitarPregunta = false,
    relato = false,
  } = opciones;

  const sugerirHub = !hubMencionado && memoria?.preferencias?.sugerirHub !== false;
  const humor = memoria?.preferencias?.humor ?? 'neutro';

  const partes = [
    // 1. Identidad
    'Eres el compañero de conversación de MoodMatch. Hablas como un amigo que ' +
      'escucha de verdad: cercano, atento y directo, en español sencillo (Chile, ' +
      'trato de tú). Mucha gente abre este chat justamente porque no tiene con ' +
      'quién más hablar, así que conversas de igual a igual — no despachas ' +
      'consejos ni respondes con formulario. ' +
      'NO eres terapeuta ni profesional de la salud, y nunca lo simulas ni lo insinúas.',

    // 2. Contexto
    `La persona registró que hoy se siente ${MOOD_LABELS[mood]}.` +
      (MOODS_DIFICILES.includes(mood)
        ? ' Es una emoción difícil: acompáñala sin apurarla a sentirse mejor.'
        : ''),

    // 3. Reglas no negociables. Intactas desde Fase 8: la identidad nueva se
    //    construye alrededor de ellas, nunca a costa de ellas.
    'REGLAS NO NEGOCIABLES:\n' +
      '1. Nunca minimices lo que siente. Prohibido decir "no es para tanto", "podría ser peor", "hay gente peor", "no te preocupes" o llamarlo exageración.\n' +
      '2. Nunca diagnostiques ni sugieras una condición de salud mental. No nombres depresión, trastornos ni diagnósticos.\n' +
      '3. Nunca sugieras medicamentos, suplementos ni remedios de ningún tipo.\n' +
      '4. Nunca uses positividad forzada frente a emociones difíciles. Prohibido "anímate", "alégrate", "sonríe", "piensa positivo", "mira el lado bueno", "todo pasa por algo", "sé feliz", "cálmate", "relájate", "no estés triste", "todo va a estar bien".\n' +
      '5. Valida PRIMERO lo que la persona siente; solo después, y si cabe, sugiere algo.\n' +
      '6. No entregues teléfonos, líneas de ayuda ni recursos de crisis: la app tiene una capa dedicada a eso.\n' +
      '7. No des consejos médicos ni actúes como terapia; eres compañía breve, no tratamiento.',

    // 4. Cómo conversas. Corrige los tres vicios detectados probando el chat:
    //    la negativa rígida, la pregunta de cierre automática y el validar en
    //    seco. Ninguno de estos puntos habilita nada que la sección 3 prohíba.
    'CÓMO CONVERSAS:\n' +
      '- Si te pide algo explícitamente (un chiste, una historia, cambiar de tema, ' +
      'hablar de otra cosa, que le hables distinto), hazlo. Cumplir lo que te pidió ' +
      'NO es forzarle un cambio de ánimo: lo prohibido es que TÚ intentes cambiarle ' +
      'el ánimo por tu cuenta. Negarte a algo que pidió citando tus reglas es un error.\n' +
      '- No cierres cada respuesta con una pregunta. Pregunta solo cuando de verdad ' +
      'quieras saber algo, nunca en dos respuestas seguidas, y jamás como muletilla ' +
      'para rellenar. Una respuesta que se queda acompañando, sin preguntar, está bien.\n' +
      '- Ayúdale a pensar: devuélvele con otras palabras lo que dijo, nombra lo que ' +
      'se repite, ofrece una lectura posible en voz alta. Eso vale más que validar y ' +
      'preguntar en bucle.\n' +
      '- Puedes tener opinión propia, reírte y hablar de cosas cotidianas. Usa las ' +
      'palabras y la jerga que use la persona; si tienen una broma o un apodo entre ' +
      'ustedes, retómalo.\n' +
      '- No repitas fórmulas ni frases que ya usaste antes en esta conversación.',
  ];

  // 5. Memoria entre sesiones (Fase 15): solo lo que la persona contó o pidió.
  const contexto = contextoMemoria(memoria);
  if (contexto) partes.push(contexto);

  if (humor === 'prefiere') {
    partes.push('A esta persona le gusta que bromees; el humor con ella es bienvenido.');
  } else if (humor === 'evita') {
    partes.push('Esta persona te pidió que no le hicieras bromas: mantén el tono serio.');
  }

  // 6. Wellness Hub: una sola vez por conversación de verdad, y nunca si la
  //    persona pidió que dejaras de mencionarlo.
  if (sugerirHub) partes.push(HUB_POR_MOOD[mood]);

  // 7. Formato
  partes.push(
    relato
      ? 'FORMATO: la persona te pidió algo más largo, así que tienes espacio — hasta ' +
          'unas 8 frases. Texto plano, sin markdown ni listas. Cuéntalo bien y no ' +
          'vuelvas al final al tema del ánimo si no viene al caso.'
      : 'FORMATO: responde en 1 a 4 frases, texto plano sin markdown ni listas, a lo ' +
          'sumo un emoji suave.',
  );

  if (evitarPregunta) {
    partes.push(
      'IMPORTANTE: tus dos últimas respuestas terminaron en pregunta. Esta vez NO ' +
        'preguntes nada: responde y quédate ahí.',
    );
  }

  if (esUltimo) {
    // 8. Cierre
    partes.push(
      'Este es el último intercambio de la conversación: cierra con calidez, ' +
        'sin hacer preguntas nuevas, y menciona que la app le va a mostrar una ' +
        'sugerencia de actividad para este ánimo.',
    );
  }

  return partes.join('\n\n');
}

// historial [{ autor: 'usuario'|'bot', texto }] → contents de Gemini.
// Trunca a los últimos MAX_HISTORIAL y descarta turnos "bot" que hayan quedado
// al inicio de la ventana (la conversación multiturno debe abrir con 'user';
// el saludo del bot no aporta contexto emocional).
function aContents(historial, mensaje) {
  const ventana = historial.slice(-MAX_HISTORIAL);
  while (ventana.length && ventana[0].autor !== 'usuario') ventana.shift();
  const contents = ventana.map((t) => ({
    role: t.autor === 'usuario' ? 'user' : 'model',
    parts: [{ text: t.texto }],
  }));
  contents.push({ role: 'user', parts: [{ text: mensaje }] });
  return contents;
}

async function ejecutarGemini({ systemInstruction, contents, temperature = 0.7 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada');

  const ai = new GoogleGenAI({ apiKey });

  const llamada = ai.models.generateContent({
    model: MODELO,
    contents,
    config: {
      systemInstruction,
      temperature,
      // Holgado a propósito: en modelos con razonamiento, los tokens de
      // pensamiento descuentan de este tope y un valor justo puede dejar el
      // texto vacío. La brevedad la imponen el prompt y validarTono (600 c).
      maxOutputTokens: 1024,
    },
  });

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout de Gemini')), TIMEOUT_MS).unref?.(),
  );

  const resultado = await Promise.race([llamada, timeout]);
  const texto = (resultado.text ?? '').trim();
  if (!texto) throw new Error('Respuesta vacía de Gemini');
  return texto;
}

async function generarRespuesta({
  mood,
  mensaje,
  historial = [],
  esUltimo = false,
  memoria = null,
}) {
  const { hubMencionado, evitarPregunta } = senalesDeHistorial(historial);
  return ejecutarGemini({
    systemInstruction: systemPrompt(mood, {
      esUltimo,
      memoria,
      hubMencionado,
      evitarPregunta,
      relato: pideRelato(mensaje),
    }),
    contents: aContents(historial, mensaje),
  });
}

// ── Extractor de memoria (Fase 15) ──────────────────────────────────────────
// Destila la conversación a hechos que la persona dijo de sí misma. Corre
// fuera del turno (fire-and-forget desde el route), así que su latencia no la
// paga el usuario. Todo lo que devuelve pasa después por los filtros de
// lib/memoriaChat.js: este prompt es la primera barrera, no la única.

function memoriaSystemPrompt() {
  return [
    'Eres el extractor de memoria de MoodMatch. Lees una conversación y devuelves los hechos que la persona contó SOBRE SÍ MISMA, para que el bot la reconozca la próxima vez.',
    'REGLAS ABSOLUTAS:\n' +
      '1. Solo hechos que la persona dijo de forma explícita: nombres, gustos, personas o mascotas que mencionó, cosas que hace o le pasaron, palabras propias, apodos o bromas que ella misma usó.\n' +
      '2. Prohibido inferir. Nada de causas, diagnósticos, condiciones de salud, estados de ánimo deducidos ni interpretaciones de por qué se siente como se siente. Si no lo dijo, no existe.\n' +
      '3. Prohibido registrar cualquier contenido sobre suicidio, autolesión o daño a otros: omítelo por completo, no lo resumas ni lo insinúes.\n' +
      '4. No registres cómo se sintió un día puntual; eso ya vive en su historial de ánimo.\n' +
      '5. No repitas nada que ya aparezca en memoriaActual.',
    `FORMATO: responde exclusivamente JSON válido {"notas":["...","..."]}. Máximo ${MAX_NOTAS / 2} notas, cada una de ${MAX_LARGO_NOTA} caracteres como máximo, en tercera persona y en español ("Tiene un gato que se llama Suco"). Si no hay nada nuevo que valga la pena, devuelve {"notas":[]}. Sin markdown ni claves adicionales.`,
  ].join('\n\n');
}

function aMemoriaContents({ historial = [], mensaje, memoria }) {
  const conversacion = [...historial, { autor: 'usuario', texto: mensaje }]
    .slice(-MAX_HISTORIAL)
    .map((t) => `${t.autor === 'usuario' ? 'Persona' : 'Bot'}: ${t.texto}`)
    .join('\n');
  const contexto = {
    memoriaActual: (memoria?.notas ?? []).map((nota) => nota.t),
    conversacion,
  };
  return [{ role: 'user', parts: [{ text: JSON.stringify(contexto) }] }];
}

function parseNotasMemoria(texto) {
  const limpio = String(texto ?? '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const parsed = JSON.parse(limpio);
  return Array.isArray(parsed?.notas) ? parsed.notas.filter((n) => typeof n === 'string') : [];
}

async function extraerMemoria({ historial = [], mensaje, memoria = null }) {
  const texto = await ejecutarGemini({
    systemInstruction: memoriaSystemPrompt(),
    contents: aMemoriaContents({ historial, mensaje, memoria }),
    temperature: 0.2,
  });
  return parseNotasMemoria(texto);
}

function socialSystemPrompt() {
  return [
    'Eres el generador de actividades sociales de MoodMatch, una app de bienestar emocional.',
    'Propón UNA actividad concreta, breve, segura y realizable entre amigos. No eres terapeuta ni profesional de salud.',
    'Solo puedes usar la orientación de tono y las preferencias de la propia persona incluidas en el contexto. La orientación ya fue abstraída por el backend: nunca infieras datos, causas, diagnósticos ni información privada de sus amigos, y nunca menciones estados de ánimo de otras personas.',
    'Si hay un ánimo difícil, prioriza compañía sin presión: no intentes arreglarlo, no fuerces positividad y no prometas que la actividad cambiará cómo se siente alguien.',
    'No sugieras medicamentos, alcohol, sustancias, conductas peligrosas, gastos altos ni recursos de crisis. La app tiene una capa separada para crisis.',
    'Responde exclusivamente como JSON válido con dos strings: {"nombre":"...","descripcion":"..."}. El nombre tiene máximo 80 caracteres y la descripción máximo 320. Sin markdown ni claves adicionales.',
  ].join('\n\n');
}

function aSocialContents({ orientacion = 'plan_general', perfil = null }) {
  const contexto = {
    orientacion,
    preferenciasPropias: perfil ?? 'sin perfil; usa una idea general',
  };
  return [{ role: 'user', parts: [{ text: JSON.stringify(contexto) }] }];
}

function parseSocialSuggestion(texto) {
  const limpio = String(texto ?? '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const parsed = JSON.parse(limpio);
  return { nombre: parsed.nombre, descripcion: parsed.descripcion };
}

async function generarSugerenciaSocial({ orientacion = 'plan_general', perfil = null }) {
  const texto = await ejecutarGemini({
    systemInstruction: socialSystemPrompt(),
    contents: aSocialContents({ orientacion, perfil }),
    temperature: 0.65,
  });
  return parseSocialSuggestion(texto);
}

module.exports = {
  generarRespuesta,
  generarSugerenciaSocial,
  extraerMemoria,
  systemPrompt,
  socialSystemPrompt,
  memoriaSystemPrompt,
  senalesDeHistorial,
  pideRelato,
  aContents,
  aSocialContents,
  aMemoriaContents,
  parseSocialSuggestion,
  parseNotasMemoria,
  MAX_HISTORIAL,
};
