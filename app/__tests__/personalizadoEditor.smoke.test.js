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
import { Alert } from 'react-native';
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

// Campo hex de un color del editor (Primario / Acento / Fondo). Se queda con el
// nodo más externo que sí trae el callback: la etiqueta accesible aparece en
// varios niveles del árbol, y los de adentro no siempre lo llevan.
const campoHex = (renderer, color) =>
  renderer.root.findAll(
    (n) =>
      n.props &&
      n.props.accessibilityLabel === `Código hex de ${color}` &&
      typeof n.props.onChangeText === 'function',
  )[0];

// Botón por su etiqueta accesible, con el mismo criterio.
const boton = (renderer, label) =>
  renderer.root.findAll(
    (n) =>
      n.props && n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0];

test('el editor de Personalizado se despliega sin bloqueo de contraste', async () => {
  const renderer = await renderEditorPersonalizado();

  // El editor está montado (bloque de fuente presente).
  expect(renderer.root.findByProps({ children: 'Fuente' })).toBeTruthy();

  // La paleta por defecto no dispara ningún aviso, y no queda rastro del
  // guardrail que bloqueaba: nada pide corregir nada.
  const copys = textos(renderer);
  expect(copys.some((t) => t.includes('costar de leer'))).toBe(false);
  expect(copys.some((t) => t.includes('Corrige'))).toBe(false);

  act(() => renderer.unmount());
});

test('el aviso de contraste avisa pero no bloquea guardar ni aplicar', async () => {
  const renderer = await renderEditorPersonalizado();

  // Primario casi blanco sobre las tarjetas claras: contraste malísimo a propósito.
  act(() => campoHex(renderer, 'Primario').props.onChangeText('fffffe'));

  // Avisa... (el copy usa singular o plural según cuántas combinaciones haya)
  expect(textos(renderer).some((t) => t.includes('costar de leer'))).toBe(true);
  // ...y aun así deja guardar y aplicar (los colores son libres).
  expect(boton(renderer, 'Guardar paleta').props.disabled).toBe(false);
  const aplicar = renderer.root.findByProps({ children: 'Aplicar tema Personalizado' });
  expect(aplicar).toBeTruthy();

  act(() => renderer.unmount());
});

test('el campo hex acepta el valor sin # y expande la forma corta al salir', async () => {
  const renderer = await renderEditorPersonalizado();
  const campo = campoHex(renderer, 'Acento');

  // Sin "#": se toma igual.
  act(() => campo.props.onChangeText('ff0000'));
  expect(campoHex(renderer, 'Acento').props.value).toBe('#ff0000');

  // Forma corta de 3 dígitos: se expande recién al salir del campo.
  act(() => campoHex(renderer, 'Acento').props.onChangeText('00f'));
  act(() => campoHex(renderer, 'Acento').props.onBlur());
  expect(campoHex(renderer, 'Acento').props.value).toBe('#0000ff');

  act(() => renderer.unmount());
});

test('borrar una paleta pide confirmación antes de destruirla', async () => {
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const renderer = await renderEditorPersonalizado();

  // Hace falta una segunda paleta para que aparezca "Borrar".
  act(() => boton(renderer, 'Crear paleta nueva').props.onPress());
  await act(async () => {
    boton(renderer, 'Guardar paleta').props.onPress();
    await Promise.resolve();
  });

  const borrar = renderer.root.findAll(
    (n) =>
      n.props &&
      String(n.props.accessibilityLabel ?? '').startsWith('Borrar paleta') &&
      typeof n.props.onPress === 'function',
  );
  expect(borrar.length).toBeGreaterThan(0);

  // El toque solo abre la confirmación: todavía no borra nada.
  act(() => borrar[0].props.onPress());
  expect(alerta).toHaveBeenCalled();
  const [, , acciones] = alerta.mock.calls.at(-1);
  expect(acciones.map((a) => a.style)).toContain('cancel');
  expect(acciones.some((a) => a.style === 'destructive')).toBe(true);

  act(() => renderer.unmount());
  alerta.mockRestore();
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
