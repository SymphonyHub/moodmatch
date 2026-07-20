import AsyncStorage from '@react-native-async-storage/async-storage';

// Persistencia local de actividades marcadas como "hecha". El backend no tiene
// noción de completada (agregarla exigiría una migración a Neon, que requiere
// autorización explícita), así que vive en el dispositivo. Guarda un mapa JSON
// { [clave]: timestamp } acotado a las MAX marcas más recientes para no crecer
// sin límite. La CLAVE la define el llamador (p. ej. `${moodEntryId}:${actId}`)
// para que una idea nueva o un registro nuevo empiecen sin marcar.
//
// La red no interviene: es best-effort local. Si AsyncStorage falla, la marca
// solo dura la sesión (nunca rompe la pantalla).

const CLAVE = 'moodmatch:actividadesCompletadas';
export const MAX_COMPLETADAS = 50;
let colaEscritura = Promise.resolve();

export function claveCompletadaSocial(activityId) {
  return activityId === null || activityId === undefined || activityId === ''
    ? null
    : `social:${activityId}`;
}

async function leerMapa() {
  try {
    const raw = await AsyncStorage.getItem(CLAVE);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function guardarMapa(mapa) {
  try {
    await AsyncStorage.setItem(CLAVE, JSON.stringify(mapa));
  } catch {
    // best-effort: la marca vive solo en memoria hasta el próximo intento.
  }
}

// Núcleo puro: recorta el mapa a las `max` marcas más recientes por timestamp.
export function recortar(mapa, max = MAX_COMPLETADAS) {
  const entradas = Object.entries(mapa);
  if (entradas.length <= max) return mapa;
  const recientes = entradas.sort((a, b) => b[1] - a[1]).slice(0, max);
  return Object.fromEntries(recientes);
}

export async function estaCompletada(clave) {
  if (!clave) return false;
  const mapa = await leerMapa();
  return Boolean(mapa[clave]);
}

export async function marcarCompletada(clave, ahora = Date.now()) {
  if (!clave) return;
  // Serializa el read-modify-write: dos tarjetas marcadas casi al mismo tiempo
  // no pueden pisarse entre sí en AsyncStorage.
  colaEscritura = colaEscritura.then(async () => {
    const mapa = await leerMapa();
    mapa[clave] = ahora;
    await guardarMapa(recortar(mapa));
  });
  await colaEscritura;
}
