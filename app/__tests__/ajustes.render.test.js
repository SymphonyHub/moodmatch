jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('expo-image-picker', () => ({
  CameraType: { front: 'front' },
  getPendingResultAsync: jest.fn().mockResolvedValue(null),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: jest.fn(() => true),
    },
    useFocusEffect: (callback) => React.useEffect(callback, [callback]),
  };
});
jest.mock('react-native-keyboard-controller', () => {
  const React = require('react');
  const { ScrollView } = require('react-native');
  return {
    KeyboardAwareScrollView: React.forwardRef((props, ref) => (
      <ScrollView ref={ref} {...props} />
    )),
  };
});
jest.mock('../notifications/pushRegistration', () => ({
  unregisterPushTokenForLogout: jest.fn(),
}));
jest.mock('../services/api', () => ({
  apiGetMe: jest.fn().mockResolvedValue({ user: { nombre: 'Ada', avatarUrl: null } }),
  apiUpdateMe: jest.fn().mockResolvedValue({ user: {} }),
  apiUpdateThemePreference: jest.fn().mockResolvedValue({}),
}));

import React from 'react';
import { act, create } from 'react-test-renderer';
import { router } from 'expo-router';
import AjustesScreen from '../app/ajustes/index';
import { ThemeProvider } from '../theme/ThemeContext';

function renderAjustes() {
  return create(
    <ThemeProvider>
      <AjustesScreen />
    </ThemeProvider>,
  );
}

test('renderiza la pantalla completa de Ajustes', async () => {
  let renderer;
  await act(async () => {
    renderer = renderAjustes();
    await Promise.resolve();
  });

  expect(renderer.root.findByProps({ accessibilityLabel: 'Texto grande' })).toBeTruthy();
  expect(renderer.root.findByProps({ children: 'Cerrar sesión' })).toBeTruthy();
  // Bloques que Ajustes conserva tras dejar de ser tab.
  ['Apariencia', 'Accesibilidad', 'Notificaciones', 'Cuenta'].forEach((titulo) => {
    expect(renderer.root.findByProps({ children: titulo })).toBeTruthy();
  });

  act(() => renderer.unmount());
});

// Ajustes se abre como push desde el Perfil, así que trae su propio botón atrás.
test('el header vuelve a la pantalla anterior', async () => {
  let renderer;
  await act(async () => {
    renderer = renderAjustes();
    await Promise.resolve();
  });

  const volver = renderer.root.findByProps({ accessibilityLabel: 'Volver a mi perfil' });
  act(() => volver.props.onPress());
  expect(router.back).toHaveBeenCalled();

  act(() => renderer.unmount());
});
