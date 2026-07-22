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
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { push: mockPush, back: jest.fn() },
    useFocusEffect: (callback) => React.useEffect(callback, [callback]),
  };
});

// Historial con dos días consecutivos (hoy y ayer) → racha determinista de 2,
// independiente de la zona horaria del entorno de test.
jest.mock('../services/api', () => {
  const hoy = Date.now();
  const ayer = hoy - 24 * 60 * 60 * 1000;
  return {
  apiGetMe: jest.fn().mockResolvedValue({ user: { nombre: 'Ada', avatarUrl: null, racha: 2 } }),
  apiUpdateMe: jest.fn().mockResolvedValue({ user: {} }),
  apiGetMoodHistory: jest
    .fn()
    .mockResolvedValue({ entries: [{ createdAt: hoy }, { createdAt: ayer }] }),
  apiGetMyMascotas: jest.fn().mockResolvedValue({
    mascotas: [
      { amistadId: 1, amigoId: 2, amigoNombre: 'Ana', amigoAvatarUrl: null, nombre: 'Lumi', nivelCarino: 12 },
    ],
  }),
  // Consumidas por FriendsCountContext; getToken null → el store no toca red.
  apiGetFriendsCount: jest.fn().mockResolvedValue({ count: 3 }),
  apiGetFriendships: jest.fn().mockResolvedValue({ amigos: [] }),
  getToken: jest.fn().mockResolvedValue(null),
  };
});

import React from 'react';
import { act, create } from 'react-test-renderer';
import PerfilScreen from '../app/perfil';
import { ThemeProvider } from '../theme/ThemeContext';
import { FriendsCountProvider } from '../friends/FriendsCountContext';
import { apiGetMyMascotas, apiUpdateMe } from '../services/api';

function renderPerfil() {
  return create(
    <ThemeProvider>
      <FriendsCountProvider>
        <PerfilScreen />
      </FriendsCountProvider>
    </ThemeProvider>,
  );
}

test('renderiza el perfil con sus secciones', async () => {
  let renderer;
  await act(async () => {
    renderer = renderPerfil();
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(renderer.root.findByProps({ children: 'Mi perfil' })).toBeTruthy();
  ['Tu racha', 'Tu círculo', 'Tus mascotas', 'Tus logros'].forEach((titulo) => {
    expect(renderer.root.findByProps({ children: titulo })).toBeTruthy();
  });

  act(() => renderer.unmount());
});

test('muestra la mascota activa y persiste la racha calculada', async () => {
  let renderer;
  await act(async () => {
    renderer = renderPerfil();
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(apiGetMyMascotas).toHaveBeenCalled();
  expect(renderer.root.findByProps({ children: 'Lumi' })).toBeTruthy();
  // La racha se recalcula en el cliente y se cachea en el backend.
  expect(apiUpdateMe).toHaveBeenCalledWith({ racha: 2 });

  act(() => renderer.unmount());
});
