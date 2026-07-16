// Fixtures de test con los shapes EXACTOS de CONTRATO-GEMINI.md (Fase 8).
// Único lugar a actualizar si el contrato de POST /api/chat/respond cambia.
// Vive fuera de __tests__/ a propósito: el testMatch por defecto de Jest
// recoge todo *.js dentro de __tests__/ como suite y un helper fallaría por
// "no contiene tests".

// 200 con respuesta del modelo (caso feliz).
export const respuestaGemini = (extras = {}) => ({
  respuesta: 'Gracias por contarme. ¿Qué crees que influyó en que te sientas así hoy?',
  fuente: 'gemini',
  terminar: false,
  ...extras,
});

// 200 por plantilla: fallback TRANSPARENTE del backend (Gemini caído,
// rate-limit o tono inválido). NUNCA es un 5xx y NO debe reintentarse.
export const respuestaPlantilla = (extras = {}) => ({
  respuesta: 'Te escucho. Tómate el tiempo que necesites para contarme.',
  fuente: 'plantilla',
  terminar: false,
  ...extras,
});

// 200 con cierre de conversación (MAX_INTERCAMBIOS alcanzado): el frontend
// pasa al registro del MoodEntry.
export const respuestaTerminar = (fuente = 'gemini') => ({
  respuesta: 'Gracias por este ratito. Tengo una sugerencia para ti.',
  fuente,
  terminar: true,
});

// 400: mood fuera de MOOD_KEYS o mensaje vacío. Único error de negocio
// (además del 401 de requireAuth).
export const error400 = () => ({ error: 'mood inválido o mensaje vacío' });

// Rechazo de fetch en React Native (red caída): esto SÍ dispara reintento y,
// agotados los intentos, el frontend cae a la plantilla local del guion.
export const redCaida = () => new TypeError('Network request failed');
