import { useEffect } from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  ReduceMotion,
} from 'react-native-reanimated';
import { CORAL, GOLD, GLOW } from '../sprites/paletas';
import { particulasCaricia } from './movimiento';

const PIEZAS = [
  { dx: -30, dy: -44, giro: -18, delayMs: 0, icono: 'heart', size: 13, color: CORAL },
  { dx: 24, dy: -49, giro: 22, delayMs: 45, icono: 'star', size: 12, color: GOLD },
  { dx: -12, dy: -58, giro: -10, delayMs: 90, icono: 'sparkles', size: 14, color: GLOW },
  { dx: 35, dy: -30, giro: 28, delayMs: 130, icono: 'heart', size: 10, color: CORAL },
  { dx: -38, dy: -24, giro: -30, delayMs: 165, icono: 'star', size: 9, color: GOLD },
  { dx: 8, dy: -40, giro: 14, delayMs: 200, icono: 'heart', size: 9, color: CORAL },
];

export function normalizarOrigenCaricia(origen, size) {
  const lado = Number.isFinite(Number(size)) && Number(size) > 0 ? Number(size) : 132;
  const margen = Math.min(12, lado / 4);
  const x = Number.isFinite(Number(origen?.x)) ? Number(origen.x) : lado / 2;
  const y = Number.isFinite(Number(origen?.y)) ? Number(origen.y) : lado / 2;
  return {
    x: Math.max(margen, Math.min(lado - margen, x)),
    y: Math.max(margen, Math.min(lado - margen, y)),
  };
}

function Particula({ origen, pieza }) {
  const progreso = useSharedValue(0);

  useEffect(() => {
    progreso.value = withDelay(
      pieza.delayMs,
      withTiming(1, {
        duration: particulasCaricia.duracionMs,
        easing: particulasCaricia.easing,
        reduceMotion: ReduceMotion.Never,
      }),
      ReduceMotion.Never,
    );
    return () => cancelAnimation(progreso);
  }, [pieza.delayMs, progreso]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progreso.value, [0, 0.14, 0.72, 1], [0, 0.82, 0.66, 0]),
    transform: [
      { translateX: progreso.value * pieza.dx },
      { translateY: progreso.value * pieza.dy },
      { scale: interpolate(progreso.value, [0, 0.28, 1], [0.48, 1.08, 0.78]) },
      { rotate: `${progreso.value * pieza.giro}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        PARTICULA,
        {
          left: origen.x - pieza.size / 2,
          top: origen.y - pieza.size / 2,
        },
        animatedStyle,
      ]}
    >
      <Ionicons name={pieza.icono} size={pieza.size} color={pieza.color} />
    </Animated.View>
  );
}

// Burst decorativo de una sola pasada. El origen usa el mismo sistema local de
// coordenadas que el Pressable del rig para que nazca exactamente bajo el dedo.
export default function ParticulasCaricia({ origen, size }) {
  const punto = normalizarOrigenCaricia(origen, size);
  return (
    <View
      pointerEvents="none"
      testID="particulas-caricia"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[CAPA, { width: size, height: size }]}
    >
      {PIEZAS.map((pieza, index) => (
        <Particula key={`${pieza.icono}-${index}`} origen={punto} pieza={pieza} />
      ))}
    </View>
  );
}

const CAPA = {
  position: 'absolute',
  top: 0,
  left: 0,
  zIndex: 6,
  elevation: 6,
  overflow: 'visible',
};

const PARTICULA = { position: 'absolute' };
