// El binario NO trae la vista nativa de Lottie. Es el estado real del
// dev-client hasta que se genere un build nuevo: `lottie-react-native` está en
// package.json y el JS resuelve, pero no hay vista que montar. Este archivo
// existe aparte porque la única forma limpia de reproducirlo es declarar el mock
// arriba de todo, antes de que nada importe el reproductor.
jest.mock('lottie-react-native', () => ({ __esModule: true, default: null }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import CelebracionLottie, { lottieDisponible } from '../mascota/animation/CelebracionLottie';
import MascotaAnimada from '../mascota/animation/MascotaAnimada';
import { esperaFin } from '../mascota/animation/celebraciones';

const Respaldo = () => <Text testID="respaldo">respaldo</Text>;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('la guarda detecta que el módulo nativo no está', () => {
  expect(lottieDisponible()).toBe(false);
});

test('dibuja el respaldo en lugar de la animación', () => {
  let r;
  act(() => {
    r = create(<CelebracionLottie tipo="subida-nivel" base={120} respaldo={<Respaldo />} />);
  });
  expect(r.root.findAllByProps({ testID: 'respaldo' }).length).toBeGreaterThan(0);
  expect(r.root.findAllByProps({ testID: 'lottie-view' })).toHaveLength(0);
  act(() => r.unmount());
});

test('sin respaldo tampoco rompe: simplemente no dibuja', () => {
  let r;
  act(() => { r = create(<CelebracionLottie tipo="confeti" base={120} />); });
  expect(r.toJSON()).toBeNull();
  act(() => r.unmount());
});

test('el respaldo no arma el techo de duración: se gobierna solo', () => {
  // El temporizador es para la animación de Lottie. La pieza de respaldo ya
  // sabe cuándo termina y llama a su propio onFin; duplicarlo cortaría la
  // celebración antes de tiempo.
  const antes = jest.getTimerCount();
  const onFin = jest.fn();
  let r;
  act(() => {
    r = create(
      <CelebracionLottie tipo="subida-nivel" base={120} onFin={onFin} respaldo={<Respaldo />} />,
    );
  });
  expect(jest.getTimerCount()).toBe(antes);
  act(() => { jest.advanceTimersByTime(esperaFin('subida-nivel') + 100); });
  expect(onFin).not.toHaveBeenCalled();
  act(() => r.unmount());
});

test('la mascota sigue mostrando sus partículas de siempre al acariciarla', () => {
  // Es la prueba de que un dev-client viejo no pierde nada: la caricia se ve
  // igual que antes de que existiera Lottie.
  let r;
  act(() => { r = create(<MascotaAnimada especie="perro" etapa={2} size={120} />); });
  const sprite = r.root.findByProps({ accessibilityRole: 'image' });

  act(() => {
    sprite.props.onPressIn({ nativeEvent: { locationX: 30, locationY: 40 } });
    sprite.props.onLongPress({ nativeEvent: { locationX: 30, locationY: 40 } });
  });
  expect(r.root.findAllByProps({ testID: 'particulas-caricia' }).length).toBeGreaterThan(0);
  expect(r.root.findAllByProps({ testID: 'lottie-view' })).toHaveLength(0);

  act(() => r.unmount());
});
