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
import { Alert, ScrollView } from 'react-native';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AjustesScreen from '../app/ajustes/index';
import { ThemeProvider } from '../theme/ThemeContext';
import { MAX_PALETAS } from '../theme/customTheme';

// El mock de AsyncStorage conserva lo guardado entre pruebas: sin limpiarlo, las
// paletas que crea una prueba aparecen en la siguiente.
beforeEach(async () => {
  await AsyncStorage.clear();
});

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

// Los tres colores comparten un juego de controles: el segmentado elige cuál se
// edita ("Primario" / "Acento" / "Fondo").
const elegirColor = (renderer, label) => act(() => boton(renderer, label).props.onPress());

// Etiquetas de las barras montadas, en orden (cada una aparece en varios
// niveles del árbol, de ahí el Set).
const barrasDe = (nodo) => [
  ...new Set(
    nodo
      .findAll((n) => n.props && n.props.accessibilityRole === 'adjustable')
      .map((n) => n.props.accessibilityLabel),
  ),
];

// Campo de nombre de la paleta en edición.
const campoNombre = (renderer) =>
  renderer.root.findAll(
    (n) =>
      n.props &&
      n.props.accessibilityLabel === 'Nombre de la paleta' &&
      typeof n.props.onChangeText === 'function',
  )[0];

// Tarjetas de paleta de la rejilla, por etiqueta accesible.
const tarjetasPaleta = (renderer) => [
  ...new Set(
    renderer.root
      .findAll(
        (n) =>
          n.props &&
          n.props.accessibilityRole === 'radio' &&
          typeof n.props.onPress === 'function' &&
          String(n.props.accessibilityLabel ?? '').startsWith('Paleta '),
      )
      .map((n) => n.props.accessibilityLabel),
  ),
];

// La paleta marcada como seleccionada (la que está en edición).
const paletaSeleccionada = (renderer) =>
  renderer.root.findAll(
    (n) =>
      n.props &&
      n.props.accessibilityRole === 'radio' &&
      typeof n.props.onPress === 'function' &&
      n.props.accessibilityState &&
      n.props.accessibilityState.selected &&
      String(n.props.accessibilityLabel ?? '').startsWith('Paleta '),
  )[0]?.props.accessibilityLabel;

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
  elegirColor(renderer, 'Acento');
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

test('las paletas se ven todas juntas, sin scroll propio que se coma el toque', async () => {
  const renderer = await renderEditorPersonalizado();
  const lista = renderer.root.findByProps({ testID: 'lista-paletas-compacta' });

  // Rejilla, no tira: sin ScrollView anidado no hay paletas fuera de vista ni
  // toques perdidos en cerrar el teclado del nombre.
  expect(lista.findAllByType(ScrollView).length).toBe(0);
  // Una tarjeta por paleta guardada, más la acción de crear otra.
  expect(tarjetasPaleta(renderer)).toEqual(['Paleta Mi paleta']);
  expect(boton(renderer, 'Crear paleta nueva')).toBeTruthy();

  act(() => renderer.unmount());
});

test('los tres colores comparten un solo juego de controles', async () => {
  const renderer = await renderEditorPersonalizado();
  const controles = renderer.root.findByProps({ testID: 'controles-paleta-compactos' });

  expect(controles.findByProps({ accessibilityLabel: 'Nombre de la paleta' })).toBeTruthy();
  expect(controles.findByProps({ accessibilityLabel: 'Fuente siguiente' })).toBeTruthy();

  // Un color a la vez: el Primario trae matiz y luminosidad, y solo esos.
  expect(barrasDe(controles)).toEqual(['Matiz de Primario', 'Luminosidad de Primario']);

  // El Fondo suma Saturación (para que su Matiz sirva) sin apilar otro bloque.
  elegirColor(renderer, 'Fondo');
  expect(barrasDe(controles)).toEqual([
    'Matiz de Fondo',
    'Saturación de Fondo',
    'Luminosidad de Fondo',
  ]);

  act(() => renderer.unmount());
});

test('cada color tiene barras accesibles y un campo hex para el valor exacto', async () => {
  const renderer = await renderEditorPersonalizado();

  ['Primario', 'Acento', 'Fondo'].forEach((color) => {
    elegirColor(renderer, color);

    const campos = renderer.root.findAll(
      (n) => n.props && n.props.accessibilityLabel === `Código hex de ${color}`,
    );
    expect(campos.length).toBeGreaterThan(0);

    // Las barras se exponen como control "adjustable" y anuncian un valor
    // numérico para los lectores de pantalla.
    const lum = renderer.root.findAll(
      (n) =>
        n.props &&
        n.props.accessibilityRole === 'adjustable' &&
        n.props.accessibilityLabel === `Luminosidad de ${color}`,
    )[0];
    expect(typeof lum.props.accessibilityValue.now).toBe('number');
  });

  act(() => renderer.unmount());
});

test('tocar una paleta la deja en edición y marcada como seleccionada', async () => {
  const renderer = await renderEditorPersonalizado();

  // Segunda paleta con nombre propio: la nueva queda en edición al guardarla.
  act(() => boton(renderer, 'Crear paleta nueva').props.onPress());
  act(() => campoNombre(renderer).props.onChangeText('Noche'));
  await act(async () => {
    boton(renderer, 'Guardar paleta').props.onPress();
    await Promise.resolve();
  });
  expect(paletaSeleccionada(renderer)).toBe('Paleta Noche');

  // Volver a la primera es un solo toque, y el editor pasa a sus datos.
  act(() => boton(renderer, 'Paleta Mi paleta').props.onPress());
  expect(paletaSeleccionada(renderer)).toBe('Paleta Mi paleta');
  expect(campoNombre(renderer).props.value).toBe('Mi paleta');

  act(() => renderer.unmount());
});

test('con el máximo de paletas la rejilla deja de ofrecer crear otra', async () => {
  const renderer = await renderEditorPersonalizado();

  // Arranca con una paleta: crea y guarda hasta llegar al tope.
  for (let i = 1; i < MAX_PALETAS; i += 1) {
    act(() => boton(renderer, 'Crear paleta nueva').props.onPress());
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      boton(renderer, 'Guardar paleta').props.onPress();
      await Promise.resolve();
    });
  }

  expect(tarjetasPaleta(renderer)).toHaveLength(MAX_PALETAS);
  expect(boton(renderer, 'Crear paleta nueva')).toBeUndefined();

  act(() => renderer.unmount());
});

// Sin esto, crear una paleta dejaba la rejilla sin nada marcado hasta guardar.
test('la paleta nueva sin guardar aparece marcada en la rejilla', async () => {
  const renderer = await renderEditorPersonalizado();

  act(() => boton(renderer, 'Crear paleta nueva').props.onPress());
  expect(paletaSeleccionada(renderer)).toBe('Paleta Paleta 2, sin guardar');
  // La guardada sigue ahí, sin marcar.
  expect(tarjetasPaleta(renderer)).toContain('Paleta Mi paleta');

  act(() => renderer.unmount());
});
