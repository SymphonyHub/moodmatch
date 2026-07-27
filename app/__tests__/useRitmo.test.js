import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';
import { useRitmo } from '../mascota/animation/useRitmo';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

// Motor compartido por el parpadeo variable y el gesto por inactividad. Como es
// puro JS (el temporizador no vive en un worklet), acá sí se puede verificar.
function Sonda({ espera = 1000, ...opciones }) {
  useRitmo({ planear: (vuelta) => ({ esperaMs: espera, vuelta }), ...opciones });
  return <Text>sonda</Text>;
}

const montar = (props) => {
  let renderer;
  act(() => { renderer = create(<Sonda {...props} />); });
  return renderer;
};

test('ejecuta al vencer la espera y se reprograma sola', () => {
  const hecho = [];
  const renderer = montar({ hacer: (plan) => hecho.push(plan.vuelta), espera: 1000 });

  act(() => { jest.advanceTimersByTime(3500); });
  expect(hecho).toEqual([0, 1, 2]);

  act(() => renderer.unmount());
});

test('la vuelta crece, que es lo que deja espaciar el ciclo', () => {
  const esperas = [];
  const renderer = montar({
    planear: (vuelta) => {
      const esperaMs = 100 * (vuelta + 1);
      esperas.push(esperaMs);
      return { esperaMs };
    },
    hacer: () => {},
  });

  act(() => { jest.advanceTimersByTime(1000); });
  expect(esperas.slice(0, 4)).toEqual([100, 200, 300, 400]);

  act(() => renderer.unmount());
});

test('con activo en false no programa nada y avisa que paró', () => {
  const alParar = jest.fn();
  const hacer = jest.fn();
  const antes = jest.getTimerCount();
  const renderer = montar({ activo: false, hacer, alParar });

  expect(jest.getTimerCount()).toBe(antes);
  expect(alParar).toHaveBeenCalledTimes(1);

  act(() => { jest.advanceTimersByTime(10000); });
  expect(hacer).not.toHaveBeenCalled();

  act(() => renderer.unmount());
});

test('apagarlo en caliente corta el ciclo', () => {
  const hacer = jest.fn();
  let renderer;
  act(() => { renderer = create(<Sonda hacer={hacer} espera={500} activo />); });

  act(() => { jest.advanceTimersByTime(1200); });
  expect(hacer).toHaveBeenCalledTimes(2);

  act(() => { renderer.update(<Sonda hacer={hacer} espera={500} activo={false} />); });
  act(() => { jest.advanceTimersByTime(5000); });
  expect(hacer).toHaveBeenCalledTimes(2);

  act(() => renderer.unmount());
});

test('cambiar el reinicio arranca el conteo de cero', () => {
  const vueltas = [];
  const props = (reinicio) => ({
    hacer: (plan) => vueltas.push(plan.vuelta), espera: 1000, reinicio,
  });

  let renderer;
  act(() => { renderer = create(<Sonda {...props(0)} />); });
  act(() => { jest.advanceTimersByTime(2500); });
  expect(vueltas).toEqual([0, 1]);

  act(() => { renderer.update(<Sonda {...props(1)} />); });
  act(() => { jest.advanceTimersByTime(1500); });
  expect(vueltas).toEqual([0, 1, 0]);

  act(() => renderer.unmount());
});

test('no se reinicia porque el componente vuelva a renderizar', () => {
  // Las funciones se pasan inline en cada render: si el ciclo dependiera de su
  // identidad, un render de más lo reiniciaría y el parpadeo nunca llegaría.
  const hacer = jest.fn();
  let renderer;
  act(() => { renderer = create(<Sonda hacer={hacer} espera={1000} />); });

  act(() => { jest.advanceTimersByTime(900); });
  act(() => { renderer.update(<Sonda hacer={hacer} espera={1000} />); });
  act(() => { jest.advanceTimersByTime(200); });

  expect(hacer).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});

test('al desmontar no deja timers colgados', () => {
  const antes = jest.getTimerCount();
  const alParar = jest.fn();
  const renderer = montar({ hacer: () => {}, alParar });
  expect(jest.getTimerCount()).toBe(antes + 1);

  act(() => renderer.unmount());
  expect(jest.getTimerCount()).toBe(antes);
  expect(alParar).toHaveBeenCalled();
});
