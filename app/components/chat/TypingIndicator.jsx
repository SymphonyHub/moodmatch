import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { makeThemedStyles } from '../../theme/ThemeContext';
import { springs } from '../../theme/motion';

// "El bot está escribiendo": tres puntos que saltan en secuencia con un
// resorte contenido (springs.typing) y una pausa entre ciclos para que
// respire — calmo, no metrónomo. Dentro de una mini burbuja de bot.
const SALTO_PX = -5;
const CADENCIA_MS = 130; // desfase entre puntos
const PAUSA_MS = 460; // respiro al final de cada ciclo

function Punto({ orden, styles }) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const salto = (haciaArriba) =>
      Animated.spring(translateY, {
        toValue: haciaArriba ? SALTO_PX : 0,
        ...springs.typing,
        useNativeDriver: true,
      });

    // El desfase inicial queda fuera del loop: cada punto repite un ciclo de
    // igual duración, así la onda entre puntos se mantiene estable.
    const anim = Animated.sequence([
      Animated.delay(orden * CADENCIA_MS),
      Animated.loop(
        Animated.sequence([salto(true), salto(false), Animated.delay(PAUSA_MS)]),
      ),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);

  return <Animated.View style={[styles.punto, { transform: [{ translateY }] }]} />;
}

export default function TypingIndicator() {
  const styles = useStyles();
  return (
    <View style={styles.fila}>
      <View style={styles.burbuja}>
        <Punto orden={0} styles={styles} />
        <Punto orden={1} styles={styles} />
        <Punto orden={2} styles={styles} />
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
