// Smoke test del editor de tema Personalizado (Ajustes → modo Personalizado).
// El render general vive en ajustes.render.test.js, pero ese no entra al editor
// (arranca en un tema no-custom). Aquí se cambia el candidato a Personalizado y
// se verifica lo propio del editor: carrusel de fuente, colores libres (sin
// bloqueo de contraste), sliders del Fondo y accesibilidad de las barras.
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
import { act, create } from 'react-test-renderer';
import AjustesScreen from '../app/ajustes/index';
import { ThemeProvider } from '../theme/ThemeContext';

// Renderiza Ajustes y conmuta el candidato a "Personalizado" para desplegar el
// editor. Devuelve el renderer ya en modo custom.
async function renderEditorPersonalizado() {
  let renderer;
  await act(async () => {
    renderer = create(
      <ThemeProvider>
        <AjustesScreen />
      </ThemeProvider>,
    );
    await Promise.resolve();
  });
  const opcionCustom = renderer.root.findByProps({
    accessibilityLabel: 'Tema Personalizado. Tus colores y tu fuente',
  });
  act(() => opcionCustom.props.onPress());
  return renderer;
}

// Texto plano contenido en cualquier nodo (para aserciones sobre copys).
const textos = (renderer) =>
  renderer.root
    .findAll((n) => typeof n.props.children === 'string')
    .map((n) => n.props.children);

test('el editor de Personalizado se despliega sin aviso ni bloqueo de contraste', async () => {
  const renderer = await renderEditorPersonalizado();

  // El editor está montado (bloque de fuente presente).
  expect(renderer.root.findByProps({ children: 'Fuente' })).toBeTruthy();

  // No queda rastro del guardrail WCAG: ni copys del aviso ni del botón Aplicar.
  const copys = textos(renderer);
  expect(copys.some((t) => t.includes('contraste'))).toBe(false);
  expect(copys.some((t) => t.includes('Corrige'))).toBe(false);

  act(() => renderer.unmount());
});

test('la fuente es un carrusel: las flechas cambian la fuente activa', async () => {
  const renderer = await renderEditorPersonalizado();

  // Arranca en Manrope (fuente por defecto de la paleta base).
  expect(renderer.root.findByProps({ children: 'Manrope' })).toBeTruthy();
  // Las flechas existen como controles accesibles.
  const siguiente = renderer.root.findAllByProps({ accessibilityLabel: 'Fuente siguiente' })[0];
  expect(renderer.root.findAllByProps({ accessibilityLabel: 'Fuente anterior' })[0]).toBeTruthy();

  // Avanzar una posición cambia la fuente mostrada (Manrope → Nunito).
  act(() => siguiente.props.onPress());
  expect(renderer.root.findByProps({ children: 'Nunito' })).toBeTruthy();

  act(() => renderer.unmount());
});

test('el Fondo tiene matiz/saturación/luminosidad y las barras son accesibles (adjustable)', async () => {
  const renderer = await renderEditorPersonalizado();

  // Las barras se exponen como control "adjustable" para lectores de pantalla.
  const barras = renderer.root.findAll(
    (n) => n.props && n.props.accessibilityRole === 'adjustable',
  );
  const labels = barras.map((n) => n.props.accessibilityLabel);
  // El Fondo ganó barras propias, incluida Saturación (para que el Matiz sirva).
  expect(labels).toContain('Matiz de Fondo');
  expect(labels).toContain('Saturación de Fondo');
  expect(labels).toContain('Luminosidad de Fondo');

  // Cada barra expone un valor numérico (para el anuncio del lector de pantalla).
  const lumFondo = barras.find((n) => n.props.accessibilityLabel === 'Luminosidad de Fondo');
  expect(typeof lumFondo.props.accessibilityValue.now).toBe('number');

  act(() => renderer.unmount());
});

test('cada color tiene un campo hex para ver/escribir el valor exacto', async () => {
  const renderer = await renderEditorPersonalizado();

  ['Primario', 'Acento', 'Fondo'].forEach((c) => {
    const campos = renderer.root.findAll(
      (n) => n.props && n.props.accessibilityLabel === `Código hex de ${c}`,
    );
    expect(campos.length).toBeGreaterThan(0);
  });

  act(() => renderer.unmount());
});
