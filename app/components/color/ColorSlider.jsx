import { useRef, useState } from 'react';
import { View, PanResponder } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { makeThemedStyles } from '../../theme/ThemeContext';
import { xAFraccion } from './barMath';

// Deslizador de color genérico (Fase 10 P2): una pista con degradado dibujado
// en SVG (react-native-svg ya está en el build) y un pulgar arrastrable con
// PanResponder (RN core, sin gesture-handler). La matemática vive en barMath;
// aquí solo el gesto → fracción [0,1]. `stops` son los hex del degradado.
const ALTO = 30;
const THUMB = 28;
const ALTO_TACTIL = 44;

export default function ColorSlider({ stops, fraccion, onFraccion, thumbColor, gradientId }) {
  const styles = useStyles();
  const [ancho, setAncho] = useState(0);
  // El PanResponder se crea una vez; lee el ancho y el callback actuales por ref.
  const anchoRef = useRef(0);
  const onFraccionRef = useRef(onFraccion);
  onFraccionRef.current = onFraccion;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) =>
        onFraccionRef.current(xAFraccion(e.nativeEvent.locationX, anchoRef.current)),
      onPanResponderMove: (e) =>
        onFraccionRef.current(xAFraccion(e.nativeEvent.locationX, anchoRef.current)),
    }),
  ).current;

  const left = Math.max(0, Math.min(ancho - THUMB, fraccion * ancho - THUMB / 2));

  return (
    <View
      style={styles.areaTactil}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        anchoRef.current = w;
        setAncho(w);
      }}
      {...responder.panHandlers}
    >
      <View pointerEvents="none" style={styles.pista}>
        <Svg width="100%" height={ALTO}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              {stops.map((color, i) => (
                <Stop
                  key={`${gradientId}-${i}`}
                  offset={stops.length === 1 ? 0 : i / (stops.length - 1)}
                  stopColor={color}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height={ALTO} rx={ALTO / 2} fill={`url(#${gradientId})`} />
        </Svg>
      </View>
      {ancho > 0 ? <View style={[styles.thumb, { left, backgroundColor: thumbColor }]} /> : null}
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  areaTactil: {
    height: ALTO_TACTIL,
    justifyContent: 'center',
  },
  pista: {
    height: ALTO,
    borderRadius: ALTO / 2,
    justifyContent: 'center',
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    overflow: 'visible',
  },
  thumb: {
    position: 'absolute',
    top: (ALTO_TACTIL - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    borderColor: '#ffffff',
    ...t.shadows.cardStrong,
  },
}));
