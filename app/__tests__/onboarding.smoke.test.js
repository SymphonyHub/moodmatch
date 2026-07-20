jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

import LoginScreen from '../app/login';
import BienvenidaScreen from '../app/onboarding/bienvenida';
import CuestionarioScreen from '../app/onboarding/cuestionario';

test('auth y onboarding exportan pantallas válidas', () => {
  [LoginScreen, BienvenidaScreen, CuestionarioScreen].forEach((Pantalla) => {
    expect(typeof Pantalla).toBe('function');
  });
});
