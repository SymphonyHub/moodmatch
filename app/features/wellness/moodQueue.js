import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiCreateMoodEntry, getToken } from '../../services/api';

export const MOOD_QUEUE_KEY = 'moodmatch:moodEntryQueue:v1';
let colaEscritura = Promise.resolve();
const sincronizaciones = new Map();
const capturasActivas = new Set();
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodificarBase64Url(valor) {
  const limpio = valor.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  let acumulado = 0;
  let bits = 0;
  let salida = '';
  for (const caracter of limpio) {
    const indice = BASE64.indexOf(caracter);
    if (indice < 0) throw new Error('base64 inválido');
    acumulado = (acumulado << 6) | indice;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      salida += String.fromCharCode((acumulado >> bits) & 0xff);
    }
  }
  return salida;
}

export function crearClientId(ahora = Date.now(), random = Math.random) {
  let semilla = ahora;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (caracter) => {
    const valor = (semilla + Math.floor(random() * 16)) % 16;
    semilla = Math.floor(semilla / 16);
    return (caracter === 'x' ? valor : (valor & 0x3) | 0x8).toString(16);
  });
}

export function huellaToken(token) {
  try {
    const payload = String(token).split('.')[1];
    if (!payload) throw new Error('payload ausente');
    const userId = JSON.parse(decodificarBase64Url(payload)).userId;
    if (!Number.isInteger(userId)) throw new Error('userId ausente');
    return `user-${userId}`;
  } catch {
    throw new Error('Token de sesión inválido');
  }
}

const esEntradaValida = (entrada) => (
  entrada
  && typeof entrada.clientId === 'string'
  && typeof entrada.sessionKey === 'string'
  && typeof entrada.moodType === 'string'
  && (entrada.nota === null || typeof entrada.nota === 'string')
  && typeof entrada.capturedAt === 'string'
);

async function leerTodo() {
  const raw = await AsyncStorage.getItem(MOOD_QUEUE_KEY);
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('La cola local de ánimo está dañada');
  }
  if (!Array.isArray(parsed)) throw new Error('La cola local de ánimo tiene un formato inválido');
  return parsed.filter(esEntradaValida);
}

const mutarCola = (mutacion) => {
  const operacion = colaEscritura.then(async () => {
    const actual = await leerTodo();
    const siguiente = mutacion(actual);
    await AsyncStorage.setItem(MOOD_QUEUE_KEY, JSON.stringify(siguiente));
    return siguiente;
  });
  colaEscritura = operacion.catch(() => {});
  return operacion;
};

export async function leerPendientes(token) {
  const sessionKey = huellaToken(token);
  const entradas = await leerTodo();
  return entradas.filter((entrada) => entrada.sessionKey === sessionKey);
}

export async function encolarMoodEntry(entrada, token) {
  if (!token) throw new Error('No hay sesión para guardar el registro');
  const conSesion = { ...entrada, sessionKey: huellaToken(token) };
  await mutarCola((actual) => (
    actual.some((item) => item.clientId === conSesion.clientId)
      ? actual
      : [...actual, conSesion]
  ));
  return conSesion;
}

async function quitarMoodEntry(clientId, sessionKey) {
  await mutarCola((actual) => actual.filter((entrada) => (
    entrada.clientId !== clientId || entrada.sessionKey !== sessionKey
  )));
}

export async function capturarMoodEntry(moodType, nota = null, opciones = {}) {
  const token = opciones.token ?? await getToken();
  const enviar = opciones.enviar ?? apiCreateMoodEntry;
  const entrada = {
    clientId: opciones.clientId ?? crearClientId(),
    moodType,
    nota,
    capturedAt: new Date(opciones.ahora ?? Date.now()).toISOString(),
  };
  capturasActivas.add(entrada.clientId);
  let persistida;

  try {
    persistida = await encolarMoodEntry(entrada, token);
  } catch (error) {
    capturasActivas.delete(entrada.clientId);
    throw error;
  }

  try {
    const data = await enviar(moodType, nota, entrada.clientId, entrada.capturedAt, token);
    if (!data?.moodEntry) throw new Error('Respuesta inválida al sincronizar');
    await quitarMoodEntry(entrada.clientId, persistida.sessionKey);
    return { estado: 'sincronizada', clientId: entrada.clientId, data };
  } catch {
    return { estado: 'pendiente', clientId: entrada.clientId };
  } finally {
    capturasActivas.delete(entrada.clientId);
  }
}

export async function sincronizarMoodEntries(opciones = {}) {
  const token = opciones.token ?? await getToken();
  if (!token) return { sincronizadas: [], pendientes: 0 };
  const sessionKey = huellaToken(token);
  if (sincronizaciones.has(sessionKey)) return sincronizaciones.get(sessionKey);

  const promesa = (async () => {
    const enviar = opciones.enviar ?? apiCreateMoodEntry;
    const pendientes = (await leerPendientes(token))
      .filter((entrada) => !capturasActivas.has(entrada.clientId));
    const sincronizadas = [];

    for (const entrada of pendientes) {
      try {
        const data = await enviar(
          entrada.moodType,
          entrada.nota,
          entrada.clientId,
          entrada.capturedAt,
          token,
        );
        if (!data?.moodEntry) continue;
        await quitarMoodEntry(entrada.clientId, sessionKey);
        sincronizadas.push({ clientId: entrada.clientId, data });
      } catch {
        // Sigue en la cola. El próximo evento de red o foreground reintenta.
      }
    }

    return {
      sincronizadas,
      pendientes: (await leerPendientes(token)).length,
    };
  })();

  sincronizaciones.set(sessionKey, promesa);
  try {
    return await promesa;
  } finally {
    sincronizaciones.delete(sessionKey);
  }
}
