// Verificación mecánica de tono del mensaje de fallback (mismas reglas que
// guiones.test.js): el texto que se muestra cuando la IA no responde también
// es texto del bot y respeta CLAUDE.md sección 2.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { TEXTO_FALLBACK } from '../components/chat/FallbackMessage';
import { normalizar, MENSAJE_CRISIS } from '../features/emociones/crisis';
import {
  LISTA_NEGRA_UNIVERSAL,
  LISTA_NEGRA_POSITIVIDAD,
} from '../features/emociones/tono';

const textoNormalizado = normalizar(TEXTO_FALLBACK);

describe('TEXTO_FALLBACK — tono del mensaje de reconexión', () => {
  test('existe y no está vacío', () => {
    expect(typeof TEXTO_FALLBACK).toBe('string');
    expect(TEXTO_FALLBACK.trim().length).toBeGreaterThan(0);
  });

  LISTA_NEGRA_UNIVERSAL.forEach((frase) => {
    test(`no minimiza ni diagnostica: "${frase}"`, () => {
      expect(textoNormalizado).not.toContain(frase);
    });
  });

  LISTA_NEGRA_POSITIVIDAD.forEach((frase) => {
    test(`sin positividad forzada (se muestra también en moods difíciles): "${frase}"`, () => {
      expect(textoNormalizado).not.toContain(frase);
    });
  });

  test('no incluye teléfonos ni recursos de crisis (exclusivos de MENSAJE_CRISIS)', () => {
    ['*4141', '600 360 7777'].forEach((telefono) => {
      expect(TEXTO_FALLBACK).not.toContain(telefono);
      expect(MENSAJE_CRISIS).toContain(telefono); // guarda: siguen viviendo ahí
    });
    expect(textoNormalizado).not.toContain('linea de prevencion');
    expect(textoNormalizado).not.toContain('salud responde');
  });

  test('no se presenta como un error técnico (la app nunca muestra un error del modelo)', () => {
    ['error', 'fallo', 'falla', 'servidor', 'intenta mas tarde'].forEach((palabra) => {
      expect(textoNormalizado).not.toContain(palabra);
    });
  });
});
