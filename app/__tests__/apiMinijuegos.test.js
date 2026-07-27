jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiCompletarMinijuegoMascota } from '../services/api';
import { API_URL } from '../config';

const respuestaHttp = (body, { ok = true, status = 201 } = {}) => ({
  ok,
  status,
  json: async () => body,
});

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

test('completa una partida con auth y solo envia la puntuacion', async () => {
  global.fetch.mockResolvedValue(respuestaHttp(exito));

  await expect(apiCompletarMinijuegoMascota(7, 'ATRAPALA', 8)).resolves.toEqual(exito);

  expect(global.fetch).toHaveBeenCalledWith(
    `${API_URL}/api/mascota/7/minijuegos/ATRAPALA/completar`,
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer token-minijuegos' }),
      body: JSON.stringify({ puntuacion: 8 }),
    }),
  );
});

test('un 429 conserva status y fecha para mostrar el descanso suave', async () => {
  const disponibleEn = '2026-07-28T12:00:00.000Z';
  global.fetch.mockResolvedValue(respuestaHttp(
    { error: 'Este minijuego esta tomando una pausa.', disponibleEn },
    { ok: false, status: 429 },
  ));

  await expect(apiCompletarMinijuegoMascota(7, 'ATRAPALA', 5)).rejects.toMatchObject({
    message: 'Este minijuego esta tomando una pausa.',
    status: 429,
    disponibleEn,
  });
});

test('rechaza un 201 malformado en vez de ocultar el problema de contrato', async () => {
  global.fetch.mockResolvedValue(respuestaHttp({ mascota: exito.mascota }));
  await expect(apiCompletarMinijuegoMascota(7, 'ATRAPALA', 3)).rejects.toThrow(
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
  await expect(apiCompletarMinijuegoMascota(7, 'ATRAPALA', 8)).rejects.toThrow(
    'Respuesta inválida del minijuego',
  );
});

test('propaga un fallo de red para poder reintentar sin repetir la partida', async () => {
  global.fetch.mockRejectedValue(new Error('Network request failed'));
  await expect(apiCompletarMinijuegoMascota(7, 'RITMO_CARINO', 6)).rejects.toThrow(
    'Network request failed',
  );
});
