// Ajustes → Accesibilidad: los tres controles nuevos (tamaño de texto en pasos,
// movimiento reducido y vibración) y el contrato de useMotionPrefs, que usan los
// primitivos de bajo nivel.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('react-native-keyboard-controller', () => {
  const React = require('react');
  const { ScrollView } = require('react-native');
  return {
    KeyboardAwareScrollView: React.forwardRef((props, ref) => <ScrollView ref={ref} {...props} />),
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
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AjustesScreen from '../app/ajustes/index';
import { ThemeProvider, useMotionPrefs } from '../theme/ThemeContext';

const REDUCE_MOTION_KEY = 'moodmatch.reduceMotion';
const HAPTICS_KEY = 'moodmatch.haptics';
const TEXT_SCALE_KEY = 'moodmatch.textScale';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

async function renderAjustes() {
  let renderer;
  await act(async () => {
    renderer = create(
      <ThemeProvider>
        <AjustesScreen />
      </ThemeProvider>,
    );
    await Promise.resolve();
  });
  return renderer;
}

// Control por su etiqueta accesible, quedándose con el nodo que trae el callback.
const control = (renderer, label, callback) =>
  renderer.root.findAll(
    (n) =>
      n.props && n.props.accessibilityLabel === label && typeof n.props[callback] === 'function',
  )[0];

// Tappable y Entrance se montan por toda la app y varios tests los renderizan
// sueltos: fuera del provider tienen que seguir andando con los valores de siempre.
test('useMotionPrefs no explota fuera del ThemeProvider', () => {
  function Sonda() {
    const { reduceMotion, hapticsEnabled } = useMotionPrefs();
    return <Text>{`${reduceMotion}/${hapticsEnabled}`}</Text>;
  }

  let renderer;
  act(() => {
    renderer = create(<Sonda />);
  });
  expect(renderer.root.findByProps({ children: 'false/true' })).toBeTruthy();
  act(() => renderer.unmount());
});

test('reducir movimiento se guarda y se relee al arrancar', async () => {
  const renderer = await renderAjustes();

  const toggle = control(renderer, 'Reducir movimiento', 'onValueChange');
  expect(toggle.props.value).toBe(false);

  await act(async () => {
    toggle.props.onValueChange(true);
    await Promise.resolve();
  });
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(REDUCE_MOTION_KEY, 'true');
  expect(control(renderer, 'Reducir movimiento', 'onValueChange').props.value).toBe(true);

  act(() => renderer.unmount());

  // Una sesión nueva arranca con la preferencia puesta.
  const otra = await renderAjustes();
  expect(control(otra, 'Reducir movimiento', 'onValueChange').props.value).toBe(true);
  act(() => otra.unmount());
});

test('la vibración se puede apagar y queda apagada', async () => {
  const renderer = await renderAjustes();

  const toggle = control(renderer, 'Vibración al tocar', 'onValueChange');
  expect(toggle.props.value).toBe(true);

  await act(async () => {
    toggle.props.onValueChange(false);
    await Promise.resolve();
  });
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(HAPTICS_KEY, 'false');

  act(() => renderer.unmount());

  const otra = await renderAjustes();
  expect(control(otra, 'Vibración al tocar', 'onValueChange').props.value).toBe(false);
  act(() => otra.unmount());
});

test('el tamaño del texto tiene tres pasos y el elegido escala la tipografía', async () => {
  const renderer = await renderAjustes();

  const paso = (label) =>
    renderer.root.findAll(
      (n) => n.props && n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
    )[0];

  ['Normal', 'Grande', 'Más grande'].forEach((l) => expect(paso(l)).toBeTruthy());

  await act(async () => {
    paso('Más grande').props.onPress();
    await Promise.resolve();
  });
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(TEXT_SCALE_KEY, '1.3');

  act(() => renderer.unmount());
});
