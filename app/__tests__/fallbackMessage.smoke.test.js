// Smoke test: las piezas de resiliencia de Fase 8 importan sin errores
// (rutas, sintaxis JSX y dependencias). No se renderiza nada.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import FallbackMessage, { TEXTO_FALLBACK } from '../components/chat/FallbackMessage';
import { useRetry, ejecutarConReintentos } from '../features/emociones/useRetry';

test('las piezas de fallback y retry exportan lo que pide el contrato', () => {
  [FallbackMessage, useRetry, ejecutarConReintentos].forEach((pieza) => {
    expect(typeof pieza).toBe('function');
  });
  expect(typeof TEXTO_FALLBACK).toBe('string');
});
