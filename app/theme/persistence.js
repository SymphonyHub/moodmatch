import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_THEME_ID, VALID_THEME_CHOICES } from './themes';
import { normalizeCustomTheme } from './customTheme';

const STORAGE_KEY = 'moodmatch.themeChoice';
const CUSTOM_THEME_KEY = 'moodmatch.customTheme';
const TEXT_SCALE_KEY = 'moodmatch.textScale';
export const DEFAULT_TEXT_SCALE = 1;
export const LARGE_TEXT_SCALE = 1.2;

export async function loadThemeChoice() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return VALID_THEME_CHOICES.includes(stored) ? stored : DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export async function saveThemeChoice(choice) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Sin almacenamiento local el tema igual queda aplicado en memoria.
  }
}

// Contenedor de paletas del tema personalizado ({ activeId, palettes }). null =
// no hay nada guardado (o está corrupto): el ThemeProvider cae a
// DEFAULT_CUSTOM_THEME. normalizeCustomTheme migra el objeto legacy de 4 claves.
export async function loadCustomThemeConfig() {
  try {
    const stored = await AsyncStorage.getItem(CUSTOM_THEME_KEY);
    if (!stored) return null;
    return normalizeCustomTheme(JSON.parse(stored));
  } catch {
    return null;
  }
}

export async function saveCustomThemeConfig(container) {
  try {
    await AsyncStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(container));
  } catch {
    // Igual que el choice: sin storage la paleta queda aplicada en memoria.
  }
}

export async function loadTextScale() {
  try {
    const stored = Number(await AsyncStorage.getItem(TEXT_SCALE_KEY));
    return stored === LARGE_TEXT_SCALE ? LARGE_TEXT_SCALE : DEFAULT_TEXT_SCALE;
  } catch {
    return DEFAULT_TEXT_SCALE;
  }
}

export async function saveTextScale(scale) {
  try {
    await AsyncStorage.setItem(TEXT_SCALE_KEY, String(scale));
  } catch {
    // El ajuste se mantiene durante la sesión aunque falle el almacenamiento.
  }
}
