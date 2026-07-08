import { useRef } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { springs, PRESS_SCALE } from '../theme/motion';

// El APK de desarrollo anterior no trae el módulo nativo de expo-haptics;
// sin él la app debe seguir funcionando (solo sin vibración).
let Haptics = null;
try {
  Haptics = require('expo-haptics');
} catch {
  Haptics = null;
}

// Botón táctil de la casa: escala suave al presionar + háptica ligera.
// Usar haptic={false} en acciones repetitivas o dentro de listas densas.
export default function Tappable({
  children,
  style,
  wrapperStyle,
  onPress,
  disabled,
  haptic = true,
  activeOpacity = 0.9,
  ...rest
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, ...springs.press }).start();

  const handlePress = (e) => {
    if (haptic && Haptics) Haptics.selectionAsync().catch(() => {});
    onPress?.(e);
  };

  return (
    <Animated.View style={[wrapperStyle, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={style}
        onPress={handlePress}
        onPressIn={() => animateTo(PRESS_SCALE)}
        onPressOut={() => animateTo(1)}
        disabled={disabled}
        activeOpacity={activeOpacity}
        accessibilityRole="button"
        {...rest}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}
