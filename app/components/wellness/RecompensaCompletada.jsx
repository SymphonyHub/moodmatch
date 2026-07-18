import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import { springs, durations, easings } from '../../theme/motion';

/**
 * RecompensaCompletada — celebración discreta al marcar una actividad como
 * hecha. Un check que asienta con springs.unlock + un anillo que pulsa una
 * sola vez y se desvanece. Coherente con el lenguaje de movimiento de la casa
 * (theme/motion.js): sin rebote fuerte, sin confetti, todo ≤ 400 ms — refuerzo
 * de calma, no gamificación agresiva.
 *
 * Pieza autosuficiente: se monta cuando el contenedor decide y llama `onFin`
 * al terminar para que este desmonte el overlay.
 */
export default function RecompensaCompletada({ onFin, size = 72 }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const escalaCheck = useRef(new Animated.Value(0)).current;
  const escalaAnillo = useRef(new Animated.Value(0.7)).current;
  const opacidadAnillo = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(escalaCheck, { toValue: 1, useNativeDriver: true, ...springs.unlock }),
      Animated.timing(escalaAnillo, {
        toValue: 1.7,
        duration: durations.gentle,
        easing: easings.decelerate,
        useNativeDriver: true,
      }),
      Animated.timing(opacidadAnillo, {
        toValue: 0,
        duration: durations.gentle,
        easing: easings.standard,
        useNativeDriver: true,
      }),
    ]).start(() => onFin?.());
    // Solo al montar: cada montaje es una celebración única.
  }, []);

  return (
    <Animated.View pointerEvents="none" style={styles.contenedor}>
      <Animated.View
        style={[
          styles.anillo,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: opacidadAnillo,
            transform: [{ scale: escalaAnillo }],
          },
        ]}
      />
      <Animated.View style={{ transform: [{ scale: escalaCheck }] }}>
        <Ionicons name="checkmark-circle" size={size} color={theme.colors.primary} />
      </Animated.View>
    </Animated.View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  contenedor: { alignItems: 'center', justifyContent: 'center' },
  anillo: {
    position: 'absolute',
    borderWidth: t.shape.borderThick,
    borderColor: t.colors.primary,
  },
}));
