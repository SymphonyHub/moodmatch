// Setup global de Jest (setupFiles en package.json).
// react-native-keyboard-controller es un módulo nativo sin implementación en
// el entorno de test: se sustituye por el mock oficial de la librería, que
// entrega valores Animated estáticos (teclado cerrado) — suficiente para que
// useKeyboardOffset/ChatInputBar importen y rendericen en jest.
jest.mock('react-native-keyboard-controller', () =>
  require('react-native-keyboard-controller/jest'),
);
