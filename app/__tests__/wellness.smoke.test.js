// Smoke test: la pantalla provisional /wellness y las piezas de la pestaña
// "Para mí" importan sin errores. No se renderiza nada.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Ionicons arrastra expo-font → expo-asset, que no resuelve bajo jest
// (en runtime nativo sí funciona: mismo import que usa chat/[friendId].jsx).
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

import WellnessScreen from '../app/wellness';
import ParaMiTab from '../components/wellness/ParaMiTab';
import ActivitySuggestionCard from '../components/wellness/ActivitySuggestionCard';
import { RUTA_WELLNESS, ENCABEZADOS, tiempoRelativo } from '../features/wellness/paraMi';

test('la pantalla y los componentes de wellness exportan componentes', () => {
  [WellnessScreen, ParaMiTab, ActivitySuggestionCard].forEach((Componente) => {
    expect(typeof Componente).toBe('function');
  });
});

test('el dominio de Para mí está completo', () => {
  expect(RUTA_WELLNESS).toBe('/wellness');
  expect(Object.keys(ENCABEZADOS)).toHaveLength(6);
  expect(typeof tiempoRelativo).toBe('function');
});
