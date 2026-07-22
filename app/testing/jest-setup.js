// Setup global de Jest (setupFiles en package.json).
// react-native-keyboard-controller es un módulo nativo sin implementación en
// el entorno de test: se sustituye por el mock oficial de la librería, que
// entrega valores Animated estáticos (teclado cerrado) — suficiente para que
// KeyboardStickyView/ChatInputBar importen y rendericen en jest.
jest.mock('react-native-keyboard-controller', () =>
  require('react-native-keyboard-controller/jest'),
);

// react-native-reanimated (Fase 14: rig de animación de la mascota). Los
// worklets son código nativo sin runtime en jest → se usa el mock oficial de la
// librería, que entrega stubs JS (useSharedValue/useAnimatedProps/with*), para
// que MascotaAnimada monte y renderice en tests. La validación real de las
// animaciones requiere un build nativo (ver plan de Fase 14).
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  // El mock oficial no incluye algunos hooks/utilidades: se completan con stubs
  // inertes (sin movimiento) suficientes para montar en jest.
  return {
    ...mock,
    useReducedMotion: mock.useReducedMotion ?? (() => false),
    cancelAnimation: mock.cancelAnimation ?? (() => {}),
  };
});
