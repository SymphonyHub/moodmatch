import { ENCABEZADOS, RUTA_WELLNESS, tiempoRelativo } from '../features/wellness/paraMi';
import { normalizar } from '../features/emociones/crisis';
import { MOOD_KEYS } from '../theme/tokens';

// Mismas listas que guiones.test.js: las reglas de tono rigen también fuera
// del chat, en cualquier texto que acompañe una emoción registrada.
const LISTA_NEGRA_UNIVERSAL = [
  'no es para tanto',
  'podria ser peor',
  'hay gente peor',
  'no te preocupes',
  'exagera',
  'depresion',
  'trastorno',
  'diagnos',
  'deberias sentirte',
];

const LISTA_NEGRA_POSITIVIDAD = [
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

const MOODS_DIFICILES = ['TRISTE', 'ANSIOSO', 'ENOJADO'];

describe('ENCABEZADOS de Para mí', () => {
  test('cubre exactamente las 6 emociones del contrato', () => {
    expect(Object.keys(ENCABEZADOS).sort()).toEqual([...MOOD_KEYS].sort());
  });

  test('ningún encabezado minimiza ni diagnostica', () => {
    Object.values(ENCABEZADOS).forEach((texto) => {
      const n = normalizar(texto);
      LISTA_NEGRA_UNIVERSAL.forEach((prohibida) => {
        expect(n).not.toContain(prohibida);
      });
    });
  });

  MOODS_DIFICILES.forEach((mood) => {
    test(`${mood}: sin positividad forzada`, () => {
      const n = normalizar(ENCABEZADOS[mood]);
      LISTA_NEGRA_POSITIVIDAD.forEach((prohibida) => {
        expect(n).not.toContain(prohibida);
      });
    });
  });
});

describe('RUTA_WELLNESS', () => {
  test('es una ruta absoluta de expo-router', () => {
    expect(RUTA_WELLNESS.startsWith('/')).toBe(true);
  });
});

describe('tiempoRelativo', () => {
  const ahora = new Date('2026-07-15T12:00:00.000Z').getTime();
  const casos = [
    ['2026-07-15T11:59:40.000Z', 'recién'],
    ['2026-07-15T11:35:00.000Z', 'hace 25 min'],
    ['2026-07-15T09:00:00.000Z', 'hace 3 h'],
    ['2026-07-14T10:00:00.000Z', 'ayer'],
    ['2026-07-10T10:00:00.000Z', 'el 10 de julio'],
    ['2026-01-02T10:00:00.000Z', 'el 2 de enero'],
  ];

  test.each(casos)('%s → "%s"', (iso, esperado) => {
    expect(tiempoRelativo(iso, ahora)).toBe(esperado);
  });

  test('fecha inválida o futura devuelve cadena vacía', () => {
    expect(tiempoRelativo('no-es-fecha', ahora)).toBe('');
    expect(tiempoRelativo('2026-07-15T13:00:00.000Z', ahora)).toBe('');
  });
});
