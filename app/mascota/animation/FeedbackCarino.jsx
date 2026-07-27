import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { makeThemedStyles, useMotionPrefs } from '../../theme/ThemeContext';
import { feedbackCarino } from './movimiento';

export function normalizarCantidadCarino(valor) {
  const cantidad = Number(valor);
  return Number.isFinite(cantidad) ? Math.max(0, Math.round(cantidad)) : 0;
}

// Etiqueta de ganancia confirmada por backend. Se monta sobre el rig, rebota una
// vez y asciende mientras se desvanece; con movimiento reducido queda quieta el
// tiempo suficiente para leerse.
export default function FeedbackCarino({ eventoKey = 0, cantidad: valor = 0 }) {
  const styles = useStyles();
  const { reduceMotion } = useMotionPrefs();
  const cantidad = normalizarCantidadCarino(valor);
  const [visible, setVisible] = useState(false);
  const reduceRef = useRef(reduceMotion);
  reduceRef.current = reduceMotion;
  const y = useSharedValue(0);
  const escala = useSharedValue(1);
  const opacidad = useSharedValue(1);

  useEffect(() => {
    if (eventoKey <= 0 || cantidad <= 0) {
      setVisible(false);
      return undefined;
    }

    const reducir = reduceRef.current;
    setVisible(true);
    AccessibilityInfo.announceForAccessibility?.(`Ganó ${cantidad} de cariño`);
    y.value = 0;
    escala.value = reducir ? 1 : feedbackCarino.escalaInicial;
    opacidad.value = 1;

    if (!reducir) {
      y.value = withTiming(-feedbackCarino.elevacionPx, {
        duration: feedbackCarino.duracionMs,
        easing: feedbackCarino.easing,
      });
      escala.value = withSequence(
        withSpring(feedbackCarino.escalaPico, feedbackCarino.pop),
        withSpring(1, feedbackCarino.asentamiento),
      );
      opacidad.value = withDelay(
        feedbackCarino.esperaFadeMs,
        withTiming(0, { duration: feedbackCarino.fadeMs }),
      );
    }

    const timer = setTimeout(
      () => setVisible(false),
      reducir ? feedbackCarino.estaticoMs : feedbackCarino.duracionMs + 80,
    );
    return () => {
      clearTimeout(timer);
      cancelAnimation(y);
      cancelAnimation(escala);
      cancelAnimation(opacidad);
    };
  }, [cantidad, eventoKey, escala, opacidad, y]);

  // Un cambio de preferencia no vuelve a anunciar ni reproduce el mismo evento:
  // si el feedback seguía activo, simplemente lo deja quieto hasta desmontarlo.
  useEffect(() => {
    if (!reduceMotion || !visible) return;
    cancelAnimation(y);
    cancelAnimation(escala);
    cancelAnimation(opacidad);
    y.value = 0;
    escala.value = 1;
    opacidad.value = 1;
  }, [reduceMotion, visible, escala, opacidad, y]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacidad.value,
    transform: [{ translateY: y.value }, { scale: escala.value }],
  }));

  if (!visible) return null;

  const texto = `+${cantidad} cariño`;
  return (
    <View accessible={false} pointerEvents="none" style={styles.capa}>
      <Animated.View style={[styles.pastilla, animatedStyle]}>
        <Text accessible={false} style={styles.texto}>
          {texto}
        </Text>
      </Animated.View>
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  capa: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    zIndex: 8,
    elevation: 8,
    alignItems: 'center',
  },
  pastilla: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: t.shape.radiusLg,
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.accent,
    ...t.shadows.card,
  },
  texto: {
    color: t.colors.primary,
    fontSize: t.fontSize(13),
    ...t.typography.fonts.semibold,
  },
}));
