jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/wellness/RecompensaCompletada', () => 'RecompensaCompletada');
jest.mock('../mascota/animation/MascotaAnimada', () => 'MascotaAnimada');
jest.mock('../mascota/minijuegos/AtrapalaGame', () => {
  const React = require('react');
  const { Pressable } = require('react-native');
  return function AtrapalaMock({ onCompletar, screenReaderEnabled }) {
    return (
      <Pressable
        testID="atrapala-game"
        accessibilityLabel={screenReaderEnabled ? 'Atrápala accesible' : 'Atrápala estándar'}
        onPress={() => onCompletar({ puntuacion: 4, aciertos: 4 })}
      />
    );
  };
});
jest.mock('../mascota/minijuegos/RitmoCarinoGame', () => 'RitmoCarinoGame');

let mockFocusCleanup = null;
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
    Stack: { Screen: () => null },
    useFocusEffect: (callback) => React.useEffect(() => {
      const cleanup = callback();
      mockFocusCleanup = cleanup;
      return cleanup;
    }, [callback]),
  };
});

const mascotaDisponible = {
  id: 'pet-1',
  amistadId: 7,
  nombre: 'Lumi',
  especie: 'perro',
  personalidad: 'curiosa',
  nivelCarino: 20,
  energia: 50,
  monedas: 2,
  etapa: { numero: 2 },
  accesorios: { cabeza: null, color: null },
  minijuegos: {
    ATRAPALA: { puedeJugar: true, disponibleEn: null },
    RITMO_CARINO: { puedeJugar: false, disponibleEn: '2026-07-28T12:00:00.000Z' },
  },
};

const mockApiGetMascota = jest.fn();
const mockApiCompletarMinijuegoMascota = jest.fn();
const mockApiIniciarMinijuegoMascota = jest.fn();
jest.mock('../services/api', () => ({
  apiGetMascota: (...args) => mockApiGetMascota(...args),
  apiCompletarMinijuegoMascota: (...args) => mockApiCompletarMinijuegoMascota(...args),
  apiIniciarMinijuegoMascota: (...args) => mockApiIniciarMinijuegoMascota(...args),
  apiUpdateThemePreference: jest.fn().mockResolvedValue({}),
  apiUpdateMe: jest.fn().mockResolvedValue({}),
}));

import React from 'react';
import { Platform } from 'react-native';
import { act, create } from 'react-test-renderer';
import MinijuegoScreen from '../mascota/minijuegos/MinijuegoScreen';
import { ThemeProvider } from '../theme/ThemeContext';

const montar = async (slug = 'atrapala') => {
  let renderer;
  await act(async () => {
    renderer = create(
      <ThemeProvider>
        <MinijuegoScreen amistadId="7" slug={slug} />
      </ThemeProvider>,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return renderer;
};

// Comenzar abre la partida contra el backend, asi que el press ya no es sincrono.
const comenzar = async (renderer, etiqueta = 'Comenzar Atrápala') => {
  await act(async () => {
    renderer.root.findAllByProps({ accessibilityLabel: etiqueta })[0].props.onPress();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const SESION = 'v1.cuerpo.firma';

beforeEach(() => {
  mockFocusCleanup = null;
  mockApiIniciarMinijuegoMascota.mockReset().mockResolvedValue({
    sesion: SESION,
    expiraEn: '2026-07-27T13:00:00.000Z',
    duracionMinimaMs: 3000,
  });
  mockApiGetMascota.mockReset().mockResolvedValue({ mascota: mascotaDisponible });
  mockApiCompletarMinijuegoMascota.mockReset().mockResolvedValue({
    mascota: {
      ...mascotaDisponible,
      energia: 58,
      monedas: 4,
      minijuegos: {
        ...mascotaDisponible.minijuegos,
        ATRAPALA: { puedeJugar: false, disponibleEn: '2026-07-28T12:00:00.000Z' },
      },
    },
    minijuego: {
      tipo: 'ATRAPALA',
      puntuacion: 4,
      completadoEn: '2026-07-27T12:00:00.000Z',
      disponibleEn: '2026-07-28T12:00:00.000Z',
    },
    recompensa: { energia: 8, carino: 0, monedas: 2 },
  });
});

test('abre Atrápala, guarda el resultado del motor y muestra deltas efectivos', async () => {
  const renderer = await montar();
  await comenzar(renderer);

  await act(async () => {
    renderer.root.findByProps({ testID: 'atrapala-game' }).props.onPress();
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(mockApiIniciarMinijuegoMascota).toHaveBeenCalledWith('7', 'ATRAPALA');
  expect(mockApiCompletarMinijuegoMascota).toHaveBeenCalledWith('7', 'ATRAPALA', 4, SESION);
  expect(renderer.root.findByProps({ children: '4 encuentros' })).toBeTruthy();
  expect(renderer.root.findByProps({ children: '+8 energía' })).toBeTruthy();
  expect(renderer.root.findByProps({ children: '+2 semillitas' })).toBeTruthy();
  act(() => renderer.unmount());
});

test('sin ticket de partida no se juega y el aviso invita a volver a intentarlo', async () => {
  mockApiIniciarMinijuegoMascota.mockRejectedValue(new Error('Network request failed'));
  const renderer = await montar();
  await comenzar(renderer);

  expect(renderer.root.findAllByProps({ testID: 'atrapala-game' })).toHaveLength(0);
  expect(renderer.root.findByProps({ children: 'El momento sigue aquí. Puedes intentar guardarlo otra vez sin repetir el juego.' })).toBeTruthy();
  expect(renderer.root.findAllByProps({ accessibilityLabel: 'Comenzar Atrápala' }).length).toBeGreaterThan(0);
  act(() => renderer.unmount());
});

test('si el juego ya se jugó desde otro dispositivo, abrir muestra el descanso', async () => {
  const error = new Error('Este minijuego está tomando una pausa.');
  error.status = 429;
  error.codigo = 'EN_DESCANSO';
  error.disponibleEn = '2026-07-28T12:00:00.000Z';
  mockApiIniciarMinijuegoMascota.mockRejectedValue(error);

  const renderer = await montar();
  await comenzar(renderer);

  expect(renderer.root.findByProps({ children: 'Ya hay una partida registrada para este juego' })).toBeTruthy();
  expect(mockApiCompletarMinijuegoMascota).not.toHaveBeenCalled();
  act(() => renderer.unmount());
});

test('un ticket rechazado no ofrece reintentar el mismo guardado', async () => {
  const error = new Error('No pudimos registrar esta partida.');
  error.status = 400;
  error.codigo = 'SESION_INVALIDA';
  mockApiCompletarMinijuegoMascota.mockRejectedValue(error);

  const renderer = await montar();
  await comenzar(renderer);
  await act(async () => {
    renderer.root.findByProps({ testID: 'atrapala-game' }).props.onPress();
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(renderer.root.findByProps({ children: 'El momento no quedó registrado' })).toBeTruthy();
  expect(renderer.root.findAllByProps({ children: 'Intentar guardar otra vez' })).toHaveLength(0);
  expect(mockApiGetMascota).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});

test('un juego en cooldown muestra descanso y no ofrece comenzar', async () => {
  const renderer = await montar('ritmo-carino');
  expect(renderer.root.findByProps({ children: 'Este juego toma una pausa' })).toBeTruthy();
  expect(renderer.root.findAllByProps({ accessibilityLabel: 'Comenzar Ritmo de cariño' })).toHaveLength(0);
  act(() => renderer.unmount());
});

test.each([
  ['ausente', undefined],
  ['a medias', { ATRAPALA: { puedeJugar: true, disponibleEn: null } }],
])('con contrato de cooldown %s mantiene una salida segura y no inicia a ciegas', async (_, minijuegos) => {
  mockApiGetMascota.mockResolvedValue({ mascota: { ...mascotaDisponible, minijuegos } });
  const renderer = await montar();
  expect(renderer.root.findByProps({ children: 'Los juegos se están preparando' })).toBeTruthy();
  expect(mockApiIniciarMinijuegoMascota).not.toHaveBeenCalled();
  expect(mockApiCompletarMinijuegoMascota).not.toHaveBeenCalled();
  act(() => renderer.unmount());
});

test('reconcilia el detalle si la red cae despues de que el backend confirma', async () => {
  const mascotaConfirmada = {
    ...mascotaDisponible,
    energia: 58,
    monedas: 4,
    minijuegos: {
      ...mascotaDisponible.minijuegos,
      ATRAPALA: { puedeJugar: false, disponibleEn: '2026-07-28T12:00:00.000Z' },
    },
  };
  mockApiGetMascota
    .mockReset()
    .mockResolvedValueOnce({ mascota: mascotaDisponible })
    .mockResolvedValueOnce({ mascota: mascotaConfirmada });
  mockApiCompletarMinijuegoMascota.mockRejectedValue(new Error('Network request failed'));

  const renderer = await montar();
  await comenzar(renderer);
  await act(async () => {
    renderer.root.findByProps({ testID: 'atrapala-game' }).props.onPress();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(mockApiGetMascota).toHaveBeenCalledTimes(2);
  expect(renderer.root.findByProps({ children: 'Ya hay una partida registrada para este juego' })).toBeTruthy();
  expect(renderer.root.findAllByProps({ children: 'Intentar guardar otra vez' })).toHaveLength(0);
  act(() => renderer.unmount());
});

test('al perder foco desmonta el motor sin completar ni consumir cooldown', async () => {
  const renderer = await montar();
  await comenzar(renderer);
  expect(renderer.root.findByProps({ testID: 'atrapala-game' })).toBeTruthy();

  act(() => mockFocusCleanup());
  expect(renderer.root.findAllByProps({ testID: 'atrapala-game' })).toHaveLength(0);
  expect(mockApiCompletarMinijuegoMascota).not.toHaveBeenCalled();
  act(() => renderer.unmount());
});

test('en web no activa el falso positivo del lector y ofrece eleccion explicita', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  let renderer;
  try {
    renderer = await montar();
    expect(renderer.root.findByProps({ children: 'Usar modo accesible' })).toBeTruthy();

    const selector = renderer.root.findAll((node) => (
      node.props.accessibilityState?.selected === false
        && typeof node.props.onPress === 'function'
    ))[0];
    act(() => selector.props.onPress());
    await comenzar(renderer);
    expect(renderer.root.findByProps({ accessibilityLabel: 'Atrápala accesible' })).toBeTruthy();
  } finally {
    if (renderer) act(() => renderer.unmount());
    Object.defineProperty(Platform, 'OS', descriptor);
  }
});
