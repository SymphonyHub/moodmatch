// Wrapper del SDK oficial de Google Gen AI (@google/genai) para el chat de
// emociones. Expone generarRespuesta(); si algo falla (key ausente, red,
// timeout, respuesta vacía) LANZA — el route decide el fallback por plantilla,
// nunca un 5xx (CONTRATO-GEMINI.md).

const { GoogleGenAI } = require('@google/genai');

// Alias estable de Google (sigue al Flash-Lite vigente): evita 404 por
// modelos retirados (gemini-2.5-flash ya no acepta usuarios nuevos) y es el
// único de la familia con latencia de chat (~0,5 s medido; gemini-flash-latest
// tardó ~9 s, más que el timeout). Sobreescribible con GEMINI_MODEL.
const MODELO = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const TIMEOUT_MS = 8000;
const MAX_HISTORIAL = 8; // regla de brevedad del contrato: últimos 8 turnos

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

function systemPrompt(mood, esUltimo) {
  const partes = [
    // 1. Identidad
    'Eres el acompañante de MoodMatch, una app de bienestar emocional. ' +
      'Acompañas breve y cálidamente, en español sencillo (Chile, trato de tú). ' +
      'NO eres terapeuta ni profesional de la salud, y nunca lo simulas ni lo insinúas.',

    // 2. Contexto
    `La persona registró que hoy se siente ${MOOD_LABELS[mood]}.` +
      (MOODS_DIFICILES.includes(mood)
        ? ' Es una emoción difícil: acompáñala sin apurarla a sentirse mejor.'
        : ''),

    // 3. Reglas no negociables
    'REGLAS NO NEGOCIABLES:\n' +
      '1. Nunca minimices lo que siente. Prohibido decir "no es para tanto", "podría ser peor", "hay gente peor", "no te preocupes" o llamarlo exageración.\n' +
      '2. Nunca diagnostiques ni sugieras una condición de salud mental. No nombres depresión, trastornos ni diagnósticos.\n' +
      '3. Nunca sugieras medicamentos, suplementos ni remedios de ningún tipo.\n' +
      '4. Nunca uses positividad forzada frente a emociones difíciles. Prohibido "anímate", "alégrate", "sonríe", "piensa positivo", "mira el lado bueno", "todo pasa por algo", "sé feliz", "cálmate", "relájate", "no estés triste", "todo va a estar bien".\n' +
      '5. Valida PRIMERO lo que la persona siente; solo después, y si cabe, sugiere algo.\n' +
      '6. No entregues teléfonos, líneas de ayuda ni recursos de crisis: la app tiene una capa dedicada a eso.\n' +
      '7. No des consejos médicos ni actúes como terapia; eres compañía breve, no tratamiento.',

    // 4. Wellness Hub
    HUB_POR_MOOD[mood],

    // 5. Formato
    'FORMATO: responde en 1 a 3 frases cortas, texto plano sin markdown ni listas, máximo UNA pregunta, a lo sumo un emoji suave.',
  ];

  if (esUltimo) {
    // 6. Cierre
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

async function generarRespuesta({ mood, mensaje, historial = [], esUltimo = false }) {
  return ejecutarGemini({
    systemInstruction: systemPrompt(mood, esUltimo),
    contents: aContents(historial, mensaje),
  });
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
  systemPrompt,
  socialSystemPrompt,
  aContents,
  aSocialContents,
  parseSocialSuggestion,
  MAX_HISTORIAL,
};
