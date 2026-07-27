jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../components/wellness/RecompensaCompletada', () => 'RecompensaCompletada');
jest.mock('../components/Tappable', () => {
  const React = require('react');
  const { Pressable } = require('react-native');
  return function TappableMock({ children, onPress, disabled, wrapperStyle, ...props }) {
    return (
      <Pressable onPress={onPress} disabled={disabled} {...props}>
        {children}
      </Pressable>
    );
  };
});
jest.mock('../theme/ThemeContext', () => {
  const { THEMES, DEFAULT_THEME_ID } = require('../theme/themes');
  const theme = THEMES[DEFAULT_THEME_ID];
  return {
    makeThemedStyles: (factory) => () => factory(theme),
    useMotionPrefs: () => ({ reduceMotion: false, hapticsEnabled: false }),
  };
});
jest.mock('../mascota/animation/MascotaAnimada', () => {
  const React = require('react');
  const { Pressable } = require('react-native');
  return function MascotaAnimadaMock({ onTocar }) {
    return <Pressable testID="mascota-animada" onPress={onTocar} />;
  };
});

import React from 'react';
import { act, create } from 'react-test-renderer';
import AtrapalaGame from '../mascota/minijuegos/AtrapalaGame';
import RitmoCarinoGame from '../mascota/minijuegos/RitmoCarinoGame';
import {
  ATRAPALA_OPORTUNIDADES,
  ATRAPALA_PAUSA_MS,
  ATRAPALA_VENTANA_MS,
} from '../mascota/minijuegos/logica';

const mascota = {
  nombre: 'Lumi',
  especie: 'perro',
  personalidad: 'curiosa',
  etapa: { numero: 2 },
  accesorios: { cabeza: null, color: null },
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-07-27T12:00:00.000Z'));
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

const montarAtrapala = (onCompletar, props = {}) => {
  let renderer;
  act(() => {
    renderer = create(<AtrapalaGame mascota={mascota} onCompletar={onCompletar} {...props} />);
  });
  act(() => renderer.root.findByProps({ testID: 'atrapala-escenario' }).props.onLayout({
    nativeEvent: { layout: { width: 320, height: 350 } },
  }));
  return renderer;
};

test('Atrápala completa ocho encuentros, suma una vez por aparicion y limpia timers', () => {
  const onCompletar = jest.fn();
  const renderer = montarAtrapala(onCompletar);

  for (let ronda = 0; ronda < ATRAPALA_OPORTUNIDADES; ronda += 1) {
    const objetivo = renderer.root.findByProps({ testID: 'mascota-animada' });
    act(() => {
      objetivo.props.onPress();
      objetivo.props.onPress();
    });
    if (ronda === 0) {
      act(() => renderer.root.findByProps({ testID: 'atrapala-escenario' }).props.onLayout({
        nativeEvent: { layout: { width: 321, height: 350 } },
      }));
    }
    act(() => jest.advanceTimersByTime(ATRAPALA_PAUSA_MS));
  }

  expect(onCompletar).toHaveBeenCalledTimes(1);
  expect(onCompletar).toHaveBeenCalledWith({ puntuacion: 8, aciertos: 8 });

  act(() => renderer.unmount());
  expect(jest.getTimerCount()).toBe(0);
});

test('Atrápala tambien termina sin encuentros y nunca deja un loop pendiente', () => {
  const onCompletar = jest.fn();
  const renderer = montarAtrapala(onCompletar);

  for (let ronda = 0; ronda < ATRAPALA_OPORTUNIDADES; ronda += 1) {
    act(() => jest.advanceTimersByTime(ATRAPALA_VENTANA_MS + ATRAPALA_PAUSA_MS));
  }

  expect(onCompletar).toHaveBeenCalledWith({ puntuacion: 0, aciertos: 0 });
  act(() => renderer.unmount());
  expect(jest.getTimerCount()).toBe(0);
});

test('Atrápala ofrece una diana estable y accionable con lector de pantalla', () => {
  const onCompletar = jest.fn();
  const renderer = montarAtrapala(onCompletar, { screenReaderEnabled: true });

  for (let ronda = 0; ronda < ATRAPALA_OPORTUNIDADES; ronda += 1) {
    const objetivo = renderer.root.findAll((node) => (
      typeof node.props.accessibilityLabel === 'string'
        && node.props.accessibilityLabel.startsWith('Atrapar a Lumi')
    ))[0];
    act(() => objetivo.props.onPress());
    act(() => jest.advanceTimersByTime(ATRAPALA_PAUSA_MS));
  }

  expect(onCompletar).toHaveBeenCalledWith({ puntuacion: 8, aciertos: 8 });
  act(() => renderer.unmount());
  expect(jest.getTimerCount()).toBe(0);
});

test('Ritmo de cariño registra cinco centros perfectos y completa con diez puntos', () => {
  const onCompletar = jest.fn();
  let renderer;
  act(() => {
    renderer = create(<RitmoCarinoGame mascota={mascota} reduceMotion onCompletar={onCompletar} />);
  });

  for (let ronda = 0; ronda < 5; ronda += 1) {
    act(() => jest.advanceTimersByTime(600));
    const barra = renderer.root.findAllByProps({ accessibilityLabel: 'Marcar el ritmo de cariño' })[0];
    act(() => {
      barra.props.onPress();
      barra.props.onPress();
    });
    act(() => jest.advanceTimersByTime(720));
  }

  expect(onCompletar).toHaveBeenCalledTimes(1);
  expect(onCompletar).toHaveBeenCalledWith({ puntuacion: 10, puntos: 10 });
  act(() => renderer.unmount());
  expect(jest.getTimerCount()).toBe(0);
});

test('Ritmo usa pasos discretos con movimiento reducido sin perder la mecanica', () => {
  let renderer;
  act(() => {
    renderer = create(<RitmoCarinoGame mascota={mascota} reduceMotion onCompletar={jest.fn()} />);
  });

  act(() => jest.advanceTimersByTime(600));
  const indicador = renderer.root.findAll((node) => (
    Array.isArray(node.props.style)
      && node.props.style.some((style) => style?.left === '50%')
  ))[0];
  expect(indicador).toBeTruthy();

  act(() => renderer.unmount());
  expect(jest.getTimerCount()).toBe(0);
});

test('Ritmo permite avanzar y marcar cada ronda con lector de pantalla', () => {
  const onCompletar = jest.fn();
  let renderer;
  act(() => {
    renderer = create(
      <RitmoCarinoGame mascota={mascota} screenReaderEnabled onCompletar={onCompletar} />,
    );
  });

  for (let ronda = 0; ronda < 5; ronda += 1) {
    const avanzar = renderer.root.findAllByProps({ accessibilityLabel: 'Avanzar el indicador un paso' })[0];
    act(() => {
      avanzar.props.onPress();
      avanzar.props.onPress();
    });
    expect(renderer.root.findAllByProps({
      children: 'El indicador está en la zona de cariño.',
    }).length).toBeGreaterThan(0);
    const marcar = renderer.root.findAllByProps({ accessibilityLabel: 'Marcar esta posición' })[0];
    act(() => marcar.props.onPress());
    act(() => jest.advanceTimersByTime(720));
  }

  expect(onCompletar).toHaveBeenCalledWith({ puntuacion: 10, puntos: 10 });
  act(() => renderer.unmount());
  expect(jest.getTimerCount()).toBe(0);
});
