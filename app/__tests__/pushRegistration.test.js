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
  getToken: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { apiRegisterPushToken, apiUnregisterPushToken, getToken } from '../services/api';
import {
  getPushPermissionStatus,
  retryPendingPushUnregister,
  syncPushForActiveSession,
  syncPushToken,
  unregisterPushTokenForLogout,
} from '../notifications/pushRegistration';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[test]' });
  apiRegisterPushToken.mockResolvedValue({ registered: true });
  apiUnregisterPushToken.mockResolvedValue(undefined);
  getToken.mockResolvedValue(null);
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
    Notifications.getPermissionsAsync
      .mockResolvedValueOnce({ status: 'undetermined', granted: false })
      .mockResolvedValueOnce({ status: 'denied', granted: false });
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

  test('una sesión existente también dispara el prompt si el estado sigue indeterminado', async () => {
    getToken.mockResolvedValue('sesion-activa');
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined', granted: false });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true });

    await expect(syncPushForActiveSession()).resolves.toEqual({
      status: 'registered',
      expoPushToken: 'ExponentPushToken[test]',
    });
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(apiRegisterPushToken).toHaveBeenCalledTimes(1);
  });

  test('la misma sesión no insiste si el prompt queda sin decisión', async () => {
    getToken.mockResolvedValue('sesion-activa');
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined', granted: false });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'undetermined', granted: false });

    await syncPushToken({ requestPermission: true });
    await syncPushToken({ requestPermission: true });

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  test('una sesión nueva vuelve a ofrecer el prompt si aún no hubo decisión', async () => {
    await AsyncStorage.setItem('horaAzul:notificationsPermissionSession', 'sesion-anterior');
    getToken.mockResolvedValue('sesion-nueva');
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined', granted: false });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied', granted: false });

    await syncPushToken({ requestPermission: true });

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  test('sin sesión no solicita permiso', async () => {
    await expect(syncPushForActiveSession()).resolves.toEqual({ status: 'no-session' });
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  test('expone y registra el error real de getExpoPushTokenAsync', async () => {
    const error = new Error('Default FirebaseApp is not initialized');
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true });
    Notifications.getExpoPushTokenAsync.mockRejectedValueOnce(error);

    await expect(syncPushToken()).resolves.toEqual({
      status: 'error',
      stage: 'obtener ExpoPushToken con getExpoPushTokenAsync',
      error: error.message,
    });
    expect(log).toHaveBeenCalledWith(expect.stringContaining(error.message));
    expect(apiRegisterPushToken).not.toHaveBeenCalled();
    log.mockRestore();
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
