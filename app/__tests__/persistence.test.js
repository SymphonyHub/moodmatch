jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadThemeChoice,
  saveThemeChoice,
  loadCustomThemeConfig,
  saveCustomThemeConfig,
} from '../theme/persistence';
import { DEFAULT_THEME_ID } from '../theme/themes';
import { DEFAULT_CUSTOM_CONFIG, DEFAULT_CUSTOM_THEME } from '../theme/customTheme';

const STORAGE_KEY = 'moodmatch.themeChoice';
const CUSTOM_KEY = 'moodmatch.customTheme';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('loadThemeChoice', () => {
  test('devuelve el default si no hay nada guardado', async () => {
    expect(await loadThemeChoice()).toBe(DEFAULT_THEME_ID);
  });

  test('devuelve la elección guardada si es válida', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'nocturno');
    expect(await loadThemeChoice()).toBe('nocturno');
  });

  test('acepta "auto" como elección guardada', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'auto');
    expect(await loadThemeChoice()).toBe('auto');
  });

  test('cae al default con un valor corrupto o de una versión vieja', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'tema-que-ya-no-existe');
    expect(await loadThemeChoice()).toBe(DEFAULT_THEME_ID);
  });

  test('cae al default si el almacenamiento falla', async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('storage roto'));
    expect(await loadThemeChoice()).toBe(DEFAULT_THEME_ID);
  });
});

describe('saveThemeChoice', () => {
  test('guarda la elección bajo la clave de la app', async () => {
    await saveThemeChoice('fiesta');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'fiesta');
    expect(await loadThemeChoice()).toBe('fiesta');
  });

  test('no lanza si el almacenamiento falla (el tema queda en memoria)', async () => {
    AsyncStorage.setItem.mockRejectedValueOnce(new Error('storage roto'));
    await expect(saveThemeChoice('nocturno')).resolves.toBeUndefined();
  });
});

describe('load/saveCustomThemeConfig', () => {
  test('roundtrip del contenedor de paletas', async () => {
    await saveCustomThemeConfig(DEFAULT_CUSTOM_THEME);
    expect(await loadCustomThemeConfig()).toEqual(DEFAULT_CUSTOM_THEME);
  });

  test('migra al vuelo un objeto legacy de 4 claves a un contenedor', async () => {
    await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(DEFAULT_CUSTOM_CONFIG));
    const cargado = await loadCustomThemeConfig();
    expect(cargado.palettes).toHaveLength(1);
    expect(cargado.activeId).toBe(cargado.palettes[0].id);
    expect(cargado.palettes[0]).toMatchObject(DEFAULT_CUSTOM_CONFIG);
  });

  test('devuelve null si no hay nada guardado', async () => {
    expect(await loadCustomThemeConfig()).toBeNull();
  });

  test('devuelve null con JSON corrupto', async () => {
    await AsyncStorage.setItem(CUSTOM_KEY, '{esto no es json');
    expect(await loadCustomThemeConfig()).toBeNull();
  });

  test('devuelve null con una forma inválida', async () => {
    await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify({ primary: 'azul' }));
    expect(await loadCustomThemeConfig()).toBeNull();
  });

  test('devuelve null si el almacenamiento falla', async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('storage roto'));
    expect(await loadCustomThemeConfig()).toBeNull();
  });

  test('save no lanza si el almacenamiento falla', async () => {
    AsyncStorage.setItem.mockRejectedValueOnce(new Error('storage roto'));
    await expect(saveCustomThemeConfig(DEFAULT_CUSTOM_THEME)).resolves.toBeUndefined();
  });
});
