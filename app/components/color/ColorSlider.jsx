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
// Salto por incremento/decremento con tecnología asistiva (5% del recorrido).
const PASO_A11Y = 0.05;
const ACCIONES_A11Y = [{ name: 'increment' }, { name: 'decrement' }];

export default function ColorSlider({
  stops,
  fraccion,
  onFraccion,
  thumbColor,
  gradientId,
  accessibilityLabel,
}) {
  const styles = useStyles();
  const [ancho, setAncho] = useState(0);
  // El PanResponder se crea una vez; lee ancho, callback y ancla actuales por ref.
  const anchoRef = useRef(0);
  const onFraccionRef = useRef(onFraccion);
  onFraccionRef.current = onFraccion;
  // locationX del toque al arrancar el gesto. Como el pulgar y la pista son
  // pointerEvents="none", el toque siempre resuelve al contenedor y locationX
  // queda relativo a la pista. El arrastre se sigue con gestureState.dx sobre
  // este ancla: un delta estable en espacio de página, inmune a que el dedo
  // pase por encima del pulgar y a que la pista viva dentro de un ScrollView.
  const inicioRef = useRef(0);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Una vez tomado el gesto no lo suelta: evita que el ScrollView padre
      // robe el arrastre a media barra.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        inicioRef.current = e.nativeEvent.locationX;
        onFraccionRef.current(xAFraccion(inicioRef.current, anchoRef.current));
      },
      onPanResponderMove: (e, gesture) =>
        onFraccionRef.current(xAFraccion(inicioRef.current + gesture.dx, anchoRef.current)),
    }),
  ).current;

  const left = Math.max(0, Math.min(ancho - THUMB, fraccion * ancho - THUMB / 2));

  // Lectores de pantalla: la barra es un control "adjustable"; subir/bajar el
  // valor mueve la fracción en pasos discretos (los swatches dan la vía táctil).
  const onA11yAction = ({ nativeEvent }) => {
    if (nativeEvent.actionName === 'increment') onFraccion(Math.min(1, fraccion + PASO_A11Y));
    else if (nativeEvent.actionName === 'decrement') onFraccion(Math.max(0, fraccion - PASO_A11Y));
  };

  return (
    <View
      style={styles.areaTactil}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        anchoRef.current = w;
        setAncho(w);
      }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(fraccion * 100) }}
      accessibilityActions={ACCIONES_A11Y}
      onAccessibilityAction={onA11yAction}
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
      {ancho > 0 ? (
        <View pointerEvents="none" style={[styles.thumb, { left }]}>
          <View style={[styles.thumbFill, { backgroundColor: thumbColor }]} />
        </View>
      ) : null}
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
    // Bisel blanco (el aro que "levanta" el pulgar, aquí vía padding sobre el
    // fondo blanco) + hairline exterior que mantiene el pulgar visible aunque
    // el color elegido sea casi blanco o casi negro, en ambos temas.
    padding: 3,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: t.isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.30)',
    ...t.shadows.cardStrong,
  },
  thumbFill: {
    flex: 1,
    borderRadius: THUMB / 2,
  },
}));
