jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
    useFocusEffect: (callback) => React.useEffect(callback, [callback]),
    useLocalSearchParams: () => ({ amistadId: '7' }),
    Stack: { Screen: () => null },
  };
});

const mascota = {
  id: 'pet-1',
  amistadId: 7,
  nombre: 'Lumi',
  nivelCarino: 24,
  personalidad: 'curiosa',
  especie: 'perro',
  etapa: { numero: 2, nombre: 'Joven' },
  necesitaAtencion: false,
  puedeCuidar: true,
  reto: null,
  nombrePropuesto: null,
  historialHitos: [],
  accesorios: { desbloqueados: ['gorrito', 'lunares'], cabeza: 'gorrito', color: null },
};

jest.mock('../services/api', () => ({
  apiGetMascota: jest.fn().mockResolvedValue({ mascota }),
  apiCuidarMascota: jest.fn(),
  apiIniciarRetoMascota: jest.fn(),
  apiProponerNombreMascota: jest.fn(),
  apiEquiparAccesorioMascota: jest.fn(),
}));

import React from 'react';
import { act, create } from 'react-test-renderer';
import MascotaDetalleScreen from '../app/mascota/[amistadId]';
import { ThemeProvider } from '../theme/ThemeContext';

test('renderiza el detalle con sprite animado y grid de accesorios', async () => {
  let renderer;
  await act(async () => {
    renderer = create(
      <ThemeProvider>
        <MascotaDetalleScreen />
      </ThemeProvider>,
    );
    await Promise.resolve();
  });

  // El grid de accesorios muestra las categorías y un accesorio bloqueado con pista.
  expect(renderer.root.findByProps({ children: 'Cabeza' })).toBeTruthy();
  expect(renderer.root.findByProps({ children: 'Color y patrón' })).toBeTruthy();
  expect(renderer.root.findByProps({ children: 'Corona' })).toBeTruthy();

  act(() => renderer.unmount());
});
