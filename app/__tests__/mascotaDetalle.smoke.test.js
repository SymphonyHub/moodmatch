jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }),
}));
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
  apiRegalarMascota: jest.fn(),
  apiArchivarMascota: jest.fn(),
}));

import React from 'react';
import { act, create } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import MascotaDetalleScreen from '../app/mascota/[amistadId]';
import { ThemeProvider } from '../theme/ThemeContext';
import { apiCuidarMascota, apiGetMascota } from '../services/api';

beforeEach(() => {
  apiGetMascota.mockResolvedValue({ mascota });
  apiCuidarMascota.mockReset();
});

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
  const volver = renderer.root.findByProps({ accessibilityLabel: 'Volver' });
  const volverStyle = StyleSheet.flatten(volver.props.style);
  expect(volverStyle.paddingTop).toBe(32);
  expect(volverStyle.minHeight - volverStyle.paddingTop).toBe(44);

  act(() => renderer.unmount());
});

test('muestra la ganancia real y actualiza la barra al cuidar', async () => {
  apiCuidarMascota.mockResolvedValueOnce({
    mascota: { ...mascota, nivelCarino: 30 },
  });
  let renderer;
  await act(async () => {
    renderer = create(
      <ThemeProvider>
        <MascotaDetalleScreen />
      </ThemeProvider>,
    );
    await Promise.resolve();
  });

  const cuidar = renderer.root.findByProps({
    accessibilityLabel: 'Alimentar y jugar con la mascota',
  });
  const progresoInicial = renderer.root.findByProps({ accessibilityRole: 'progressbar' });
  act(() => progresoInicial.props.onLayout({ nativeEvent: { layout: { width: 240 } } }));
  await act(async () => {
    await cuidar.props.onPress();
  });

  expect(renderer.root.findByProps({ children: '+6 cariño' })).toBeTruthy();
  const progreso = renderer.root.findByProps({ accessibilityRole: 'progressbar' });
  expect(progreso.props.accessibilityValue.now).toBe(70);

  act(() => renderer.unmount());
});
