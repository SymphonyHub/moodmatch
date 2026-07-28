jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { act, create } from 'react-test-renderer';
import VestidorAccesorios from '../mascota/vestidor';
import MascotaSprite from '../mascota/MascotaSprite';
import { CATALOGO_ACCESORIOS } from '../mascota/sprites/accesorios';
import { ThemeProvider } from '../theme/ThemeContext';

const montar = async (ui) => {
  let renderer;
  await act(async () => {
    renderer = create(<ThemeProvider>{ui}</ThemeProvider>);
    await Promise.resolve();
  });
  return renderer;
};

const casilla = (renderer, id) => renderer.root.findAll((n) => (
  n.props.testID === `accesorio-${id}` && typeof n.props.onPress === 'function'
))[0];

const accesorios = {
  desbloqueados: ['gorrito', 'lentes-sol', 'lunares'],
  cabeza: 'lentes-sol',
  color: null,
};

test('dibuja una casilla por accesorio del catálogo, en sus dos grupos', async () => {
  const renderer = await montar(
    <VestidorAccesorios accesorios={accesorios} especie="pinguino" etapa={2} />,
  );
  for (const item of CATALOGO_ACCESORIOS) {
    expect(casilla(renderer, item.id)).toBeTruthy();
  }
  expect(renderer.root.findByProps({ children: 'Cabeza y rostro' })).toBeTruthy();
  expect(renderer.root.findByProps({ children: 'Color y patrón' })).toBeTruthy();
  act(() => renderer.unmount());
});

test('cada vista previa dibuja la mascota REAL con la pieza puesta', async () => {
  // Es lo que distingue un vestidor de una lista de nombres: la casilla del
  // gorro tiene que mostrar el gorro sobre la especie y la etapa de esta
  // mascota, no un ícono genérico.
  const renderer = await montar(
    <VestidorAccesorios accesorios={accesorios} especie="dinosaurio" etapa={3} />,
  );
  // Por tipo y no por props: `especie` viaja por varios niveles del árbol
  // (la casilla, la vista previa y el sprite), y contar props daría de más.
  const sprites = renderer.root.findAllByType(MascotaSprite);
  expect(sprites).toHaveLength(CATALOGO_ACCESORIOS.length);
  for (const sprite of sprites) {
    expect(sprite.props.especie).toBe('dinosaurio');
    expect(sprite.props.etapa).toBe(3);
  }

  const conGorrito = sprites.filter((n) => n.props.accesorioCabeza === 'gorrito-noche');
  expect(conGorrito.length).toBe(1);
  // Un accesorio de cabeza no se cuela por la ranura de color ni al revés.
  expect(conGorrito[0].props.accesorioColor).toBeNull();
  const conLunares = sprites.filter((n) => n.props.accesorioColor === 'lunares');
  expect(conLunares.length).toBe(1);
  expect(conLunares[0].props.accesorioCabeza).toBeNull();
  act(() => renderer.unmount());
});

test('lo desbloqueado se equipa y lo bloqueado no responde', async () => {
  const onEquipar = jest.fn();
  const renderer = await montar(
    <VestidorAccesorios accesorios={accesorios} especie="pinguino" etapa={2} onEquipar={onEquipar} />,
  );

  const libre = casilla(renderer, 'gorrito');
  expect(libre.props.accessibilityState).toEqual({ selected: false, disabled: false });
  act(() => libre.props.onPress());
  expect(onEquipar).toHaveBeenCalledWith('cabeza', 'gorrito');

  const bloqueado = casilla(renderer, 'corona');
  expect(bloqueado.props.accessibilityLabel).toContain('bloqueado');
  expect(bloqueado.props.accessibilityLabel).toContain('Nivel 36 de cariño');
  expect(bloqueado.props.accessibilityState).toEqual({ selected: false, disabled: true });
  act(() => bloqueado.props.onPress());
  expect(onEquipar).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});

test('lo que ya está puesto se anuncia como "quitar"', async () => {
  const onEquipar = jest.fn();
  const renderer = await montar(
    <VestidorAccesorios accesorios={accesorios} especie="pinguino" etapa={2} onEquipar={onEquipar} />,
  );
  const puesto = casilla(renderer, 'lentes-sol');
  expect(puesto.props.accessibilityLabel).toBe('Quitar Lentes redondos');
  expect(puesto.props.accessibilityState).toEqual({ selected: true, disabled: false });
  act(() => puesto.props.onPress());
  expect(onEquipar).toHaveBeenCalledWith('cabeza', 'lentes-sol');
  act(() => renderer.unmount());
});

test('los destellos salen al poner algo, no al quitarlo', async () => {
  const renderer = await montar(
    <VestidorAccesorios accesorios={accesorios} especie="pinguino" etapa={2} onEquipar={jest.fn()} />,
  );

  // Quitar no es un logro: celebrarlo se leería como que pasó algo bueno.
  act(() => casilla(renderer, 'lentes-sol').props.onPress());
  expect(renderer.root.findAllByProps({ testID: 'destellos-lentes-sol' })).toHaveLength(0);

  act(() => casilla(renderer, 'gorrito').props.onPress());
  expect(renderer.root.findAllByProps({ testID: 'destellos-gorrito' }).length).toBeGreaterThan(0);
  act(() => renderer.unmount());
});

test('sin accesorios cargados no rompe: todo aparece bloqueado', async () => {
  const renderer = await montar(<VestidorAccesorios especie="pinguino" etapa={1} />);
  for (const item of CATALOGO_ACCESORIOS) {
    expect(casilla(renderer, item.id).props.accessibilityState.disabled).toBe(true);
  }
  act(() => renderer.unmount());
});
