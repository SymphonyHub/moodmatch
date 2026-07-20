jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Ionicons arrastra expo-font → expo-asset, que no resuelve bajo jest
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

import ChatInputBar from '../components/chat/ChatInputBar';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

describe('contrato de exports de ChatInputBar', () => {
  test('ChatInputBar es un componente importable', () => {
    expect(typeof ChatInputBar).toBe('function');
  });
});

// El componente nativo anima transform en respuesta a insets, evitando
// animar padding/layout en el hilo JS. El comportamiento frame a frame se
// verifica en el dispositivo MIUI; aquí fijamos el contrato de importación.
describe('anclaje nativo del teclado', () => {
  test('KeyboardStickyView importa bajo el mock oficial', () => {
    expect(KeyboardStickyView).toBeDefined();
  });
});
