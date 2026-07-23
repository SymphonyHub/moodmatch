// El layout de tabs es archivo compartido (COORDINACION.md) y hasta Fase 16 no
// tenía cobertura. Verifica el cableado: que la barra registre los destinos de
// tabsConfig en orden y que el engranaje de Ajustes cuelgue del Perfil.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../components/TabBar', () => () => null);
jest.mock('../services/api', () => ({
  apiGetUnreadCount: jest.fn().mockResolvedValue({ count: 0 }),
}));
jest.mock('expo-router', () => {
  const React = require('react');
  const Tabs = ({ children }) => React.createElement('Tabs', null, children);
  Tabs.Screen = (props) => React.createElement('TabsScreen', props);
  return { Tabs, router: { push: jest.fn() } };
});

import React from 'react';
import { act, create } from 'react-test-renderer';
import TabsLayout from '../app/(tabs)/_layout';
import { ThemeProvider } from '../theme/ThemeContext';
import { TABS_PRINCIPALES } from '../components/tabsConfig';

// El layout monta un setInterval para el badge de no leídos; con timers falsos
// no queda un handle real vivo al terminar la suite.
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

async function renderLayout() {
  let renderer;
  await act(async () => {
    renderer = create(
      <ThemeProvider>
        <TabsLayout />
      </ThemeProvider>,
    );
  });
  return renderer;
}

test('registra los destinos de tabsConfig en orden', async () => {
  const renderer = await renderLayout();
  const screens = renderer.root.findAllByType('TabsScreen');

  expect(screens.map((s) => s.props.name)).toEqual(TABS_PRINCIPALES.map((t) => t.name));
  screens.forEach((s, i) => {
    expect(s.props.options.tabBarLabel).toBe(TABS_PRINCIPALES[i].tabBarLabel);
    expect(s.props.options.tabBarIconSet).toEqual(TABS_PRINCIPALES[i].iconSet);
  });

  act(() => renderer.unmount());
});

test('solo el Perfil lleva el engranaje de Ajustes en el header', async () => {
  const renderer = await renderLayout();
  const conEngranaje = renderer.root
    .findAllByType('TabsScreen')
    .filter((s) => s.props.options.headerRight);

  expect(conEngranaje).toHaveLength(1);
  expect(conEngranaje[0].props.name).toBe('perfil');

  act(() => renderer.unmount());
});

test('el badge de no leídos sigue colgando solo de Amigos', async () => {
  const renderer = await renderLayout();
  const conBadge = renderer.root
    .findAllByType('TabsScreen')
    .filter((s) => 'tabBarBadge' in s.props.options);

  expect(conBadge.map((s) => s.props.name)).toEqual(['amigos']);

  act(() => renderer.unmount());
});
