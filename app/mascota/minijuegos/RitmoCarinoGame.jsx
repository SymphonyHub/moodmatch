import { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../../components/Tappable';
import MascotaAnimada from '../animation/MascotaAnimada';
import RecompensaCompletada from '../../components/wellness/RecompensaCompletada';
import {
  RITMO_PASO_REDUCIDO_MS,
  RITMO_PASOS_REDUCIDOS,
  RITMO_IDA_MS,
  RITMO_RONDAS,
  evaluarRitmo,
  posicionRitmo,
} from './logica';

const FEEDBACK_MS = 720;

export default function RitmoCarinoGame({
  mascota,
  reduceMotion = false,
  screenReaderEnabled = false,
  onCompletar,
}) {
  const styles = useStyles();
  const [ronda, setRonda] = useState(1);
  const [posicion, setPosicion] = useState(0);
  const [anchoPista, setAnchoPista] = useState(0);
  const [puntos, setPuntos] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [eventoKey, setEventoKey] = useState(0);

  const inicioRef = useRef(Date.now());
  const posicionRef = useRef(0);
  const pasoManualRef = useRef(0);
  const puntosRef = useRef(0);
  const completadaRef = useRef(false);
  const rondaResueltaRef = useRef(0);
  const movimientoTimer = useRef(null);
  const siguienteTimer = useRef(null);
  const completarRef = useRef(onCompletar);
  completarRef.current = onCompletar;
  // El mock oficial de Reanimated no conserva identidad entre renders; el ref
  // también deja explícita la identidad única que el runtime nativo ya ofrece.
  const progresoCreado = useSharedValue(0);
  const progreso = useRef(progresoCreado).current;
  const indicadorAnimado = useAnimatedStyle(() => ({
    transform: [{ translateX: progreso.value * anchoPista }],
  }));

  useEffect(() => {
    clearInterval(movimientoTimer.current);
    cancelAnimation(progreso);
    movimientoTimer.current = null;
    if (feedback || completadaRef.current || rondaResueltaRef.current === ronda) return undefined;
    inicioRef.current = Date.now();
    posicionRef.current = 0;
    pasoManualRef.current = 0;
    progreso.value = 0;
    setPosicion(0);

    if (screenReaderEnabled) return undefined;

    if (reduceMotion) {
      const actualizar = () => {
        const siguiente = posicionRitmo(Date.now(), inicioRef.current, true);
        posicionRef.current = siguiente;
        progreso.value = siguiente;
        setPosicion(siguiente);
      };
      movimientoTimer.current = setInterval(actualizar, RITMO_PASO_REDUCIDO_MS);
      return () => {
        clearInterval(movimientoTimer.current);
        movimientoTimer.current = null;
      };
    }

    progreso.value = withRepeat(
      withSequence(
        withTiming(1, { duration: RITMO_IDA_MS, easing: Easing.linear }),
        withTiming(0, { duration: RITMO_IDA_MS, easing: Easing.linear }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(progreso);
    };
  }, [feedback, progreso, reduceMotion, ronda, screenReaderEnabled]);

  useEffect(() => () => {
    clearInterval(movimientoTimer.current);
    cancelAnimation(progreso);
    clearTimeout(siguienteTimer.current);
    movimientoTimer.current = null;
    siguienteTimer.current = null;
  }, [progreso]);

  const tocar = () => {
    if (feedback || completadaRef.current || rondaResueltaRef.current === ronda) return;
    rondaResueltaRef.current = ronda;
    clearInterval(movimientoTimer.current);
    cancelAnimation(progreso);
    movimientoTimer.current = null;

    const valorActual = reduceMotion || screenReaderEnabled ? posicionRef.current : progreso.value;
    const posicionReal = Number.isFinite(valorActual) ? Math.min(1, Math.max(0, valorActual)) : 0;
    const evaluacion = evaluarRitmo(posicionReal);
    const total = puntosRef.current + evaluacion.puntos;
    puntosRef.current = total;
    setPosicion(posicionReal);
    setPuntos(total);
    setFeedback(evaluacion);
    if (evaluacion.puntos > 0) setEventoKey((key) => key + 1);

    siguienteTimer.current = setTimeout(() => {
      siguienteTimer.current = null;
      if (ronda >= RITMO_RONDAS) {
        completadaRef.current = true;
        completarRef.current?.({ puntuacion: total, puntos: total });
        return;
      }
      setRonda((actual) => actual + 1);
      setFeedback(null);
    }, FEEDBACK_MS);
  };

  const avanzarIndicador = () => {
    if (feedback || completadaRef.current || rondaResueltaRef.current === ronda) return;
    const indice = (pasoManualRef.current + 1) % RITMO_PASOS_REDUCIDOS.length;
    pasoManualRef.current = indice;
    const siguiente = RITMO_PASOS_REDUCIDOS[indice];
    posicionRef.current = siguiente;
    progreso.value = siguiente;
    setPosicion(siguiente);
  };

  const indicadorAccesible = posicion >= 0.38 && posicion <= 0.62
    ? 'El indicador está en la zona de cariño.'
    : posicion < 0.38
      ? 'El indicador está antes de la zona de cariño.'
      : 'El indicador está después de la zona de cariño.';

  return (
    <View style={styles.contenedor}>
      <View style={styles.marcador}>
        <View>
          <Text style={styles.marcadorLabel}>Puntos de ritmo</Text>
          <Text style={styles.marcadorValor} accessibilityLiveRegion="polite">{puntos}</Text>
        </View>
        <Text style={styles.turno}>Ronda {ronda} de {RITMO_RONDAS}</Text>
      </View>

      <View
        style={styles.mascotaWrap}
        importantForAccessibility={screenReaderEnabled ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={screenReaderEnabled}
      >
        <MascotaAnimada
          especie={mascota.especie}
          etapa={mascota.etapa?.numero ?? 1}
          personalidad={mascota.personalidad}
          accesorioCabeza={mascota.accesorios?.cabeza ?? null}
          accesorioColor={mascota.accesorios?.color ?? null}
          evento={{ tipo: 'encantada', key: eventoKey, confetti: false }}
          size={116}
        />
        {feedback?.puntos > 0 && !reduceMotion && !screenReaderEnabled && (
          <View style={styles.celebracion} pointerEvents="none">
            <RecompensaCompletada
              key={`${ronda}-${feedback.resultado}`}
              categoria="social"
              size={48}
            />
          </View>
        )}
      </View>

      <Text style={styles.instruccion}>
        {screenReaderEnabled
          ? 'Avanza el indicador por pasos y marca el momento que prefieras.'
          : 'Toca la barra cuando el indicador pase por la zona marcada.'}
      </Text>

      {screenReaderEnabled && (
        <View style={styles.controlesAccesibles}>
          <Tappable
            style={styles.botonAccesible}
            onPress={avanzarIndicador}
            disabled={Boolean(feedback)}
            haptic={false}
            accessibilityLabel="Avanzar el indicador un paso"
          >
            <Text style={styles.botonAccesibleTexto}>Avanzar indicador</Text>
          </Tappable>
          <Text style={styles.estadoAccesible} accessibilityLiveRegion="polite">
            {indicadorAccesible}
          </Text>
        </View>
      )}

      <Tappable
        wrapperStyle={styles.barraWrapper}
        style={styles.barraTocable}
        onPress={tocar}
        disabled={Boolean(feedback)}
        haptic={false}
        activeOpacity={0.96}
        accessibilityLabel={screenReaderEnabled ? 'Marcar esta posición' : 'Marcar el ritmo de cariño'}
        accessibilityHint="Actívalo cuando el indicador esté dentro de la zona central"
      >
        <View
          style={styles.pista}
          testID="ritmo-pista"
          onLayout={({ nativeEvent }) => setAnchoPista(nativeEvent.layout.width)}
        >
          <View style={styles.zonaObjetivo} />
          <View style={styles.zonaPerfecta} />
          <Animated.View
            style={[
              styles.indicador,
              reduceMotion || screenReaderEnabled
                ? { left: `${posicion * 100}%` }
                : indicadorAnimado,
            ]}
          />
        </View>
      </Tappable>

      <View style={styles.leyenda}>
        <Text style={styles.leyendaTexto}>inicio</Text>
        <Text style={styles.leyendaCentro}>zona de cariño</Text>
        <Text style={styles.leyendaTexto}>vuelta</Text>
      </View>

      <View style={styles.feedbackWrap} accessibilityLiveRegion="polite">
        {feedback ? (
          <>
            <Text style={styles.feedbackTitulo}>
              {feedback.puntos === 2 ? '+2 al ritmo' : feedback.puntos === 1 ? '+1 al ritmo' : 'Un vaivén compartido'}
            </Text>
            <Text style={styles.feedbackDetalle}>{feedback.copia}</Text>
          </>
        ) : !screenReaderEnabled ? (
          <Text style={styles.feedbackEspera}>
            {reduceMotion
              ? 'El indicador avanza en pasos suaves.'
              : 'El indicador va y vuelve con calma.'}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  contenedor: { width: '100%' },
  marcador: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  marcadorLabel: { fontSize: t.fontSize(11), color: t.colors.textFaint },
  marcadorValor: { ...t.typography.type.title, color: t.colors.accent, marginTop: -2 },
  turno: { ...t.typography.fonts.semibold, fontSize: t.fontSize(12), color: t.colors.textMuted },
  mascotaWrap: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.shape.radiusXl,
    backgroundColor: t.colors.accentSoft,
    overflow: 'hidden',
  },
  celebracion: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  instruccion: {
    marginTop: 18,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: t.fontSize(13),
    lineHeight: Math.round(t.fontSize(13) * 1.45),
    color: t.colors.textMuted,
  },
  controlesAccesibles: { alignItems: 'stretch', gap: 8, marginBottom: 12 },
  botonAccesible: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.shape.radiusMd,
    backgroundColor: t.colors.primarySoft,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
  },
  botonAccesibleTexto: { ...t.typography.fonts.semibold, fontSize: t.fontSize(13), color: t.colors.primary },
  estadoAccesible: { textAlign: 'center', fontSize: t.fontSize(12), color: t.colors.textMuted },
  barraWrapper: { width: '100%' },
  barraTocable: {
    minHeight: 72,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: t.shape.radiusLg,
    backgroundColor: t.colors.surfaceElevated,
    borderWidth: t.shape.borderMedium,
    borderColor: t.colors.border,
    ...t.shadows.card,
  },
  pista: {
    height: 18,
    borderRadius: 9,
    backgroundColor: t.colors.primarySoft,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
  },
  zonaObjetivo: {
    position: 'absolute',
    left: '38%',
    width: '24%',
    top: -1,
    bottom: -1,
    borderRadius: 9,
    backgroundColor: t.colors.accentSoft,
    borderWidth: t.shape.borderMedium,
    borderColor: t.colors.accent,
  },
  zonaPerfecta: {
    position: 'absolute',
    left: '45%',
    width: '10%',
    top: 3,
    bottom: 3,
    borderRadius: 6,
    backgroundColor: t.colors.accent,
  },
  indicador: {
    position: 'absolute',
    left: 0,
    top: -8,
    width: 14,
    height: 32,
    marginLeft: -7,
    borderRadius: 7,
    backgroundColor: t.colors.primary,
    borderWidth: t.shape.borderThick,
    borderColor: t.colors.surfaceElevated,
  },
  leyenda: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7, paddingHorizontal: 4 },
  leyendaTexto: { fontSize: t.fontSize(10), color: t.colors.textFaint },
  leyendaCentro: { ...t.typography.fonts.semibold, fontSize: t.fontSize(10), color: t.colors.accent },
  feedbackWrap: { minHeight: 58, alignItems: 'center', justifyContent: 'center', marginTop: 13 },
  feedbackTitulo: { ...t.typography.fonts.bold, fontSize: t.fontSize(15), color: t.colors.primary },
  feedbackDetalle: { marginTop: 3, textAlign: 'center', fontSize: t.fontSize(12), color: t.colors.textMuted },
  feedbackEspera: { textAlign: 'center', fontSize: t.fontSize(12), color: t.colors.textFaint },
}));
