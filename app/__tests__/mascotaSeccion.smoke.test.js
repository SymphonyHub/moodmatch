// Smoke test: las pantallas de la sección Mascota importan sin errores.
// No se renderiza nada; sólo se comprueba que el módulo se evalúa (atrapa
// errores de import o referencias rotas a nivel de módulo).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Ionicons arrastra expo-font → expo-asset, que no resuelve bajo jest
// (en runtime nativo sí funciona: mismo import que usa chat/[friendId].jsx).
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

import MascotaScreen from '../app/(tabs)/mascota';
import MascotaDetalleScreen from '../app/mascota/[amistadId]';
import {
  apiGetSeccionMascota,
  apiInvitarMascota,
  apiAceptarInvitacionMascota,
  apiRechazarInvitacionMascota,
} from '../services/api';

test('las pantallas de la sección Mascota exportan componentes', () => {
  expect(typeof MascotaScreen).toBe('function');
  expect(typeof MascotaDetalleScreen).toBe('function');
});

test('la API de la sección Mascota está disponible', () => {
  [
    apiGetSeccionMascota,
    apiInvitarMascota,
    apiAceptarInvitacionMascota,
    apiRechazarInvitacionMascota,
  ].forEach((fn) => expect(typeof fn).toBe('function'));
});
