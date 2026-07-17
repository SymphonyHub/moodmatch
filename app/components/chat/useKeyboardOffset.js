import { useMemo } from 'react';
import { Animated } from 'react-native';
import { useKeyboardAnimation } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * useKeyboardOffset — padding inferior animado que mantiene la barra de envío
 * siempre visible sobre el teclado (Fase 9, Prioridad 1; tripas migradas a
 * react-native-keyboard-controller en Fase 9.1).
 *
 * Por qué existe: el proyecto corre edge-to-edge (SDK 54 / Android 15+), donde
 * el sistema NO redimensiona la ventana aunque el manifest declare
 * adjustResize. La primera versión compensaba escuchando la API Keyboard de
 * RN core, pero en MIUI/Xiaomi esos eventos tienen historial documentado de
 * alturas mal medidas o directamente no disparar (RN #28000, #33056, #27089,
 * #51015) — el bug reapareció en el dispositivo del usuario. Esta versión lee
 * los WindowInsets nativos vía useKeyboardAnimation() de
 * react-native-keyboard-controller (KeyboardProvider en app/_layout.jsx):
 * la barra acompaña el teclado frame a frame y no depende de eventos.
 *
 * Contrato de consumo (sin cambios respecto de la primera versión):
 *
 *   const paddingInferior = useKeyboardOffset({ bottomOffset });
 *   <Animated.View style={{ paddingBottom: paddingInferior }}>…</Animated.View>
 *
 * - `bottomOffset`: altura fija que ya separa la barra del borde inferior de
 *   la pantalla (el tab bar en el chat de Emociones; 0 en el chat de Amigos,
 *   que es pantalla completa). Se descuenta de la altura del teclado.
 * - Teclado cerrado, el padding reposa en max(inset inferior, minimo) — la
 *   barra respeta la zona de gestos sin que la pantalla sume su propio inset.
 * - La semántica exacta del padding vive en calcularPaddingInferior (núcleo
 *   puro, testeado en chatInputBar.test.js); la versión animada de abajo la
 *   replica con matemática de Animated: max() se implementa con un
 *   interpolate de rampa identidad + extrapolateLeft 'clamp'.
 */
export const PADDING_MINIMO = 10;

// Núcleo puro: padding inferior de la barra según el estado del teclado.
// Cerrado (altura <= 0) → reposo: max(inset, minimo). Abierto → la altura del
// teclado menos lo que ya hay debajo de la barra, nunca menos que el reposo.
export function calcularPaddingInferior({
  alturaTeclado,
  bottomOffset = 0,
  insetInferior = 0,
  minimo = PADDING_MINIMO,
}) {
  const reposo = Math.max(insetInferior, minimo);
  if (alturaTeclado <= 0) return reposo;
  return Math.max(alturaTeclado - bottomOffset, reposo);
}

export default function useKeyboardOffset({ bottomOffset = 0, minimo = PADDING_MINIMO } = {}) {
  const insets = useSafeAreaInsets();
  // height es un Animated.Value nativo que va de 0 a -alturaTeclado durante
  // la animación del sistema (insets, no eventos).
  const { height } = useKeyboardAnimation();

  return useMemo(() => {
    const reposo = Math.max(insets.bottom, minimo);
    // padding = max(alturaTeclado - bottomOffset, reposo), en Animated:
    // rampa identidad desde `reposo` con clamp por la izquierda.
    return Animated.subtract(Animated.multiply(height, -1), bottomOffset).interpolate({
      inputRange: [reposo, reposo + 1],
      outputRange: [reposo, reposo + 1],
      extrapolateLeft: 'clamp',
    });
  }, [height, bottomOffset, insets.bottom, minimo]);
}
