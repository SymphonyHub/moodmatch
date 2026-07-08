import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_THEME_ID, VALID_THEME_CHOICES } from './themes';

const STORAGE_KEY = 'moodmatch.themeChoice';

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
