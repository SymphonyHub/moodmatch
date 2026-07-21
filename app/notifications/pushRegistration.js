import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import {
  apiRegisterPushToken,
  apiUnregisterPushToken,
  getToken,
} from '../services/api';

const PERMISSION_SESSION_KEY = 'horaAzul:notificationsPermissionSession';
const PUSH_REGISTRATION_KEY = 'horaAzul:pushRegistration';
const PENDING_UNREGISTER_KEY = 'horaAzul:pendingPushUnregister';
const ALLOWED_URLS = new Set([
  '/(tabs)/amigos',
  '/(tabs)/actividades',
  '/(tabs)/home',
]);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const hasPermission = (permissions) => (
  permissions?.granted ||
  permissions?.ios?.status === Notifications.IosAuthorizationStatus?.PROVISIONAL
);

const errorMessage = (error) => (
  error instanceof Error ? error.message : String(error)
);

function pushError(stage, error) {
  const message = errorMessage(error);
  console.error(`[Push] ${stage}: ${message}`);
  return { status: 'error', stage, error: message };
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('hora-azul', {
    name: 'Hora Azul',
    description: 'Mensajes y recordatorios que elegiste recibir.',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180],
    lightColor: '#4A5FC1',
  });
}

export async function getPushPermissionStatus() {
  if (Platform.OS === 'web') return 'unsupported';
  try {
    const permissions = await Notifications.getPermissionsAsync();
    if (hasPermission(permissions)) return 'granted';
    return permissions.status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'unsupported';
  }
}

export async function syncPushToken({ requestPermission = false } = {}) {
  if (Platform.OS === 'web') return { status: 'unsupported' };

  let stage = 'configurar canal Android';
  try {
    await ensureAndroidChannel();
    stage = 'consultar permiso de notificaciones';
    let permissions = await Notifications.getPermissionsAsync();

    if (!hasPermission(permissions) && requestPermission && permissions.status !== 'denied') {
      const sessionToken = await getToken();
      const attemptedSession = await AsyncStorage.getItem(PERMISSION_SESSION_KEY);
      if (!sessionToken || attemptedSession !== sessionToken) {
        stage = 'solicitar permiso de notificaciones';
        permissions = await Notifications.requestPermissionsAsync();
        if (sessionToken) await AsyncStorage.setItem(PERMISSION_SESSION_KEY, sessionToken);
      }
    }
    if (!hasPermission(permissions)) return { status: 'permission-denied' };

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
      const error = 'No se encontró extra.eas.projectId en la configuración de Expo';
      console.error(`[Push] configuración: ${error}`);
      return { status: 'configuration-error', stage: 'configuración', error };
    }

    stage = 'obtener ExpoPushToken con getExpoPushTokenAsync';
    const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    stage = 'guardar ExpoPushToken en el backend';
    const registration = await apiRegisterPushToken(expoPushToken, timeZone);
    if (registration.unregister) {
      await AsyncStorage.setItem(PUSH_REGISTRATION_KEY, JSON.stringify(registration.unregister));
    }
    return { status: 'registered', expoPushToken };
  } catch (error) {
    // Best-effort: informa la etapa y causa real sin bloquear autenticación.
    return pushError(stage, error);
  }
}

const withTimeout = (promise, milliseconds) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout')), milliseconds);
  promise.then(
    (value) => {
      clearTimeout(timer);
      resolve(value);
    },
    (error) => {
      clearTimeout(timer);
      reject(error);
    },
  );
});

export async function unregisterPushTokenForLogout() {
  const raw = await AsyncStorage.getItem(PUSH_REGISTRATION_KEY);
  if (!raw) return;
  try {
    const unregister = JSON.parse(raw);
    await withTimeout(apiUnregisterPushToken(unregister), 3000);
    await AsyncStorage.removeItem(PENDING_UNREGISTER_KEY);
  } catch {
    await AsyncStorage.setItem(PENDING_UNREGISTER_KEY, raw).catch(() => {});
  }
  await AsyncStorage.removeItem(PUSH_REGISTRATION_KEY);
}

export async function retryPendingPushUnregister() {
  const raw = await AsyncStorage.getItem(PENDING_UNREGISTER_KEY);
  if (!raw) return;
  try {
    await withTimeout(apiUnregisterPushToken(JSON.parse(raw)), 3000);
    await AsyncStorage.removeItem(PENDING_UNREGISTER_KEY);
  } catch {
    // Se conserva para el próximo foreground; nunca bloquea la navegación.
  }
}

export async function syncPushForActiveSession() {
  await retryPendingPushUnregister();
  let sessionToken;
  try {
    sessionToken = await getToken();
  } catch (error) {
    return pushError('leer sesión para registrar notificaciones', error);
  }
  if (!sessionToken) return { status: 'no-session' };
  return syncPushToken({ requestPermission: true });
}

function openNotification(notification) {
  const url = notification?.request?.content?.data?.url;
  if (ALLOWED_URLS.has(url)) router.push(url);
}

export function PushObserver() {
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    syncPushForActiveSession();
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) openNotification(lastResponse.notification);

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotification(response.notification);
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncPushForActiveSession();
    });

    return () => {
      responseSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  return null;
}
