// Lógica pura del widget de respiración guiada (Fase 10, Agente B). La UI
// (WidgetInteractivo.jsx) se prueba visualmente en dispositivo; aquí se fija el
// contrato de fases, el ciclo y —como en guiones.test.js— el tono de las intros.

import {
  FASES,
  CICLO_MS,
  ESCALA_MIN,
  ESCALA_MAX,
  indiceFaseEn,
  faseEn,
  introDe,
  INTRO_POR_MOOD,
} from '../features/wellness/respiracion';
import { MOOD_KEYS } from '../theme/tokens';
import { normalizar } from '../features/emociones/crisis';
import {
  MOODS_DIFICILES,
  LISTA_NEGRA_UNIVERSAL,
  LISTA_NEGRA_POSITIVIDAD,
} from '../features/emociones/tono';

describe('estructura de las fases', () => {
  test('son 4 fases en orden inhalar / sostener / exhalar / sostener', () => {
    expect(FASES.map((f) => f.id)).toEqual([
      'inhalar',
      'sostenerLleno',
      'exhalar',
      'sostenerVacio',
    ]);
  });

  test('cada fase dura 4 s (ciclo 4-4-4-4) y el ciclo suma 16 s', () => {
    FASES.forEach((f) => expect(f.dur).toBe(4000));
    expect(CICLO_MS).toBe(16000);
    expect(CICLO_MS).toBe(FASES.reduce((t, f) => t + f.dur, 0));
  });

  test('inhalar y sostener lleno tienden a la escala alta; exhalar y vacío a la baja', () => {
    expect(FASES[0].escala).toBe('alta');
    expect(FASES[1].escala).toBe('alta');
    expect(FASES[2].escala).toBe('baja');
    expect(FASES[3].escala).toBe('baja');
  });

  test('el rango de escala es contraído → expandido y válido', () => {
    expect(ESCALA_MIN).toBeGreaterThan(0);
    expect(ESCALA_MAX).toBeGreaterThan(ESCALA_MIN);
    expect(ESCALA_MAX).toBeLessThanOrEqual(1);
  });
});

describe('indiceFaseEn / faseEn', () => {
  test('cae en la fase correcta dentro de cada tramo de 4 s', () => {
    expect(indiceFaseEn(0)).toBe(0);
    expect(indiceFaseEn(3999)).toBe(0);
    expect(indiceFaseEn(4000)).toBe(1);
    expect(indiceFaseEn(7999)).toBe(1);
    expect(indiceFaseEn(8000)).toBe(2);
    expect(indiceFaseEn(11999)).toBe(2);
    expect(indiceFaseEn(12000)).toBe(3);
    expect(indiceFaseEn(15999)).toBe(3);
  });

  test('envuelve el ciclo: a los 16 s vuelve a inhalar', () => {
    expect(indiceFaseEn(CICLO_MS)).toBe(0);
    expect(indiceFaseEn(CICLO_MS + 4000)).toBe(1);
    expect(indiceFaseEn(3 * CICLO_MS + 8500)).toBe(2);
  });

  test('tolera ms negativos (envoltura por módulo)', () => {
    expect(indiceFaseEn(-1)).toBe(3);
    expect(faseEn(-1).id).toBe('sostenerVacio');
  });

  test('faseEn devuelve el objeto de fase con su etiqueta', () => {
    expect(faseEn(0).label).toBe('Inhala');
    expect(faseEn(8000).label).toBe('Exhala');
    expect(faseEn(4000).label).toBe('Mantén');
  });
});

describe('introDe', () => {
  test('cubre los 6 moods con una línea propia', () => {
    MOOD_KEYS.forEach((mood) => {
      expect(typeof INTRO_POR_MOOD[mood]).toBe('string');
      expect(INTRO_POR_MOOD[mood].length).toBeGreaterThan(0);
      expect(introDe(mood)).toBe(INTRO_POR_MOOD[mood]);
    });
  });

  test('mood desconocido o ausente cae a un fallback estable no vacío', () => {
    const fallback = introDe(undefined);
    expect(typeof fallback).toBe('string');
    expect(fallback.length).toBeGreaterThan(0);
    // Cualquier mood fuera de la lista devuelve el mismo fallback.
    expect(introDe('EUFORICO')).toBe(fallback);
    expect(introDe('__desconocido__')).toBe(fallback);
    expect(introDe(null)).toBe(fallback);
  });
});

describe('tono de las intros (verificación mecánica, como guiones.test.js)', () => {
  test('ninguna intro minimiza ni diagnostica', () => {
    Object.values(INTRO_POR_MOOD).forEach((texto) => {
      const n = normalizar(texto);
      LISTA_NEGRA_UNIVERSAL.forEach((prohibida) => {
        expect(n).not.toContain(prohibida);
      });
    });
  });

  MOODS_DIFICILES.forEach((mood) => {
    test(`${mood}: sin positividad forzada`, () => {
      const n = normalizar(INTRO_POR_MOOD[mood]);
      LISTA_NEGRA_POSITIVIDAD.forEach((prohibida) => {
        expect(n).not.toContain(prohibida);
      });
    });
  });
});
