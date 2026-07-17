import { useEffect, useRef } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * useKeyboardOffset — padding inferior animado que mantiene la barra de envío
 * siempre visible sobre el teclado (Fase 9, Prioridad 1).
 *
 * Por qué existe: el proyecto corre edge-to-edge (gradle.properties) con
 * windowSoftInputMode=adjustResize, combinación en la que Android NO
 * redimensiona la ventana al abrir el teclado, y el KeyboardAvoidingView
 * clásico con behavior indefinido no compensa nada — el teclado tapa la barra.
 * Este hook escucha la API Keyboard de RN core (sin módulos nativos: el
 * dev-client es un APK precompilado) y anima el padding él mismo.
 *
 * Contrato de consumo:
 *
 *   const paddingInferior = useKeyboardOffset({ bottomOffset });
 *   <Animated.View style={{ paddingBottom: paddingInferior }}>…</Animated.View>
 *
 * - `bottomOffset`: altura fija que ya separa la barra del borde inferior de
 *   la pantalla (el tab bar en el chat de Emociones; 0 en el chat de Amigos,
 *   que es pantalla completa). Se descuenta de la altura del teclado.
 * - Teclado cerrado, el padding reposa en max(inset inferior, minimo) — la
 *   barra respeta la zona de gestos sin que la pantalla sume su propio inset.
 * - En Android `keyboardDidShow` dispara con el teclado ya desplegado, así que
 *   la barra sube con una animación corta a posteriori; es lo máximo posible
 *   sin react-native-keyboard-controller.
 * - Riesgo conocido: si un dispositivo edge-to-edge sí redimensionara la
 *   ventana con adjustResize habría doble compensación; el ajuste se hace en
 *   un solo lugar, `calcularPaddingInferior`.
 */
export const PADDING_MINIMO = 10;
export const DURACION_ANIMACION_MS = 160;

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
  const padding = useRef(
    new Animated.Value(
      calcularPaddingInferior({ alturaTeclado: 0, bottomOffset, insetInferior: insets.bottom, minimo }),
    ),
  ).current;

  useEffect(() => {
    const animarHacia = (valor, duracion = DURACION_ANIMACION_MS) =>
      Animated.timing(padding, { toValue: valor, duration: duracion, useNativeDriver: false }).start();

    const alCambiar = (alturaTeclado, evento) =>
      animarHacia(
        calcularPaddingInferior({ alturaTeclado, bottomOffset, insetInferior: insets.bottom, minimo }),
        Platform.OS === 'ios' && evento?.duration ? evento.duration : DURACION_ANIMACION_MS,
      );

    // iOS anuncia el teclado antes de mostrarlo; Android solo al terminar.
    const suscripciones = [
      Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
        alCambiar(e?.endCoordinates?.height ?? 0, e),
      ),
      Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', (e) =>
        alCambiar(0, e),
      ),
    ];
    return () => suscripciones.forEach((s) => s.remove());
  }, [bottomOffset, insets.bottom, minimo, padding]);

  return padding;
}
