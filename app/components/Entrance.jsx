import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { durations, easings, STAGGER_MS } from '../theme/motion';

// Entrada estándar de contenido: fade + deslizamiento corto.
// `index` escalona ítems de una lista; `distance` 0 = solo fade.
// Se re-anima al remontar: usar `key` cuando el contenido cambia.
export default function Entrance({
  children,
  style,
  index = 0,
  distance = 16,
  duration = durations.base,
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    const delay = index * STAGGER_MS;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: easings.standard,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: easings.standard,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
