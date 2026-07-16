import { useCallback, useRef } from 'react';

/**
 * useAutoScroll — scroll automático al final del chat, sin secuestrar al usuario.
 *
 * Con respuestas de IA la llegada de contenido tiene latencia variable: si la
 * persona subió a releer un mensaje, un scrollToEnd incondicional le arranca
 * la vista de las manos. Este hook solo baja cuando ya estaba cerca del final.
 *
 * Contrato de consumo (ScrollView o FlatList — ambos exponen scrollToEnd):
 *
 *   const { ref, onScroll, onContentSizeChange, scrollToEnd } = useAutoScroll();
 *
 *   <ScrollView
 *     ref={ref}
 *     onScroll={onScroll}
 *     scrollEventThrottle={32}
 *     onContentSizeChange={onContentSizeChange}
 *   >
 *
 * - `onContentSizeChange` baja al final SOLO si el usuario está a menos de
 *   UMBRAL_CERCA_PX del fondo (o el contenido aún no llena la pantalla).
 * - `scrollToEnd()` fuerza la bajada (p. ej. al enviar un mensaje propio:
 *   quien escribe siempre quiere ver su mensaje).
 * - Sin estado de React: no provoca re-renders por scrollear.
 */
export const UMBRAL_CERCA_PX = 80;

// Núcleo puro: ¿el viewport está a `umbral` px o menos del final del contenido?
// Con contenido más corto que el viewport la distancia es negativa → true.
export function estaCercaDelFinal(nativeEvent, umbral = UMBRAL_CERCA_PX) {
  const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
  const distancia = contentSize.height - layoutMeasurement.height - contentOffset.y;
  return distancia <= umbral;
}

export default function useAutoScroll(umbral = UMBRAL_CERCA_PX) {
  const ref = useRef(null);
  const cercaDelFinal = useRef(true); // el chat abre anclado al final

  const scrollToEnd = useCallback(() => {
    cercaDelFinal.current = true;
    ref.current?.scrollToEnd({ animated: true });
  }, []);

  const onScroll = useCallback(
    (evento) => {
      cercaDelFinal.current = estaCercaDelFinal(evento.nativeEvent, umbral);
    },
    [umbral],
  );

  const onContentSizeChange = useCallback(() => {
    if (cercaDelFinal.current) ref.current?.scrollToEnd({ animated: true });
  }, []);

  return { ref, onScroll, onContentSizeChange, scrollToEnd };
}
