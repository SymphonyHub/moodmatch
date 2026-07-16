import { parsearInline, parsearMarkdown } from '../components/chat/markdown';

describe('parsearInline', () => {
  test('texto plano → un solo span normal', () => {
    expect(parsearInline('hola, ¿cómo estás?')).toEqual([
      { estilo: 'normal', texto: 'hola, ¿cómo estás?' },
    ]);
  });

  test('negrita con **', () => {
    expect(parsearInline('esto **importa** mucho')).toEqual([
      { estilo: 'normal', texto: 'esto ' },
      { estilo: 'negrita', texto: 'importa' },
      { estilo: 'normal', texto: ' mucho' },
    ]);
  });

  test('énfasis con *', () => {
    expect(parsearInline('respira *despacio* un momento')).toEqual([
      { estilo: 'normal', texto: 'respira ' },
      { estilo: 'enfasis', texto: 'despacio' },
      { estilo: 'normal', texto: ' un momento' },
    ]);
  });

  test('negrita y énfasis mezclados en la misma línea', () => {
    expect(parsearInline('**valida** primero, *sugiere* después')).toEqual([
      { estilo: 'negrita', texto: 'valida' },
      { estilo: 'normal', texto: ' primero, ' },
      { estilo: 'enfasis', texto: 'sugiere' },
      { estilo: 'normal', texto: ' después' },
    ]);
  });

  test('asterisco sin cierre queda literal', () => {
    expect(parsearInline('me dijo **hola y nada más')).toEqual([
      { estilo: 'normal', texto: 'me dijo **hola y nada más' },
    ]);
  });

  test('asteriscos de aritmética con espacios no son énfasis', () => {
    expect(parsearInline('5 * 3 * 2 = 30')).toEqual([
      { estilo: 'normal', texto: '5 * 3 * 2 = 30' },
    ]);
  });

  test('interior con espacios en los bordes queda literal', () => {
    expect(parsearInline('raro ** hola ** fin')).toEqual([
      { estilo: 'normal', texto: 'raro ** hola ** fin' },
    ]);
  });
});

describe('parsearMarkdown', () => {
  test('párrafo simple → un bloque', () => {
    expect(parsearMarkdown('todo bien')).toEqual([
      { tipo: 'parrafo', spans: [{ estilo: 'normal', texto: 'todo bien' }] },
    ]);
  });

  test('viñetas con - y con *', () => {
    expect(parsearMarkdown('- caminar\n* respirar hondo')).toEqual([
      { tipo: 'item', spans: [{ estilo: 'normal', texto: 'caminar' }] },
      { tipo: 'item', spans: [{ estilo: 'normal', texto: 'respirar hondo' }] },
    ]);
  });

  test('párrafo + lista con inline adentro', () => {
    expect(parsearMarkdown('Podrías probar:\n- **una pausa** corta')).toEqual([
      { tipo: 'parrafo', spans: [{ estilo: 'normal', texto: 'Podrías probar:' }] },
      {
        tipo: 'item',
        spans: [
          { estilo: 'negrita', texto: 'una pausa' },
          { estilo: 'normal', texto: ' corta' },
        ],
      },
    ]);
  });

  test('líneas vacías solo separan, no generan bloques', () => {
    expect(parsearMarkdown('uno\n\n\ndos')).toHaveLength(2);
  });

  test('entrada vacía o no-string → sin bloques', () => {
    expect(parsearMarkdown('')).toEqual([]);
    expect(parsearMarkdown('   ')).toEqual([]);
    expect(parsearMarkdown(undefined)).toEqual([]);
    expect(parsearMarkdown(null)).toEqual([]);
  });

  test('nunca se pierde texto: lo no soportado queda literal', () => {
    const bloques = parsearMarkdown('# título `codigo` [link](x)');
    expect(bloques).toHaveLength(1);
    const textoPlano = bloques[0].spans.map((s) => s.texto).join('');
    expect(textoPlano).toBe('# título `codigo` [link](x)');
  });
});
