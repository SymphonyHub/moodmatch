import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { makeThemedStyles, useMotionPrefs } from '../../theme/ThemeContext';
import { brilloProgreso } from './movimiento';

export function normalizarProgreso(valor) {
  const progreso = Number(valor);
  if (!Number.isFinite(progreso)) return 0;
  return Math.max(0, Math.min(1, progreso));
}

export function aumentoCarino(anterior, siguiente) {
  const antes = Number(anterior);
  const despues = Number(siguiente);
  return Number.isFinite(antes) && Number.isFinite(despues) && despues > antes;
}

// Relleno animado con un glint de una sola pasada. El nivel de cariño decide si
// hubo ganancia aunque el porcentaje se reinicie al entrar a una etapa nueva.
export default function BarraProgresoCarino({ progreso, nivelCarino }) {
  const styles = useStyles();
  const { reduceMotion } = useMotionPrefs();
  const destino = normalizarProgreso(progreso);
  const nivel = Number.isFinite(Number(nivelCarino)) ? Number(nivelCarino) : 0;
  const [ancho, setAncho] = useState(0);
  const relleno = useSharedValue(0);
  const brillo = useSharedValue(0);
  const nivelPrevio = useRef(nivel);
  const anchoPrevio = useRef(0);

  useEffect(() => {
    cancelAnimation(relleno);
    cancelAnimation(brillo);
    brillo.value = 0;
    if (ancho <= 0) return undefined;

    const subio = aumentoCarino(nivelPrevio.current, nivel);
    const primeraMedida = anchoPrevio.current <= 0;
    nivelPrevio.current = nivel;
    anchoPrevio.current = ancho;
    const px = destino * ancho;
    relleno.value = reduceMotion || primeraMedida
      ? px
      : withTiming(px, {
        duration: brilloProgreso.rellenoMs,
        easing: brilloProgreso.rellenoEasing,
      });

    if (subio && !reduceMotion) {
      brillo.value = withDelay(
        brilloProgreso.esperaMs,
        withTiming(1, {
          duration: brilloProgreso.recorridoMs,
          easing: brilloProgreso.recorridoEasing,
        }),
      );
    }

    return () => {
      cancelAnimation(relleno);
      cancelAnimation(brillo);
    };
  }, [ancho, brillo, destino, nivel, reduceMotion, relleno]);

  const rellenoStyle = useAnimatedStyle(() => ({ width: relleno.value }));
  const brilloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(brillo.value, [0, 0.08, 0.82, 1], [0, 0.82, 0.66, 0]),
    transform: [
      {
        translateX: -brilloProgreso.margenPx
          + brillo.value * (ancho + brilloProgreso.margenPx * 2),
      },
      { rotate: '18deg' },
    ],
  }));

  const porcentaje = Math.round(destino * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Progreso de cariño hacia la próxima etapa"
      accessibilityValue={{ min: 0, max: 100, now: porcentaje }}
      onLayout={(event) => {
        const medido = event?.nativeEvent?.layout?.width;
        if (Number.isFinite(medido) && medido > 0) {
          if (ancho <= 0) relleno.value = destino * medido;
          setAncho(medido);
        }
      }}
      style={styles.barra}
    >
      <Animated.View
        style={[
          styles.relleno,
          ancho > 0 ? rellenoStyle : { width: `${porcentaje}%` },
        ]}
      >
        <Animated.View testID="brillo-progreso-carino" style={[styles.brillo, brilloStyle]} />
      </Animated.View>
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  barra: {
    height: 10,
    borderRadius: 6,
    backgroundColor: t.colors.primarySoft,
    overflow: 'hidden',
  },
  relleno: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: t.colors.accent,
    overflow: 'hidden',
  },
  brillo: {
    position: 'absolute',
    top: -6,
    left: 0,
    width: 16,
    height: 22,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
}));
