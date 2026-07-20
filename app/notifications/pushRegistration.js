import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import {
  apiRegisterPushToken,
  apiUnregisterPushToken,
} from '../services/api';

const PERMISSION_ASKED_KEY = 'horaAzul:notificationsPermissionAsked';
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

  try {
    await ensureAndroidChannel();
    let permissions = await Notifications.getPermissionsAsync();

    if (!hasPermission(permissions) && requestPermission) {
      const alreadyAsked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
      if (!alreadyAsked && permissions.status !== 'denied') {
        permissions = await Notifications.requestPermissionsAsync();
        await AsyncStorage.setItem(PERMISSION_ASKED_KEY, '1');
      }
    }
    if (!hasPermission(permissions)) return { status: 'permission-denied' };

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) return { status: 'configuration-error' };

    const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const registration = await apiRegisterPushToken(expoPushToken, timeZone);
    if (registration.unregister) {
      await AsyncStorage.setItem(PUSH_REGISTRATION_KEY, JSON.stringify(registration.unregister));
    }
    return { status: 'registered', expoPushToken };
  } catch {
    // Permisos, red y Expo son best-effort: nunca bloquean login o navegación.
    return { status: 'error' };
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

function openNotification(notification) {
  const url = notification?.request?.content?.data?.url;
  if (ALLOWED_URLS.has(url)) router.push(url);
}

export function PushObserver() {
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    retryPendingPushUnregister().then(() => syncPushToken());
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) openNotification(lastResponse.notification);

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotification(response.notification);
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') retryPendingPushUnregister().then(() => syncPushToken());
    });

    return () => {
      responseSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  return null;
}
