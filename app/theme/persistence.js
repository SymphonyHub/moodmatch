import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_THEME_ID, VALID_THEME_CHOICES } from './themes';
import { normalizeCustomTheme } from './customTheme';

const STORAGE_KEY = 'moodmatch.themeChoice';
const CUSTOM_THEME_KEY = 'moodmatch.customTheme';
const TEXT_SCALE_KEY = 'moodmatch.textScale';
const REDUCE_MOTION_KEY = 'moodmatch.reduceMotion';
const HAPTICS_KEY = 'moodmatch.haptics';

export const DEFAULT_TEXT_SCALE = 1;
// Tres pasos de lectura en vez del sí/no anterior. Se validan por pertenencia a
// la lista, no por cercanía: un valor que no esté acá vuelve al normal.
export const TEXT_SCALE_STEPS = [DEFAULT_TEXT_SCALE, 1.15, 1.3];
// El paso más grande. Conserva el nombre de cuando el ajuste era binario.
export const LARGE_TEXT_SCALE = 1.3;
// El ajuste binario guardaba 1.2, que ya no es un paso válido: se traduce al más
// parecido para no apagarle el texto grande a quien ya lo tenía puesto.
const TEXT_SCALE_LEGACY = { 1.2: 1.15 };

export const DEFAULT_HAPTICS = true;

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
    if (TEXT_SCALE_STEPS.includes(stored)) return stored;
    return TEXT_SCALE_LEGACY[stored] ?? DEFAULT_TEXT_SCALE;
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

// Reducir movimiento es tri-estado: `null` significa "seguir el ajuste del
// sistema", que es el arranque de siempre. En cuanto se toca el interruptor de
// la app pasa a ser una decisión explícita (true/false) que manda sobre el
// sistema — si no, apagarlo con el del sistema puesto no tendría efecto.
export async function loadReduceMotion() {
  try {
    const stored = await AsyncStorage.getItem(REDUCE_MOTION_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

export async function saveReduceMotion(value) {
  try {
    await AsyncStorage.setItem(REDUCE_MOTION_KEY, String(value));
  } catch {
    // Igual que el resto: la preferencia vale para esta sesión aunque no persista.
  }
}

export async function loadHaptics() {
  try {
    const stored = await AsyncStorage.getItem(HAPTICS_KEY);
    return stored === null ? DEFAULT_HAPTICS : stored !== 'false';
  } catch {
    return DEFAULT_HAPTICS;
  }
}

export async function saveHaptics(value) {
  try {
    await AsyncStorage.setItem(HAPTICS_KEY, String(value));
  } catch {
    // Sin storage la vibración queda como se eligió hasta cerrar la app.
  }
}
