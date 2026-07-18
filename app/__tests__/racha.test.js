import { rachaDeDias, textoRacha, etiquetaDias } from '../features/wellness/racha';
import { normalizar } from '../features/emociones/crisis';

// Mediodía para que restar días no cruce medianoche por husos horarios
// (mismo criterio que historial.test.js).
const AHORA = new Date('2026-07-15T12:00:00.000Z').getTime();
const DIA_MS = 24 * 60 * 60 * 1000;

// entry a `dias` días (y `horas` extra) antes de AHORA
const hace = (dias, horas = 0) => ({
  id: Math.floor(Math.random() * 100000),
  moodType: 'CALMADO',
  createdAt: new Date(AHORA - dias * DIA_MS - horas * 60 * 60 * 1000).toISOString(),
});

describe('rachaDeDias', () => {
  test('sin registros → 0', () => {
    expect(rachaDeDias([], AHORA)).toBe(0);
    expect(rachaDeDias(null, AHORA)).toBe(0);
    expect(rachaDeDias(undefined, AHORA)).toBe(0);
  });

  test('solo hoy → 1', () => {
    expect(rachaDeDias([hace(0)], AHORA)).toBe(1);
  });

  test('hoy, ayer y antier → 3', () => {
    expect(rachaDeDias([hace(0), hace(1), hace(2)], AHORA)).toBe(3);
  });

  test('un hueco corta la racha', () => {
    // hoy y antier, falta ayer → solo cuenta hoy
    expect(rachaDeDias([hace(0), hace(2)], AHORA)).toBe(1);
  });

  test('ayer sin hoy mantiene la racha viva (el día no terminó)', () => {
    // el usuario aún no registró hoy, pero ayer y antier sí
    expect(rachaDeDias([hace(1), hace(2)], AHORA)).toBe(2);
  });

  test('ni hoy ni ayer → 0 (racha inactiva aunque haya registros viejos)', () => {
    expect(rachaDeDias([hace(2), hace(3), hace(4)], AHORA)).toBe(0);
  });

  test('varios registros el mismo día cuentan como un solo día', () => {
    const entries = [hace(0, 1), hace(0, 5), hace(0, 9), hace(1)];
    expect(rachaDeDias(entries, AHORA)).toBe(2);
  });

  test('el orden de las entries no afecta el resultado', () => {
    const desordenadas = [hace(2), hace(0), hace(1)];
    expect(rachaDeDias(desordenadas, AHORA)).toBe(3);
  });

  test('createdAt inválido se ignora sin romper', () => {
    const entries = [hace(0), { moodType: 'FELIZ', createdAt: 'no-es-fecha' }, hace(1)];
    expect(rachaDeDias(entries, AHORA)).toBe(2);
  });

  test('cruce de mes: la racha atraviesa el cambio de mes', () => {
    // Ancla el 2 de agosto; registros el 2, 1 de agosto y 31 de julio.
    const anclaAgosto = new Date('2026-08-02T12:00:00.000Z').getTime();
    const enFecha = (iso) => ({ moodType: 'CALMADO', createdAt: new Date(iso).toISOString() });
    const entries = [
      enFecha('2026-08-02T09:00:00.000Z'),
      enFecha('2026-08-01T22:00:00.000Z'),
      enFecha('2026-07-31T08:00:00.000Z'),
    ];
    expect(rachaDeDias(entries, anclaAgosto)).toBe(3);
  });
});

describe('textoRacha / etiquetaDias — tono sin presión', () => {
  // La app de bienestar no presiona ni culpa: refuerzo amable, nunca amenaza
  // con perder la racha. Verificación mecánica sobre texto normalizado.
  const PROHIBIDOS = [
    'no rompas',
    'no pierdas',
    'perdiste',
    'pierdas',
    'racha perdida',
    'debes',
    'tienes que',
    'obligac',
    'fallaste',
    'no falles',
  ];

  test('ningún mensaje contiene frases de presión (racha 0 a 14)', () => {
    for (let r = 0; r <= 14; r += 1) {
      const texto = normalizar(textoRacha(r));
      expect(texto.length).toBeGreaterThan(0);
      for (const frase of PROHIBIDOS) {
        expect(texto).not.toContain(normalizar(frase));
      }
    }
  });

  test('etiquetaDias singulariza en 1 y pluraliza en el resto', () => {
    expect(etiquetaDias(1)).toBe('día');
    expect(etiquetaDias(0)).toBe('días');
    expect(etiquetaDias(2)).toBe('días');
    expect(etiquetaDias(9)).toBe('días');
  });
});
