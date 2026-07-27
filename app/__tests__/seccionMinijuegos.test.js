jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import React from 'react';
import { act, create } from 'react-test-renderer';
import { router } from 'expo-router';
import SeccionMinijuegos from '../mascota/minijuegos/SeccionMinijuegos';
import { ThemeProvider } from '../theme/ThemeContext';

const mascota = {
  amistadId: 7,
  monedas: 5,
  minijuegos: {
    ATRAPALA: { puedeJugar: true, disponibleEn: null },
    RITMO_CARINO: { puedeJugar: false, disponibleEn: '2026-07-28T12:00:00.000Z' },
  },
};

beforeEach(() => router.push.mockClear());

test('muestra saldo, disponibilidad independiente y abre solo el juego habilitado', async () => {
  let renderer;
  await act(async () => {
    renderer = create(
      <ThemeProvider><SeccionMinijuegos mascota={mascota} /></ThemeProvider>,
    );
    await Promise.resolve();
  });

  expect(renderer.root.findByProps({ children: '5 semillitas' })).toBeTruthy();
  expect(renderer.root.findByProps({ children: 'Jugar cuando quieran' })).toBeTruthy();
  expect(renderer.root.findByProps({ children: 'Este juego toma una pausa' })).toBeTruthy();

  const atrapala = renderer.root.findAllByProps({
    accessibilityLabel: 'Atrápala. Jugar cuando quieran',
  })[0];
  act(() => atrapala.props.onPress());
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/mascota/minijuego',
    params: { amistadId: '7', tipo: 'atrapala' },
  });

  const ritmo = renderer.root.findAllByProps({
    accessibilityLabel: 'Ritmo de cariño. Este juego toma una pausa',
  })[0];
  expect(ritmo.props.disabled).toBe(true);

  act(() => renderer.unmount());
});

test('no expone rutas rotas mientras el backend anterior no incluya cooldowns', async () => {
  let renderer;
  await act(async () => {
    renderer = create(
      <ThemeProvider><SeccionMinijuegos mascota={{ amistadId: 7 }} /></ThemeProvider>,
    );
    await Promise.resolve();
  });
  expect(renderer.toJSON()).toBeNull();
  act(() => renderer.unmount());
});
