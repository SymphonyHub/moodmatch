import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { makeThemedStyles } from '../../theme/ThemeContext';
import { durations, easings } from '../../theme/motion';

// "El bot está escribiendo": tres puntos que pulsan en secuencia, dentro de
// una mini burbuja. Discreto, acorde al lenguaje de movimiento de la casa.
function Punto({ delay, styles }) {
  const opacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 1,
          duration: durations.base,
          easing: easings.standard,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.25,
          duration: durations.base,
          easing: easings.standard,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return <Animated.View style={[styles.punto, { opacity }]} />;
}

export default function TypingIndicator() {
  const styles = useStyles();
  return (
    <View style={styles.fila}>
      <View style={styles.burbuja}>
        <Punto delay={0} styles={styles} />
        <Punto delay={120} styles={styles} />
        <Punto delay={240} styles={styles} />
      </View>
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  fila: { alignItems: 'flex-start', marginBottom: 10 },
  burbuja: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    borderRadius: t.shape.radiusLg,
    borderBottomLeftRadius: t.shape.radiusSm,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  punto: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: t.colors.textMuted,
  },
}));
