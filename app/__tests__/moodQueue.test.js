jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MOOD_QUEUE_KEY,
  capturarMoodEntry,
  crearClientId,
  encolarMoodEntry,
  huellaToken,
  leerPendientes,
  sincronizarMoodEntries,
} from '../features/wellness/moodQueue';

const tokenPara = (userId, firma = 'firma') => {
  const payload = Buffer.from(JSON.stringify({ userId })).toString('base64url');
  return `header.${payload}.${firma}`;
};
const TOKEN_A = tokenPara(1);
const TOKEN_A_RENOVADO = tokenPara(1, 'firma-nueva');
const TOKEN_B = tokenPara(2);
const CLIENT_A = '5d2f6a10-e73c-4fe2-8f40-923d59f9b561';
const CLIENT_B = '61bb5017-7ee9-4c88-9b70-81aac47e1089';

beforeEach(async () => {
  await AsyncStorage.clear();
});

const entrada = (clientId, moodType = 'FELIZ') => ({
  clientId,
  moodType,
  nota: null,
  capturedAt: '2026-07-20T12:00:00.000Z',
});

describe('cola offline de registros de ánimo', () => {
  test('genera UUID v4 válido y una huella de sesión estable', () => {
    expect(crearClientId(1234, () => 0.25)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(huellaToken(TOKEN_A)).toBe(huellaToken(TOKEN_A));
    expect(huellaToken(TOKEN_A)).toBe(huellaToken(TOKEN_A_RENOVADO));
    expect(huellaToken(TOKEN_A)).not.toBe(huellaToken(TOKEN_B));
  });

  test('escribe antes de enviar y conserva la entrada cuando no hay red', async () => {
    const enviar = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    const resultado = await capturarMoodEntry('TRISTE', 'día difícil', {
      token: TOKEN_A,
      clientId: CLIENT_A,
      enviar,
    });

    expect(resultado).toEqual({ estado: 'pendiente', clientId: CLIENT_A });
    await expect(leerPendientes(TOKEN_A)).resolves.toEqual([
      expect.objectContaining({ clientId: CLIENT_A, moodType: 'TRISTE', nota: 'día difícil' }),
    ]);
  });

  test('una captura online se elimina solamente después de confirmarse', async () => {
    const data = { moodEntry: { id: 8 }, actividadSugerida: { id: 2 } };
    const resultado = await capturarMoodEntry('CALMADO', null, {
      token: TOKEN_A,
      clientId: CLIENT_A,
      enviar: jest.fn().mockResolvedValue(data),
    });

    expect(resultado).toEqual({ estado: 'sincronizada', clientId: CLIENT_A, data });
    await expect(leerPendientes(TOKEN_A)).resolves.toEqual([]);
  });

  test('encolados concurrentes no se pisan y el mismo clientId no se duplica', async () => {
    await Promise.all([
      encolarMoodEntry(entrada(CLIENT_A), TOKEN_A),
      encolarMoodEntry(entrada(CLIENT_B, 'NEUTRO'), TOKEN_A),
      encolarMoodEntry(entrada(CLIENT_A), TOKEN_A),
    ]);

    await expect(leerPendientes(TOKEN_A)).resolves.toHaveLength(2);
  });

  test('aísla la cola por sesión', async () => {
    await encolarMoodEntry(entrada(CLIENT_A), TOKEN_A);
    await encolarMoodEntry(entrada(CLIENT_B), TOKEN_B);

    await expect(leerPendientes(TOKEN_A)).resolves.toEqual([
      expect.objectContaining({ clientId: CLIENT_A }),
    ]);
    await expect(leerPendientes(TOKEN_B)).resolves.toEqual([
      expect.objectContaining({ clientId: CLIENT_B }),
    ]);
  });

  test('sincroniza pendientes y reusa exactamente el clientId persistido', async () => {
    await encolarMoodEntry(entrada(CLIENT_A, 'ANSIOSO'), TOKEN_A);
    const enviar = jest.fn().mockResolvedValue({ moodEntry: { id: 11 }, actividadSugerida: { id: 3 } });

    const resultado = await sincronizarMoodEntries({ token: TOKEN_A, enviar });

    expect(enviar).toHaveBeenCalledWith(
      'ANSIOSO',
      null,
      CLIENT_A,
      '2026-07-20T12:00:00.000Z',
      TOKEN_A,
    );
    expect(resultado.sincronizadas).toEqual([
      expect.objectContaining({ clientId: CLIENT_A, data: expect.objectContaining({ moodEntry: { id: 11 } }) }),
    ]);
    expect(resultado.pendientes).toBe(0);
  });

  test('un fallo durante sync no elimina ni bloquea las demás entradas', async () => {
    await encolarMoodEntry(entrada(CLIENT_A), TOKEN_A);
    await encolarMoodEntry(entrada(CLIENT_B, 'NEUTRO'), TOKEN_A);
    const enviar = jest.fn()
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValueOnce({ moodEntry: { id: 12 } });

    const resultado = await sincronizarMoodEntries({ token: TOKEN_A, enviar });

    expect(resultado.pendientes).toBe(1);
    await expect(leerPendientes(TOKEN_A)).resolves.toEqual([
      expect.objectContaining({ clientId: CLIENT_A }),
    ]);
  });

  test('JSON corrupto no se sobrescribe silenciosamente', async () => {
    await AsyncStorage.setItem(MOOD_QUEUE_KEY, '{roto');
    await expect(leerPendientes(TOKEN_A)).rejects.toThrow(/dañada/);
    await expect(AsyncStorage.getItem(MOOD_QUEUE_KEY)).resolves.toBe('{roto');
  });

  test('un fallo temporal de lectura aborta la mutación sin borrar pendientes', async () => {
    await encolarMoodEntry(entrada(CLIENT_A), TOKEN_A);
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('lectura temporal'));

    await expect(encolarMoodEntry(entrada(CLIENT_B), TOKEN_A)).rejects.toThrow('lectura temporal');
    const raw = JSON.parse(await AsyncStorage.getItem(MOOD_QUEUE_KEY));
    expect(raw).toEqual([expect.objectContaining({ clientId: CLIENT_A })]);
  });

  test('una renovación del JWT recupera pendientes del mismo usuario', async () => {
    await encolarMoodEntry(entrada(CLIENT_A), TOKEN_A);
    await expect(leerPendientes(TOKEN_A_RENOVADO)).resolves.toEqual([
      expect.objectContaining({ clientId: CLIENT_A }),
    ]);
  });

  test('si falla el guardado local no informa falsamente que quedó pendiente', async () => {
    AsyncStorage.setItem.mockRejectedValueOnce(new Error('almacenamiento no disponible'));

    await expect(capturarMoodEntry('FELIZ', null, {
      token: TOKEN_A,
      clientId: CLIENT_A,
      enviar: jest.fn(),
    })).rejects.toThrow('almacenamiento no disponible');
  });
});
