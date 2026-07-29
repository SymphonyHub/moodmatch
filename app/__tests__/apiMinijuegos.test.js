jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  apiCompletarMinijuegoMascota,
  apiIniciarMinijuegoMascota,
} from '../services/api';
import { API_URL } from '../config';

const respuestaHttp = (body, { ok = true, status = 201 } = {}) => ({
  ok,
  status,
  json: async () => body,
});

const SESION = 'v1.eyJ2IjoidjEifQ.firma';

const inicio = {
  sesion: SESION,
  expiraEn: '2026-07-27T13:00:00.000Z',
  duracionMinimaMs: 3000,
};

const exito = {
  mascota: {
    id: 'pet-1',
    amistadId: 7,
    energia: 66,
    monedas: 4,
    minijuegos: {
      ATRAPALA: { puedeJugar: false, disponibleEn: '2026-07-28T12:00:00.000Z' },
      RITMO_CARINO: { puedeJugar: true, disponibleEn: null },
    },
  },
  minijuego: {
    tipo: 'ATRAPALA',
    puntuacion: 8,
    completadoEn: '2026-07-27T12:00:00.000Z',
    disponibleEn: '2026-07-28T12:00:00.000Z',
  },
  recompensa: { energia: 16, carino: 0, monedas: 3 },
};

beforeEach(async () => {
  await AsyncStorage.setItem('token', 'token-minijuegos');
  global.fetch = jest.fn();
});

afterAll(() => {
  delete global.fetch;
});

describe('apiIniciarMinijuegoMascota', () => {
  test('abre la partida con auth y sin enviar tiempo del cliente', async () => {
    global.fetch.mockResolvedValue(respuestaHttp(inicio));

    await expect(apiIniciarMinijuegoMascota(7, 'ATRAPALA')).resolves.toEqual(inicio);

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_URL}/api/mascota/7/minijuegos/ATRAPALA/iniciar`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token-minijuegos' }),
      }),
    );
    expect(global.fetch.mock.calls[0][1]).not.toHaveProperty('body');
  });

  test('rechaza un ticket sin firma o sin limite en vez de dejar jugar en falso', async () => {
    global.fetch.mockResolvedValue(respuestaHttp({ expiraEn: inicio.expiraEn }));
    await expect(apiIniciarMinijuegoMascota(7, 'ATRAPALA')).rejects.toThrow(
      'Respuesta inválida del minijuego',
    );
  });

  test('un 429 al abrir conserva status, codigo y disponibilidad', async () => {
    const disponibleEn = '2026-07-28T12:00:00.000Z';
    global.fetch.mockResolvedValue(respuestaHttp(
      { error: 'Este minijuego está tomando una pausa.', codigo: 'EN_DESCANSO', disponibleEn },
      { ok: false, status: 429 },
    ));

    await expect(apiIniciarMinijuegoMascota(7, 'ATRAPALA')).rejects.toMatchObject({
      status: 429,
      codigo: 'EN_DESCANSO',
      disponibleEn,
    });
  });
});

describe('apiCompletarMinijuegoMascota', () => {
  test('envia puntuacion y ticket de la partida', async () => {
    global.fetch.mockResolvedValue(respuestaHttp(exito));

    await expect(apiCompletarMinijuegoMascota(7, 'ATRAPALA', 8, SESION)).resolves.toEqual(exito);

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_URL}/api/mascota/7/minijuegos/ATRAPALA/completar`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token-minijuegos' }),
        body: JSON.stringify({ puntuacion: 8, sesion: SESION }),
      }),
    );
  });

  test('un 429 conserva status y fecha para mostrar el descanso suave', async () => {
    const disponibleEn = '2026-07-28T12:00:00.000Z';
    global.fetch.mockResolvedValue(respuestaHttp(
      { error: 'Este minijuego esta tomando una pausa.', disponibleEn },
      { ok: false, status: 429 },
    ));

    await expect(apiCompletarMinijuegoMascota(7, 'ATRAPALA', 5, SESION)).rejects.toMatchObject({
      message: 'Este minijuego esta tomando una pausa.',
      status: 429,
      disponibleEn,
    });
  });

  test('un ticket rechazado propaga el codigo para no ofrecer un reintento inutil', async () => {
    global.fetch.mockResolvedValue(respuestaHttp(
      { error: 'No pudimos registrar esta partida.', codigo: 'SESION_INVALIDA' },
      { ok: false, status: 400 },
    ));

    await expect(apiCompletarMinijuegoMascota(7, 'ATRAPALA', 8, SESION)).rejects.toMatchObject({
      status: 400,
      codigo: 'SESION_INVALIDA',
    });
  });

  test('rechaza un 201 malformado en vez de ocultar el problema de contrato', async () => {
    global.fetch.mockResolvedValue(respuestaHttp({ mascota: exito.mascota }));
    await expect(apiCompletarMinijuegoMascota(7, 'ATRAPALA', 3, SESION)).rejects.toThrow(
      'Respuesta inválida del minijuego',
    );
  });

  test('rechaza estados de cooldown contradictorios', async () => {
    global.fetch.mockResolvedValue(respuestaHttp({
      ...exito,
      mascota: {
        ...exito.mascota,
        minijuegos: {
          ...exito.mascota.minijuegos,
          ATRAPALA: { puedeJugar: true, disponibleEn: '2026-07-28T12:00:00.000Z' },
        },
      },
    }));
    await expect(apiCompletarMinijuegoMascota(7, 'ATRAPALA', 8, SESION)).rejects.toThrow(
      'Respuesta inválida del minijuego',
    );
  });

  test('rechaza un 201 que deja el juego jugado como disponible', async () => {
    global.fetch.mockResolvedValue(respuestaHttp({
      ...exito,
      mascota: {
        ...exito.mascota,
        minijuegos: {
          ...exito.mascota.minijuegos,
          ATRAPALA: { puedeJugar: true, disponibleEn: null },
        },
      },
    }));
    await expect(apiCompletarMinijuegoMascota(7, 'ATRAPALA', 8, SESION)).rejects.toThrow(
      'Respuesta inválida del minijuego',
    );
  });

  test('propaga un fallo de red para poder reintentar sin repetir la partida', async () => {
    global.fetch.mockRejectedValue(new Error('Network request failed'));
    await expect(apiCompletarMinijuegoMascota(7, 'RITMO_CARINO', 6, SESION)).rejects.toThrow(
      'Network request failed',
    );
  });
});
