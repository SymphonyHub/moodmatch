// Unidad del wrapper de Gemini: construcción del system prompt y mapeo del
// historial del contrato → `contents` de la API. Sin llamadas de red.

const {
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
} = require('../lib/gemini');
const { validarTono, MOODS_DIFICILES } = require('../lib/tonoCrisis');
const { memoriaVacia, sanearMemoria, fusionarNotas } = require('../lib/memoriaChat');

const VALID_MOODS = ['FELIZ', 'TRISTE', 'ANSIOSO', 'CALMADO', 'ENOJADO', 'NEUTRO'];

// El hub solo se ofrece si no se mencionó antes: los tests que lo esperan
// tienen que declarar explícitamente que la conversación recién parte.
const nuevaConversacion = { hubMencionado: false };

describe('systemPrompt — reglas de seguridad (invariantes desde Fase 8)', () => {
  test.each(VALID_MOODS)('con %s: identidad, reglas, hub y formato presentes', (mood) => {
    const p = systemPrompt(mood, nuevaConversacion);
    expect(p).toMatch(/NO eres terapeuta/);
    expect(p).toMatch(/REGLAS NO NEGOCIABLES/);
    expect(p).toMatch(/Nunca minimices/);
    expect(p).toMatch(/Nunca diagnostiques/);
    expect(p).toMatch(/medicamentos/);
    expect(p).toMatch(/positividad forzada/);
    expect(p).toMatch(/Valida PRIMERO/);
    expect(p).toMatch(/No entregues teléfonos/);
    expect(p).toMatch(/Wellness|Para mí|Con amigos/);
    expect(p).toMatch(/1 a 4 frases/);
  });

  test.each(VALID_MOODS)(
    'con %s las 7 reglas siguen ahí aunque la conversación traiga memoria, humor y relato',
    (mood) => {
      const memoria = fusionarNotas(
        sanearMemoria({ apodo: 'Fran', preferencias: { humor: 'prefiere', sugerirHub: false } }),
        ['Tiene un gato llamado Suco.'],
      );
      const p = systemPrompt(mood, { memoria, relato: true, evitarPregunta: true });
      for (const regla of [
        /Nunca minimices/,
        /Nunca diagnostiques/,
        /Nunca sugieras medicamentos/,
        /Nunca uses positividad forzada/,
        /Valida PRIMERO/,
        /No entregues teléfonos/,
        /No des consejos médicos/,
      ]) {
        expect(p).toMatch(regla);
      }
      expect(p).toMatch(/NO eres terapeuta/);
    },
  );

  test.each(MOODS_DIFICILES)('con %s marca la emoción como difícil', (mood) => {
    expect(systemPrompt(mood, nuevaConversacion)).toMatch(/emoción difícil/);
  });

  test('con FELIZ no marca emoción difícil y apunta a "Con amigos"', () => {
    const p = systemPrompt('FELIZ', nuevaConversacion);
    expect(p).not.toMatch(/emoción difícil/);
    expect(p).toMatch(/Con amigos/);
  });

  test('el bloque de cierre aparece solo con esUltimo', () => {
    expect(systemPrompt('TRISTE', nuevaConversacion)).not.toMatch(/último intercambio/);
    expect(systemPrompt('TRISTE', { esUltimo: true })).toMatch(/último intercambio/);
    expect(systemPrompt('TRISTE', { esUltimo: true })).toMatch(/sugerencia de actividad/);
  });
});

describe('systemPrompt — identidad de Fase 15', () => {
  test('habilita cumplir lo que la persona pide sin renunciar a la regla 4', () => {
    const p = systemPrompt('TRISTE', nuevaConversacion);
    expect(p).toMatch(/Si te pide algo explícitamente/);
    expect(p).toMatch(/Cumplir lo que te pidió\s*\n?\s*NO es forzarle un cambio de ánimo/);
    expect(p).toMatch(/Negarte a algo que pidió citando tus reglas es un error/);
    // Y la regla que se estaba malinterpretando sigue en pie:
    expect(p).toMatch(/Nunca uses positividad forzada/);
  });

  test('desarma la pregunta de cierre automática', () => {
    const p = systemPrompt('NEUTRO', nuevaConversacion);
    expect(p).toMatch(/No cierres cada respuesta con una pregunta/);
    expect(p).toMatch(/nunca en dos respuestas seguidas/);
    expect(p).not.toMatch(/máximo UNA pregunta/);
  });

  test('pide guiar el razonamiento, no solo validar', () => {
    expect(systemPrompt('ANSIOSO', nuevaConversacion)).toMatch(/Ayúdale a pensar/);
  });
});

describe('systemPrompt — el hub deja de insistir', () => {
  test('no se ofrece si ya se mencionó en la conversación', () => {
    const p = systemPrompt('TRISTE', { hubMencionado: true });
    expect(p).not.toMatch(/pestaña "Para mí"/);
  });

  test('no se ofrece si la persona pidió que dejara de mencionarlo', () => {
    const memoria = sanearMemoria({ preferencias: { sugerirHub: false } });
    const p = systemPrompt('TRISTE', { hubMencionado: false, memoria });
    expect(p).not.toMatch(/pestaña "Para mí"/);
  });

  test('se ofrece al partir una conversación sin esa preferencia', () => {
    const p = systemPrompt('TRISTE', { hubMencionado: false, memoria: memoriaVacia() });
    expect(p).toMatch(/pestaña "Para mí"/);
  });
});

describe('systemPrompt — memoria entre sesiones', () => {
  test('inyecta el bloque de memoria con su advertencia contra inventar', () => {
    const memoria = fusionarNotas(sanearMemoria({ apodo: 'Fran' }), [
      'Tiene un gato llamado Suco.',
    ]);
    const p = systemPrompt('NEUTRO', { memoria });
    expect(p).toMatch(/LO QUE YA SABES DE ESTA PERSONA/);
    expect(p).toMatch(/Tiene un gato llamado Suco\./);
    expect(p).toMatch(/no inventes ni deduzcas nada más/);
  });

  test('sin memoria no aparece el encabezado', () => {
    expect(systemPrompt('NEUTRO', { memoria: memoriaVacia() })).not.toMatch(/LO QUE YA SABES/);
    expect(systemPrompt('NEUTRO')).not.toMatch(/LO QUE YA SABES/);
  });

  test('la preferencia de humor viaja como instrucción, en ambas direcciones', () => {
    const prefiere = sanearMemoria({ preferencias: { humor: 'prefiere' } });
    const evita = sanearMemoria({ preferencias: { humor: 'evita' } });
    expect(systemPrompt('FELIZ', { memoria: prefiere })).toMatch(/el humor con ella es bienvenido/);
    expect(systemPrompt('FELIZ', { memoria: evita })).toMatch(/no le hicieras bromas/);
    expect(systemPrompt('FELIZ', { memoria: memoriaVacia() })).not.toMatch(/bromas|humor/);
  });
});

describe('systemPrompt — formato según lo que se pidió', () => {
  test('con relato da espacio y no obliga a volver al ánimo', () => {
    const p = systemPrompt('TRISTE', { relato: true });
    expect(p).toMatch(/hasta\s*\n?\s*unas 8 frases/);
    expect(p).not.toMatch(/1 a 4 frases/);
  });

  test('la señal de evitarPregunta es una orden, no una sugerencia', () => {
    expect(systemPrompt('TRISTE', { evitarPregunta: true })).toMatch(/Esta vez NO\s*\n?\s*preguntes/);
    expect(systemPrompt('TRISTE', {})).not.toMatch(/Esta vez NO/);
  });
});

describe('senalesDeHistorial — se leen del historial, no se le preguntan al modelo', () => {
  const bot = (texto) => ({ autor: 'bot', texto });
  const usuario = (texto) => ({ autor: 'usuario', texto });

  test('detecta que el hub ya se mencionó, con o sin tildes', () => {
    expect(senalesDeHistorial([bot('Puedes ver la pestaña "Para mí"')]).hubMencionado).toBe(true);
    expect(senalesDeHistorial([bot('en Con amigos puedes compartirlo')]).hubMencionado).toBe(true);
    expect(senalesDeHistorial([bot('Te leo, cuéntame más')]).hubMencionado).toBe(false);
    // Que lo diga el usuario no cuenta como que el bot ya insistió:
    expect(senalesDeHistorial([usuario('la pestaña Para mí me gustó')]).hubMencionado).toBe(false);
  });

  test('marca evitarPregunta tras dos respuestas seguidas terminadas en pregunta', () => {
    expect(senalesDeHistorial([bot('¿Cómo estás?'), bot('¿Y eso?')]).evitarPregunta).toBe(true);
    expect(senalesDeHistorial([bot('¿Cómo estás?'), bot('Te leo.')]).evitarPregunta).toBe(false);
    expect(senalesDeHistorial([bot('¿Cómo estás?')]).evitarPregunta).toBe(false);
    expect(senalesDeHistorial([]).evitarPregunta).toBe(false);
  });

  test('solo miran los dos últimos turnos del bot, con el usuario intercalado', () => {
    const historial = [
      bot('Te leo.'),
      usuario('ya'),
      bot('¿Qué pasó?'),
      usuario('nada'),
      bot('¿Y cómo lo llevas?'),
    ];
    expect(senalesDeHistorial(historial).evitarPregunta).toBe(true);
  });

  test('una pregunta con comillas o paréntesis de cierre también cuenta', () => {
    expect(senalesDeHistorial([bot('¿Vamos? '), bot('¿Te tinca?)')]).evitarPregunta).toBe(true);
  });
});

describe('pideRelato — petición explícita de algo más largo', () => {
  test.each([
    'cuéntame un chiste',
    'cuentame una historia',
    'dime algo gracioso',
    'échate un cuento',
    'quiero una anécdota',
    'hazme reír',
    'tírame una talla',
    'distráeme un rato',
  ])('reconoce: %s', (mensaje) => {
    expect(pideRelato(mensaje)).toBe(true);
  });

  test.each([
    'hoy fue un día pesado',
    'me contaron una historia rara en el trabajo',
    'no quiero hablar de eso',
    'estoy cansado',
  ])('NO se activa con: %s', (mensaje) => {
    expect(pideRelato(mensaje)).toBe(false);
  });
});

describe('extractor de memoria — contrato del prompt', () => {
  test('prohíbe inferir, prohíbe crisis y fija el formato JSON', () => {
    const p = memoriaSystemPrompt();
    expect(p).toMatch(/Prohibido inferir/);
    expect(p).toMatch(/Nada de causas, diagnósticos/);
    expect(p).toMatch(/Prohibido registrar cualquier contenido sobre suicidio, autolesión o daño/);
    expect(p).toMatch(/Si no lo dijo, no existe/);
    expect(p).toMatch(/JSON válido/);
    expect(p).toMatch(/140 caracteres/);
  });

  test('el contexto lleva la conversación y las notas actuales, nada más', () => {
    const memoria = fusionarNotas(memoriaVacia(), ['Tiene un gato llamado Suco.']);
    const contents = aMemoriaContents({
      historial: [{ autor: 'usuario', texto: 'hola' }, { autor: 'bot', texto: 'te leo' }],
      mensaje: 'chao',
      memoria,
    });
    const data = JSON.parse(contents[0].parts[0].text);

    expect(Object.keys(data).sort()).toEqual(['conversacion', 'memoriaActual']);
    expect(data.memoriaActual).toEqual(['Tiene un gato llamado Suco.']);
    expect(data.conversacion).toBe('Persona: hola\nBot: te leo\nPersona: chao');
  });

  test('parsea JSON plano o fenced y descarta lo que no sean strings', () => {
    expect(parseNotasMemoria('{"notas":["a","b"]}')).toEqual(['a', 'b']);
    expect(parseNotasMemoria('```json\n{"notas":["a",7,null]}\n```')).toEqual(['a']);
    expect(parseNotasMemoria('{"notas":[]}')).toEqual([]);
    expect(parseNotasMemoria('{"otra":"cosa"}')).toEqual([]);
  });

  test('JSON inválido lanza para que el route lo trate como fallo del extractor', () => {
    expect(() => parseNotasMemoria('no soy json')).toThrow();
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

  test('trunca conservando los últimos MAX_HISTORIAL turnos', () => {
    const historial = [];
    for (let i = 0; i < MAX_HISTORIAL; i++) {
      historial.push(turnoUsuario(`u${i}`), turnoBot(`b${i}`));
    }
    const contents = aContents(historial, 'actual');
    expect(contents.length).toBeLessThanOrEqual(MAX_HISTORIAL + 1);
    // Se conserva el final de la conversación, no el principio:
    expect(contents.at(-2).parts[0].text).toBe(`b${MAX_HISTORIAL - 1}`);
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
