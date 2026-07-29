jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/Entrance', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function EntranceMock({ children, style }) {
    return <View style={style}>{children}</View>;
  };
});
jest.mock('../mascota/MascotaSprite', () => 'MascotaSprite');
jest.mock('../services/api', () => ({
  apiUpdateThemePreference: jest.fn().mockResolvedValue({}),
  apiUpdateMe: jest.fn().mockResolvedValue({}),
}));

import React from 'react';
import { act, create } from 'react-test-renderer';
import HabitatBg, { VARIANTES_HABITAT } from '../components/mascota/HabitatBg';
import TiendaScreen from '../mascota/tienda/TiendaScreen';
import {
  CATALOGO_COMPLETO, CATALOGO_TIENDA, CATALOGO_VESTIDOR, CATEGORIAS_TIENDA,
} from '../mascota/tienda/catalogo';
import { CATALOGO_ACCESORIOS } from '../mascota/sprites/accesorios';
import { ThemeProvider } from '../theme/ThemeContext';

const montar = async (ui) => {
  let renderer;
  await act(async () => {
    renderer = create(<ThemeProvider>{ui}</ThemeProvider>);
    await Promise.resolve();
    await Promise.resolve();
  });
  return renderer;
};

const accionPorTestId = (renderer, testID) => renderer.root.findAll((node) => (
  node.props.testID === testID && typeof node.props.onPress === 'function'
))[0];

test('el catálogo mantiene tres estantes comprables separados de los desbloqueos', () => {
  expect(CATEGORIAS_TIENDA.map(({ id }) => id)).toEqual([
    'sombreros',
    'accesorios',
    'habitat',
  ]);
  expect(new Set(CATALOGO_TIENDA.map(({ id }) => id)).size).toBe(CATALOGO_TIENDA.length);

  CATEGORIAS_TIENDA.forEach(({ id }) => {
    expect(CATALOGO_TIENDA.filter(({ categoria }) => categoria === id)).toHaveLength(3);
  });
  CATALOGO_TIENDA.forEach((item) => {
    expect(item.origen).toBe('tienda');
    expect(Number.isInteger(item.precio)).toBe(true);
    expect(item.precio).toBeGreaterThan(0);
  });
});

test('el estante del vestidor son piezas que se ganan, no que se compran', () => {
  expect(CATALOGO_VESTIDOR.length).toBeGreaterThan(0);
  for (const item of CATALOGO_VESTIDOR) {
    expect(item.origen).toBe('vestidor');
    // Nunca un precio: ofrecer "Comprar" algo que se gana por nivel sería
    // mentir sobre cómo funciona.
    expect(item.precio).toBeUndefined();
    expect(item.ranura).toBe('cabeza');
    expect(['sombreros', 'accesorios']).toContain(item.categoria);
    // El nivel que muestra la tarjeta es el mismo que exige el desbloqueo real.
    const real = CATALOGO_ACCESORIOS.find((a) => a.id === item.id);
    expect(real).toBeDefined();
    expect(item.nivel).toBe(real.nivel);
  }
});

test('el catálogo completo suma los dos estantes sin ids repetidos', () => {
  expect(CATALOGO_COMPLETO).toHaveLength(CATALOGO_VESTIDOR.length + CATALOGO_TIENDA.length);
  const ids = CATALOGO_COMPLETO.map(({ id }) => id);
  expect(new Set(ids).size).toBe(ids.length);
  // Lo que ya se puede llevar puesto va primero; lo aspiracional, después.
  expect(CATALOGO_COMPLETO[0].origen).toBe('vestidor');
});

test('una pieza del vestidor muestra su nivel y no un botón de compra', async () => {
  const onComprar = jest.fn();
  const renderer = await montar(
    <TiendaScreen
      monedas={99}
      especie="pinguino"
      etapa={2}
      desbloqueados={['gorrito-noche']}
      onComprar={onComprar}
    />,
  );

  // Desbloqueada: se anuncia como disponible y con su vista previa dibujada.
  const puesta = accionPorTestId(renderer, 'tienda-item-gorrito-noche');
  expect(puesta.props.accessibilityLabel).toContain('Ya está disponible en el vestidor');
  expect(renderer.root.findByProps({ testID: 'vestidor-preview-gorrito-noche' })).toBeTruthy();

  // Bloqueada: dice qué falta, y con saldo de sobra sigue sin poder comprarse.
  const bloqueada = accionPorTestId(renderer, 'tienda-item-gorrito-noche-b');
  expect(bloqueada.props.accessibilityLabel).toContain('Nivel 30 de cariño');
  expect(bloqueada.props.accessibilityState).toEqual({ disabled: true });
  act(() => bloqueada.props.onPress());
  expect(onComprar).not.toHaveBeenCalled();

  expect(renderer.root.findAllByProps({ children: 'Comprar' }).length).toBeGreaterThan(0);
  act(() => renderer.unmount());
});

test('HabitatBg ofrece tres paletas y separa ambiente, manta y planta', async () => {
  expect(VARIANTES_HABITAT).toEqual(['sereno', 'amanecer', 'nocturno']);
  const renderer = await montar(<HabitatBg variante="amanecer" />);
  const fondo = renderer.root.findByProps({ testID: 'habitat-bg' });

  expect(fondo.props.pointerEvents).toBe('none');
  expect(fondo.props.accessibilityElementsHidden).toBe(true);
  expect(renderer.root.findAll((node) => node.props.id === 'habitat-capa-ambiente')).toHaveLength(1);
  expect(renderer.root.findAll((node) => node.props.id === 'habitat-capa-manta')).toHaveLength(1);
  expect(renderer.root.findAll((node) => node.props.id === 'habitat-capa-planta')).toHaveLength(1);
  act(() => renderer.unmount());
});

test('muestra saldo, colección y estados de compra sin mutar datos locales', async () => {
  const onComprar = jest.fn();
  const renderer = await montar(
    <TiendaScreen
      monedas={6}
      nombreMascota="Lumi"
      comprados={['sombrero-brote']}
      onComprar={onComprar}
    />,
  );

  expect(renderer.root.findByProps({ children: '6 semillitas' })).toBeTruthy();
  expect(renderer.root.findByProps({ children: 'Capucha nube' })).toBeTruthy();
  expect(renderer.root.findAllByProps({ children: 'Pañuelito coral' })).toHaveLength(0);

  const capucha = accionPorTestId(renderer, 'tienda-item-capucha-nube');
  act(() => capucha.props.onPress());
  expect(onComprar).toHaveBeenCalledWith(expect.objectContaining({ id: 'capucha-nube' }));
  expect(renderer.root.findByProps({ children: '6 semillitas' })).toBeTruthy();

  const boina = accionPorTestId(renderer, 'tienda-item-boina-amanecer');
  expect(boina.props.accessibilityState).toEqual({ disabled: true });
  expect(boina.props.accessibilityLabel).toContain('Faltan 1 semillita');
  act(() => boina.props.onPress());
  expect(onComprar).toHaveBeenCalledTimes(1);

  const comprado = accionPorTestId(renderer, 'tienda-item-sombrero-brote');
  expect(comprado.props.accessibilityLabel).toContain('Ya está en su colección');
  expect(comprado.props.accessibilityState).toEqual({ disabled: true });
  act(() => renderer.unmount());
});

test('cambia a hábitat y muestra las tres habitaciones pastel', async () => {
  const renderer = await montar(<TiendaScreen monedas={20} onComprar={jest.fn()} />);
  const tabHabitat = renderer.root.findAll((node) => (
    node.props.accessibilityRole === 'tab'
      && node.props.accessibilityLabel === 'Hábitat'
      && typeof node.props.onPress === 'function'
  ))[0];

  act(() => tabHabitat.props.onPress());

  expect(renderer.root.findByProps({ children: 'Rincón sereno' })).toBeTruthy();
  expect(renderer.root.findByProps({ children: 'Luz de amanecer' })).toBeTruthy();
  expect(renderer.root.findByProps({ children: 'Noche acogedora' })).toBeTruthy();
  expect(renderer.root.findByProps({ testID: 'habitat-preview-rincon-sereno' })).toBeTruthy();
  expect(renderer.root.findAllByProps({ children: 'Capucha nube' })).toHaveLength(0);
  act(() => renderer.unmount());
});
