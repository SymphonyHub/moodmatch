jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Ionicons arrastra expo-font → expo-asset, que no resuelve bajo jest
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

import {
  calcularPaddingInferior,
  PADDING_MINIMO,
} from '../components/chat/useKeyboardOffset';
import ChatInputBar from '../components/chat/ChatInputBar';

// Alturas típicas de referencia: teclado Android ~300 px, tab bar ~70 px,
// inset de gestos ~24 px.
describe('calcularPaddingInferior (núcleo de useKeyboardOffset)', () => {
  test('teclado cerrado → reposa en el inset inferior', () => {
    expect(calcularPaddingInferior({ alturaTeclado: 0, insetInferior: 24 })).toBe(24);
  });

  test('teclado cerrado sin inset (barra de botones) → reposa en el mínimo', () => {
    expect(calcularPaddingInferior({ alturaTeclado: 0, insetInferior: 0 })).toBe(PADDING_MINIMO);
  });

  test('teclado abierto a pantalla completa (chat de Amigos) → sube la altura completa', () => {
    expect(calcularPaddingInferior({ alturaTeclado: 300, insetInferior: 24 })).toBe(300);
  });

  test('teclado abierto sobre el tab bar (chat de Emociones) → descuenta el tab bar', () => {
    expect(
      calcularPaddingInferior({ alturaTeclado: 300, bottomOffset: 70, insetInferior: 24 }),
    ).toBe(230);
  });

  test('offset mayor que el teclado → nunca baja del reposo', () => {
    expect(
      calcularPaddingInferior({ alturaTeclado: 50, bottomOffset: 200, insetInferior: 24 }),
    ).toBe(24);
    expect(
      calcularPaddingInferior({ alturaTeclado: 50, bottomOffset: 200, insetInferior: 0 }),
    ).toBe(PADDING_MINIMO);
  });

  test('altura negativa (evento raro) se trata como teclado cerrado', () => {
    expect(calcularPaddingInferior({ alturaTeclado: -1, insetInferior: 24 })).toBe(24);
  });

  test('el mínimo es configurable', () => {
    expect(calcularPaddingInferior({ alturaTeclado: 0, insetInferior: 0, minimo: 16 })).toBe(16);
  });
});

describe('contrato de exports de ChatInputBar', () => {
  test('ChatInputBar es un componente importable', () => {
    expect(typeof ChatInputBar).toBe('function');
  });
});
