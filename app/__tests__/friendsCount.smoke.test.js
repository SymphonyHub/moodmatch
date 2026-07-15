// Smoke del contexto de friendsCount: valida que el árbol de imports
// (services/api → AsyncStorage, react-native AppState, store) resuelve bajo
// jest-expo y que los exports públicos existen. La lógica real se testea sin
// render en friendsCountStore.test.js.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { FriendsCountProvider, useFriendsCount } from '../friends/FriendsCountContext';
import { createFriendsCountStore, DEFAULT_TTL_MS } from '../friends/friendsCountStore';

describe('FriendsCountContext (smoke)', () => {
  test('exporta provider y hook', () => {
    expect(typeof FriendsCountProvider).toBe('function');
    expect(typeof useFriendsCount).toBe('function');
  });

  test('el store expone la API del contrato', () => {
    const store = createFriendsCountStore({
      fetchCount: async () => 0,
      getToken: async () => null,
    });
    expect(typeof store.getState).toBe('function');
    expect(typeof store.subscribe).toBe('function');
    expect(typeof store.refresh).toBe('function');
    expect(typeof store.refreshIfStale).toBe('function');
    expect(typeof store.reset).toBe('function');
    expect(DEFAULT_TTL_MS).toBeGreaterThan(0);
  });
});
