jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  estaCompletada,
  marcarCompletada,
  recortar,
  MAX_COMPLETADAS,
} from '../features/wellness/completadas';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('recortar (núcleo puro)', () => {
  test('deja el mapa igual si no supera el máximo', () => {
    const mapa = { a: 1, b: 2, c: 3 };
    expect(recortar(mapa, 5)).toBe(mapa);
  });

  test('recorta a las marcas más recientes por timestamp', () => {
    const mapa = {};
    for (let i = 0; i < MAX_COMPLETADAS + 10; i += 1) mapa[`k${i}`] = i;
    const out = recortar(mapa);
    expect(Object.keys(out)).toHaveLength(MAX_COMPLETADAS);
    // Las de timestamp alto sobreviven; las viejas caen.
    expect(out[`k${MAX_COMPLETADAS + 9}`]).toBeDefined();
    expect(out.k0).toBeUndefined();
  });
});

describe('estaCompletada / marcarCompletada', () => {
  test('una clave desconocida no está completada', async () => {
    expect(await estaCompletada('7:12')).toBe(false);
  });

  test('marcar y luego consultar devuelve true', async () => {
    await marcarCompletada('7:12');
    expect(await estaCompletada('7:12')).toBe(true);
    // otra clave sigue sin marcar
    expect(await estaCompletada('7:99')).toBe(false);
  });

  test('clave vacía es no-op y no rompe', async () => {
    await expect(marcarCompletada('')).resolves.toBeUndefined();
    await expect(marcarCompletada(null)).resolves.toBeUndefined();
    expect(await estaCompletada('')).toBe(false);
    expect(await estaCompletada(null)).toBe(false);
  });

  test('el mapa persistido nunca supera el máximo', async () => {
    for (let i = 0; i < MAX_COMPLETADAS + 5; i += 1) {
      // timestamps crecientes para que las últimas sean las más recientes
      await marcarCompletada(`id${i}`, 1000 + i);
    }
    const raw = await AsyncStorage.getItem('moodmatch:actividadesCompletadas');
    const mapa = JSON.parse(raw);
    expect(Object.keys(mapa).length).toBeLessThanOrEqual(MAX_COMPLETADAS);
    // la última marcada sobrevive; la primera fue desplazada
    expect(await estaCompletada(`id${MAX_COMPLETADAS + 4}`)).toBe(true);
    expect(await estaCompletada('id0')).toBe(false);
  });
});
