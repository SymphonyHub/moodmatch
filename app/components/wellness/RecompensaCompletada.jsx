import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import { springs, durations, easings } from '../../theme/motion';

/**
 * RecompensaCompletada — celebración discreta al marcar una actividad como
 * hecha. Un check que asienta con springs.unlock + un anillo que pulsa una
 * sola vez y se desvanece. Coherente con el lenguaje de movimiento de la casa
 * (theme/motion.js): todo ≤ 400 ms. El confetti toma una composición breve
 * según la categoría, para que el refuerzo no se sienta genérico.
 *
 * Pieza autosuficiente: se monta cuando el contenedor decide y llama `onFin`
 * al terminar para que este desmonte el overlay.
 */
export function varianteCelebracion(categoria) {
  if (['relajación', 'mindfulness', 'reflexión'].includes(categoria)) return 'calma';
  if (['físico', 'productividad'].includes(categoria)) return 'energia';
  if (['creativo', 'entretenimiento'].includes(categoria)) return 'creatividad';
  return 'social';
}

const PIEZAS = {
  calma: [
    [-34, -36, 0], [26, -42, 1], [-52, -8, 1], [48, -12, 0], [-10, -56, 0], [8, -30, 1],
  ],
  energia: [
    [-52, -48, 0], [46, -50, 1], [-62, -4, 1], [62, -3, 0], [-20, -66, 0], [18, -64, 1],
    [-36, 18, 1], [36, 18, 0],
  ],
  creatividad: [
    [-46, -52, 0], [42, -46, 1], [-60, -14, 1], [58, -10, 0], [-22, -68, 1], [20, -66, 0],
    [-12, 22, 0], [12, 24, 1],
  ],
  social: [
    [-42, -44, 0], [40, -42, 1], [-56, -6, 1], [54, -4, 0], [-14, -62, 0], [14, -60, 1],
    [-26, 18, 1], [28, 16, 0],
  ],
};

function ConfettiPiece({ progreso, pieza, color, variante }) {
  const [x, y, giro] = pieza;
  const size = variante === 'calma' ? 7 : 8;
  const borderRadius = variante === 'calma' ? size / 2 : variante === 'social' ? 2 : 0;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: variante === 'calma' ? size * 1.5 : size,
        borderRadius,
        backgroundColor: color,
        opacity: progreso.interpolate({ inputRange: [0, 0.68, 1], outputRange: [0, 1, 0] }),
        transform: [
          { translateX: progreso.interpolate({ inputRange: [0, 1], outputRange: [0, x] }) },
          { translateY: progreso.interpolate({ inputRange: [0, 1], outputRange: [0, y] }) },
          {
            rotate: progreso.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', `${giro ? -115 : 115}deg`],
            }),
          },
        ],
      }}
    />
  );
}

export default function RecompensaCompletada({ categoria, onFin, size = 72 }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const escalaCheck = useRef(new Animated.Value(0)).current;
  const escalaAnillo = useRef(new Animated.Value(0.7)).current;
  const opacidadAnillo = useRef(new Animated.Value(0.5)).current;
  const progresoConfetti = useRef(new Animated.Value(0)).current;
  const variante = varianteCelebracion(categoria);
  const colores = [
    theme.colors.primary,
    theme.colors.accent,
    theme.colors.categories[categoria] ?? theme.colors.primary,
  ];

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
      Animated.timing(progresoConfetti, {
        toValue: 1,
        duration: durations.gentle,
        easing: easings.decelerate,
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
      {PIEZAS[variante].map((pieza, index) => (
        <ConfettiPiece
          key={`${variante}-${index}`}
          progreso={progresoConfetti}
          pieza={pieza}
          color={colores[index % colores.length]}
          variante={variante}
        />
      ))}
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
