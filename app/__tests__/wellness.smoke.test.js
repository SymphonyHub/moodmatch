// Smoke test: las piezas de la pestaña "Para mí" del Wellness Hub importan
// sin errores. No se renderiza nada.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Ionicons arrastra expo-font → expo-asset, que no resuelve bajo jest
// (en runtime nativo sí funciona: mismo import que usa chat/[friendId].jsx).
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

import ParaMiPanel from '../wellness/ParaMiPanel';
import ParaMiTab from '../components/wellness/ParaMiTab';
import ActivitySuggestionCard from '../components/wellness/ActivitySuggestionCard';
import { RUTA_WELLNESS, ENCABEZADOS, tiempoRelativo } from '../features/wellness/paraMi';

test('el panel y los componentes de wellness exportan componentes', () => {
  [ParaMiPanel, ParaMiTab, ActivitySuggestionCard].forEach((Componente) => {
    expect(typeof Componente).toBe('function');
  });
});

test('el dominio de Para mí está completo y apunta al Hub', () => {
  expect(RUTA_WELLNESS).toBe('/actividades');
  expect(Object.keys(ENCABEZADOS)).toHaveLength(6);
  expect(typeof tiempoRelativo).toBe('function');
});
