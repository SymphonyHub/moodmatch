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
// jest-expo deja expoConfig vacío, así que la versión se fija acá para poder
// verificar que la fila "Acerca de" la muestra de verdad.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { name: 'MoodMatch', version: '9.9.9' } },
}));
jest.mock('../services/api', () => ({
  apiGetMe: jest.fn().mockResolvedValue({ user: { nombre: 'Ada', avatarUrl: null } }),
  apiUpdateMe: jest.fn().mockResolvedValue({ user: {} }),
  apiUpdateThemePreference: jest.fn().mockResolvedValue({}),
}));

import React from 'react';
import { Alert } from 'react-native';
import { act, create } from 'react-test-renderer';
import { router } from 'expo-router';
import Constants from 'expo-constants';
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

  // El tamaño de texto pasó de un sí/no a tres pasos, y Accesibilidad sumó
  // movimiento reducido y vibración.
  expect(renderer.root.findByProps({ children: 'Tamaño del texto' })).toBeTruthy();
  ['Normal', 'Grande', 'Más grande'].forEach((paso) => {
    expect(renderer.root.findAllByProps({ children: paso }).length).toBeGreaterThan(0);
  });
  expect(renderer.root.findByProps({ accessibilityLabel: 'Reducir movimiento' })).toBeTruthy();
  expect(renderer.root.findByProps({ accessibilityLabel: 'Vibración al tocar' })).toBeTruthy();
  expect(renderer.root.findByProps({ children: 'Cerrar sesión' })).toBeTruthy();
  // Bloques que Ajustes conserva tras dejar de ser tab.
  ['Apariencia', 'Accesibilidad', 'Notificaciones', 'Cuenta'].forEach((titulo) => {
    expect(renderer.root.findByProps({ children: titulo })).toBeTruthy();
  });

  act(() => renderer.unmount());
});

// Sin la versión a la vista no hay forma de saber qué build corre el dispositivo
// cuando un cambio "no se ve aplicado".
test('Cuenta muestra la versión de la app', async () => {
  let renderer;
  await act(async () => {
    renderer = renderAjustes();
    await Promise.resolve();
  });

  expect(renderer.root.findByProps({ children: 'Acerca de' })).toBeTruthy();
  const copys = renderer.root
    .findAll((n) => typeof n.props.children === 'string')
    .map((n) => n.props.children);
  expect(copys.some((t) => t.includes(Constants.expoConfig.version))).toBe(true);

  act(() => renderer.unmount());
});

test('cerrar sesión pide confirmación antes de salir', async () => {
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  let renderer;
  await act(async () => {
    renderer = renderAjustes();
    await Promise.resolve();
  });

  const salir = renderer.root.findAll(
    (n) =>
      n.props &&
      n.props.accessibilityLabel === 'Cerrar sesión' &&
      typeof n.props.onPress === 'function',
  )[0];

  act(() => salir.props.onPress());
  expect(alerta).toHaveBeenCalled();
  // Preguntar no cierra la sesión todavía.
  expect(router.replace).not.toHaveBeenCalledWith('/login');

  // Confirmar sí.
  const [, , acciones] = alerta.mock.calls.at(-1);
  await act(async () => {
    acciones.find((a) => a.style === 'destructive').onPress();
    await Promise.resolve();
  });
  expect(router.replace).toHaveBeenCalledWith('/login');

  act(() => renderer.unmount());
  alerta.mockRestore();
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
