// Reglas de tono del chat de emociones, como datos compartibles. Las consume
// guiones.test.js (verificación mecánica de los guiones por plantilla) y son
// la referencia normativa del validador post-respuesta del endpoint de IA
// (CONTRATO-GEMINI.md): una respuesta de Gemini que contenga cualquiera de
// estas frases (comparadas con normalizar() de crisis.js) se descarta y se
// responde por plantilla. Frases sin tildes porque se comparan normalizadas.

export const MOODS_DIFICILES = ['TRISTE', 'ANSIOSO', 'ENOJADO'];

// Prohibidas en TODO texto que muestre el bot (minimización y diagnóstico).
export const LISTA_NEGRA_UNIVERSAL = [
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

// Positividad forzada: prohibida en las emociones difíciles.
export const LISTA_NEGRA_POSITIVIDAD = [
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
