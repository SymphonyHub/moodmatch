jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe('pantalla de chat de amigos', () => {
  test('importa con búsqueda y reacciones sin errores', () => {
    const modulo = require('../app/chat/[friendId]');
    expect(typeof modulo.default).toBe('function');
  });
});
