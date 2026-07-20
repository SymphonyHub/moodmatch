const {
  PLANTILLAS_SOCIALES,
  contextoPerfilPersonalidad,
  sanearMoodsVisibles,
  orientacionSocial,
  completarSugerenciaSocial,
  sugerenciaSocialPlantilla,
  validarSugerenciaSocial,
} = require('../lib/socialSuggestions');

describe('contexto social y privacidad', () => {
  test('perfil ausente o vacío conserva el fallback genérico', () => {
    expect(contextoPerfilPersonalidad(null)).toBeNull();
    expect(contextoPerfilPersonalidad({})).toBeNull();
    expect(contextoPerfilPersonalidad([])).toBeNull();
  });

  test('un perfil presente se serializa en el único punto de integración', () => {
    const respuestas = {
      compania: 'uno_a_uno',
      ritmo: 'tranquilo',
      entorno: 'casa',
      actividad: 'entretenimiento',
      recarga: 'musica',
      novedad: 'conocido',
    };
    expect(contextoPerfilPersonalidad({
      version: 1,
      completadoEn: '2026-07-20T12:00:00.000Z',
      respuestas,
      datoExtra: 'no debe salir',
    })).toBe(JSON.stringify(respuestas));
  });

  test('un shape desconocido no expone campos arbitrarios', () => {
    expect(contextoPerfilPersonalidad({ intereses: ['cine'], email: 'persona@example.com' })).toBeNull();
    expect(contextoPerfilPersonalidad({ respuestas: { compania: 'otro' } })).toBeNull();
  });

  test('solo conserva los seis enums públicos de mood', () => {
    expect(sanearMoodsVisibles(['FELIZ', 'PRIVADO', null, 'ANSIOSO'])).toEqual([
      'FELIZ',
      'ANSIOSO',
    ]);
  });

  test('abstrae moods a una orientación sin categorías ni conteos', () => {
    expect(orientacionSocial(['TRISTE', 'TRISTE', 'FELIZ'])).toBe('acompanar_sin_presion');
    expect(orientacionSocial(['FELIZ', 'CALMADO'])).toBe('compartir_momento_agradable');
    expect(orientacionSocial(['NEUTRO'])).toBe('plan_general');
  });
});

describe('fallback y validación social', () => {
  test('todos los fallbacks tienen shape de Activity, id estable y tono válido', () => {
    for (const moods of [['TRISTE'], ['FELIZ'], [], ['NEUTRO']]) {
      const a = sugerenciaSocialPlantilla(moods);
      expect(a).toEqual(expect.objectContaining({
        id: expect.stringMatching(/^social-/),
        nombre: expect.any(String),
        descripcion: expect.any(String),
        categoria: 'social',
      }));
      expect(validarSugerenciaSocial(a)).toBe(true);
      expect(sugerenciaSocialPlantilla(moods).id).toBe(a.id);
    }
    expect(Object.keys(PLANTILLAS_SOCIALES)).toHaveLength(3);
  });

  test('normaliza una sugerencia segura y genera id por contenido', () => {
    const completa = completarSugerenciaSocial({
      nombre: '  Cocinen juntos  ',
      descripcion: '  Elijan una receta sencilla entre ambos.  ',
    });
    expect(completa.nombre).toBe('Cocinen juntos');
    expect(completa.descripcion).toBe('Elijan una receta sencilla entre ambos.');
    expect(completa.categoria).toBe('social');
  });

  test.each([
    [{ nombre: '', descripcion: 'Algo' }],
    [{ nombre: 'Idea', descripcion: '' }],
    [{ nombre: 'Idea', descripcion: 'Anímate y sonríe, todo va a estar bien.' }],
    [{ nombre: 'Idea', descripcion: 'Llama a la línea de ayuda 12345.' }],
    [{ nombre: 'Idea', descripcion: 'Hablen sobre cómo quitarme la vida.' }],
    [{ nombre: 'Idea', descripcion: 'Compren alcohol y salgan a conducir.' }],
    [{ nombre: 'Idea', descripcion: 'Tomen pisco y después salgan a manejar.' }],
    [{ nombre: 'Idea', descripcion: 'Prueben ibuprofeno antes del paseo.' }],
    [{ nombre: 'Idea', descripcion: 'Hagan un reto extremo sin casco.' }],
    [{ nombre: 'Idea', descripcion: 'Naden en mar abierto durante la noche.' }],
    [{ nombre: 'Idea', descripcion: 'Vayan a un restaurante costoso de lujo.' }],
    [{ nombre: 'Idea', descripcion: 'Compren vuelos en primera clase.' }],
    [{ nombre: 'Idea', descripcion: 'Tu amigo triste necesita esta salida.' }],
  ])('rechaza shape o tono inseguro: %j', (sugerencia) => {
    expect(validarSugerenciaSocial(sugerencia)).toBe(false);
  });
});
