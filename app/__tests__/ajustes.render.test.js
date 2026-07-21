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
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { push: jest.fn(), replace: jest.fn() },
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
import AjustesScreen from '../app/(tabs)/ajustes';
import { ThemeProvider } from '../theme/ThemeContext';

test('renderiza la pantalla completa de Ajustes', async () => {
  let renderer;
  await act(async () => {
    renderer = create(
      <ThemeProvider>
        <AjustesScreen />
      </ThemeProvider>,
    );
    await Promise.resolve();
  });

  expect(renderer.root.findByProps({ accessibilityLabel: 'Texto grande' })).toBeTruthy();
  expect(renderer.root.findByProps({ children: 'Cerrar sesión' })).toBeTruthy();

  act(() => renderer.unmount());
});
