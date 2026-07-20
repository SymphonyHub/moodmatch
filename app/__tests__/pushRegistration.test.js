jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  getLastNotificationResponse: jest.fn(() => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'project-test' } } },
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../services/api', () => ({
  apiRegisterPushToken: jest.fn(),
  apiUnregisterPushToken: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { apiRegisterPushToken, apiUnregisterPushToken } from '../services/api';
import {
  getPushPermissionStatus,
  retryPendingPushUnregister,
  syncPushToken,
  unregisterPushTokenForLogout,
} from '../notifications/pushRegistration';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[test]' });
  apiRegisterPushToken.mockResolvedValue({ registered: true });
  apiUnregisterPushToken.mockResolvedValue(undefined);
});

describe('registro push', () => {
  test('con permiso existente obtiene token usando projectId y lo persiste', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true });

    await expect(syncPushToken()).resolves.toEqual({
      status: 'registered',
      expoPushToken: 'ExponentPushToken[test]',
    });
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'project-test' });
    expect(apiRegisterPushToken).toHaveBeenCalledWith(
      'ExponentPushToken[test]',
      expect.any(String),
    );
  });

  test('solicita permiso una sola vez si todavía no había decisión', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined', granted: false });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied', granted: false });

    await expect(syncPushToken({ requestPermission: true })).resolves.toEqual({
      status: 'permission-denied',
    });
    await expect(syncPushToken({ requestPermission: true })).resolves.toEqual({
      status: 'permission-denied',
    });
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(apiRegisterPushToken).not.toHaveBeenCalled();
  });

  test('un permiso denegado no lanza ni intenta obtener token', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied', granted: false });
    await expect(syncPushToken({ requestPermission: true })).resolves.toEqual({
      status: 'permission-denied',
    });
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    await expect(getPushPermissionStatus()).resolves.toBe('denied');
  });

  test('si logout está offline conserva una limpieza pendiente y la reintenta', async () => {
    const unregister = {
      userId: 1,
      expoPushToken: 'ExponentPushToken[test]',
      unregisterToken: 'a'.repeat(64),
    };
    await AsyncStorage.setItem('horaAzul:pushRegistration', JSON.stringify(unregister));
    apiUnregisterPushToken.mockRejectedValueOnce(new Error('offline'));
    await unregisterPushTokenForLogout();

    apiUnregisterPushToken.mockResolvedValueOnce(undefined);
    await retryPendingPushUnregister();

    expect(apiUnregisterPushToken).toHaveBeenNthCalledWith(1, unregister);
    expect(apiUnregisterPushToken).toHaveBeenNthCalledWith(2, unregister);
    apiUnregisterPushToken.mockClear();
    await retryPendingPushUnregister();
    expect(apiUnregisterPushToken).not.toHaveBeenCalled();
  });
});
