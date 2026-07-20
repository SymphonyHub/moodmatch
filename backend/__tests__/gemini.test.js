// Unidad del wrapper de Gemini: construcción del system prompt y mapeo del
// historial del contrato → `contents` de la API. Sin llamadas de red.

const {
  systemPrompt,
  socialSystemPrompt,
  aContents,
  aSocialContents,
  parseSocialSuggestion,
  MAX_HISTORIAL,
} = require('../lib/gemini');
const { validarTono, MOODS_DIFICILES } = require('../lib/tonoCrisis');

const VALID_MOODS = ['FELIZ', 'TRISTE', 'ANSIOSO', 'CALMADO', 'ENOJADO', 'NEUTRO'];

describe('systemPrompt', () => {
  test.each(VALID_MOODS)('con %s: identidad, reglas, hub y formato presentes', (mood) => {
    const p = systemPrompt(mood, false);
    expect(p).toMatch(/NO eres terapeuta/);
    expect(p).toMatch(/REGLAS NO NEGOCIABLES/);
    expect(p).toMatch(/Nunca minimices/);
    expect(p).toMatch(/Nunca diagnostiques/);
    expect(p).toMatch(/medicamentos/);
    expect(p).toMatch(/positividad forzada/);
    expect(p).toMatch(/Valida PRIMERO/);
    expect(p).toMatch(/No entregues teléfonos/);
    expect(p).toMatch(/Wellness|Para mí|Con amigos/);
    expect(p).toMatch(/1 a 3 frases/);
  });

  test.each(MOODS_DIFICILES)('con %s marca la emoción como difícil', (mood) => {
    expect(systemPrompt(mood, false)).toMatch(/emoción difícil/);
  });

  test('con FELIZ no marca emoción difícil y apunta a "Con amigos"', () => {
    const p = systemPrompt('FELIZ', false);
    expect(p).not.toMatch(/emoción difícil/);
    expect(p).toMatch(/Con amigos/);
  });

  test('el bloque de cierre aparece solo con esUltimo', () => {
    expect(systemPrompt('TRISTE', false)).not.toMatch(/último intercambio/);
    expect(systemPrompt('TRISTE', true)).toMatch(/último intercambio/);
    expect(systemPrompt('TRISTE', true)).toMatch(/sugerencia de actividad/);
  });
});

describe('aContents — historial del contrato → contents de Gemini', () => {
  const turnoUsuario = (texto) => ({ autor: 'usuario', texto });
  const turnoBot = (texto) => ({ autor: 'bot', texto });

  test('mapea autores a roles y agrega el mensaje actual al final', () => {
    const contents = aContents([turnoUsuario('hola'), turnoBot('te leo')], 'sigo aquí');
    expect(contents).toEqual([
      { role: 'user', parts: [{ text: 'hola' }] },
      { role: 'model', parts: [{ text: 'te leo' }] },
      { role: 'user', parts: [{ text: 'sigo aquí' }] },
    ]);
  });

  test('trunca conservando los últimos 8 turnos', () => {
    const historial = [];
    for (let i = 0; i < 10; i++) {
      historial.push(turnoUsuario(`u${i}`), turnoBot(`b${i}`));
    }
    const contents = aContents(historial, 'actual');
    expect(contents.length).toBeLessThanOrEqual(MAX_HISTORIAL + 1);
    // Se conserva el final de la conversación, no el principio:
    expect(contents.at(-2).parts[0].text).toBe('b9');
    expect(contents.at(-1)).toEqual({ role: 'user', parts: [{ text: 'actual' }] });
  });

  test('descarta turnos bot que queden al inicio de la ventana (debe abrir con user)', () => {
    const contents = aContents([turnoBot('hola, ¿cómo estás?'), turnoUsuario('😢 Triste')], 'mal día');
    expect(contents[0].role).toBe('user');
    expect(contents[0].parts[0].text).toBe('😢 Triste');
  });

  test('sin historial: solo el mensaje actual', () => {
    expect(aContents([], 'hola')).toEqual([{ role: 'user', parts: [{ text: 'hola' }] }]);
  });
});

describe('coherencia prompt ↔ validador', () => {
  test('las frases que el prompt prohíbe son las que el validador captura', () => {
    // Si el modelo ignora la regla 4, el validador la atrapa en moods difíciles.
    expect(validarTono('Anímate, mira el lado bueno.', 'TRISTE')).toBe(false);
    expect(validarTono('No es para tanto.', 'FELIZ')).toBe(false);
  });
});

describe('contrato Gemini para sugerencias sociales', () => {
  test('el prompt limita datos, inferencias, tono y formato', () => {
    const prompt = socialSystemPrompt();
    expect(prompt).toMatch(/Solo puedes usar la orientación de tono/);
    expect(prompt).toMatch(/nunca infieras datos/);
    expect(prompt).toMatch(/no fuerces positividad/);
    expect(prompt).toMatch(/JSON válido/);
    expect(prompt).toMatch(/capa separada para crisis/);
  });

  test('el contexto contiene solo moods y perfil propio, con fallback genérico', () => {
    const conPerfil = aSocialContents({
      orientacion: 'compartir_momento_agradable',
      perfil: '{"planes":["cine"]}',
    });
    const data = JSON.parse(conPerfil[0].parts[0].text);
    expect(data).toEqual({
      orientacion: 'compartir_momento_agradable',
      preferenciasPropias: '{"planes":["cine"]}',
    });
    expect(data).not.toHaveProperty('nombres');
    expect(data).not.toHaveProperty('notas');
    expect(data).not.toHaveProperty('animosVisibles');

    const generico = JSON.parse(aSocialContents({})[0].parts[0].text);
    expect(generico.preferenciasPropias).toMatch(/sin perfil/);
  });

  test('parsea JSON plano o fenced y deja el shape mínimo', () => {
    const esperado = { nombre: 'Cocinen juntos', descripcion: 'Elijan una receta.' };
    expect(parseSocialSuggestion(JSON.stringify(esperado))).toEqual(esperado);
    const fenced = `\`\`\`json\n${JSON.stringify({ ...esperado, extra: true })}\n\`\`\``;
    expect(parseSocialSuggestion(fenced)).toEqual(esperado);
  });

  test('JSON inválido lanza para que el route use plantilla', () => {
    expect(() => parseSocialSuggestion('una idea sin JSON')).toThrow();
  });
});
