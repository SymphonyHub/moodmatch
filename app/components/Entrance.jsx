import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { durations, easings, STAGGER_MS } from '../theme/motion';
import { useMotionPrefs } from '../theme/ThemeContext';

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
  const { reduceMotion } = useMotionPrefs();
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : distance)).current;

  // Si el ajuste se enciende con algo ya montado, el contenido se planta en su
  // posición final en vez de quedarse a medio camino de una animación que no va
  // a correr.
  useEffect(() => {
    if (!reduceMotion) return;
    opacity.setValue(1);
    translateY.setValue(0);
  }, [reduceMotion, opacity, translateY]);

  useEffect(() => {
    if (reduceMotion) return;
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
