// Smoke test: la pantalla de historial y su dominio importan sin errores.
// No se renderiza nada.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Ionicons arrastra expo-font → expo-asset, que no resuelve bajo jest
// (en runtime nativo sí funciona: mismo import que usa chat/[friendId].jsx).
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

import HistorialScreen from '../app/historial';
import ParaMiTab from '../components/wellness/ParaMiTab';
import { MENSAJES_PATRON, RUTA_HISTORIAL } from '../features/wellness/historial';

test('la pantalla de historial y Para mí exportan componentes', () => {
  [HistorialScreen, ParaMiTab].forEach((Componente) => {
    expect(typeof Componente).toBe('function');
  });
});

test('el dominio del historial está completo', () => {
  expect(Object.keys(MENSAJES_PATRON)).toHaveLength(4);
  Object.values(MENSAJES_PATRON).forEach((variantes) => {
    expect(variantes.length).toBeGreaterThanOrEqual(2);
  });
  expect(RUTA_HISTORIAL).toBe('/historial');
});
