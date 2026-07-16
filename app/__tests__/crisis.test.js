import { detectarCrisis, normalizar, MENSAJE_CRISIS } from '../features/emociones/crisis';

describe('normalizar', () => {
  test('baja a minúsculas y quita tildes y diéresis', () => {
    expect(normalizar('Canción Ñoña Über')).toBe('cancion nona uber');
  });

  test('tolera null/undefined/vacío', () => {
    expect(normalizar(null)).toBe('');
    expect(normalizar(undefined)).toBe('');
    expect(normalizar('')).toBe('');
  });
});

describe('detectarCrisis — positivos (con y sin tildes/mayúsculas)', () => {
  const positivos = [
    'he pensado en suicidarme',
    'me quiero matar',
    'quiero matarme',
    'quiero quitarme la vida',
    'QUIERO QUITARME LA VIDA',
    'quiero morir',
    'me quiero morir',
    'quisiera morirme',
    'no quiero seguir viviendo',
    'no quiero vivir',
    'no vale la pena seguir viviendo',
    'quiero hacerme daño',
    'quiero hacerme dano',
    'me estoy cortando',
    'pienso en la autolesión',
    'quiero acabar con todo',
    'quiero terminar con todo',
    // Patrones agregados en Fase 8 (escudo previo a la IA)
    'no le veo sentido a la vida',
    'no le encuentro sentido a vivir',
    'no le veo sentido a seguir',
    'mejor estaría muerto',
    'estarían mejor sin mí',
    'quiero desaparecer',
  ];

  positivos.forEach((frase) => {
    test(`detecta: "${frase}"`, () => {
      expect(detectarCrisis(frase)).toBe(true);
    });
  });
});

describe('detectarCrisis — negativos (uso normal del día a día)', () => {
  const negativos = [
    'estoy triste',
    'quiero llorar todo el día',
    'estoy muerto de cansancio',
    'me muero de risa',
    'me muero de ganas de verte',
    'odio todo esto',
    'no doy más con la u',
    'qué lata todo',
    'hoy fue un día horrible',
    'me carga mi trabajo',
    'estoy chato de todo',
    'me corté el pelo', // "corté" ≠ "cortarme"
    // Guardas de los patrones de Fase 8
    'no le veo sentido a esta tarea',
    'no le encuentro sentido al ejercicio',
    'desaparecieron mis llaves',
    'mejor me quedo en la casa',
    '',
  ];

  negativos.forEach((frase) => {
    test(`NO detecta: "${frase}"`, () => {
      expect(detectarCrisis(frase)).toBe(false);
    });
  });
});

describe('MENSAJE_CRISIS', () => {
  test('incluye los recursos de ayuda de Chile', () => {
    expect(MENSAJE_CRISIS).toContain('*4141');
    expect(MENSAJE_CRISIS).toContain('600 360 7777');
  });

  test('no diagnostica ni alarma', () => {
    const n = normalizar(MENSAJE_CRISIS);
    ['depresion', 'trastorno', 'diagnos', 'emergencia', 'peligro'].forEach((palabra) => {
      expect(n).not.toContain(palabra);
    });
  });
});
