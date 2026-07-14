import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_THEME_ID, VALID_THEME_CHOICES } from './themes';
import { isValidCustomConfig } from './customTheme';

const STORAGE_KEY = 'moodmatch.themeChoice';
const CUSTOM_THEME_KEY = 'moodmatch.customTheme';

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

// Paleta del tema personalizado. null = no hay paleta guardada (o está
// corrupta): el ThemeProvider cae a DEFAULT_CUSTOM_CONFIG.
export async function loadCustomThemeConfig() {
  try {
    const stored = await AsyncStorage.getItem(CUSTOM_THEME_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return isValidCustomConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveCustomThemeConfig(config) {
  try {
    await AsyncStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(config));
  } catch {
    // Igual que el choice: sin storage la paleta queda aplicada en memoria.
  }
}
