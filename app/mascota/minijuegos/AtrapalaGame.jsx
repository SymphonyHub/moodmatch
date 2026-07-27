import { useEffect, useRef, useState } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../../components/Tappable';
import MascotaAnimada from '../animation/MascotaAnimada';
import MascotaSprite from '../MascotaSprite';
import RecompensaCompletada from '../../components/wellness/RecompensaCompletada';
import {
  ATRAPALA_OPORTUNIDADES,
  ATRAPALA_PAUSA_MS,
  ATRAPALA_VENTANA_MS,
  ATRAPALA_VENTANA_REDUCIDA_MS,
  posicionAleatoriaAtrapala,
} from './logica';

const MASCOTA_SIZE = 96;

export default function AtrapalaGame({
  mascota,
  reduceMotion = false,
  screenReaderEnabled = false,
  onCompletar,
}) {
  const styles = useStyles();
  const { height: ventanaAlto } = useWindowDimensions();
  const altoDisponible = Number.isFinite(ventanaAlto) ? ventanaAlto : 590;
  const escenarioAlto = Math.max(260, Math.min(350, altoDisponible - 240));
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [ronda, setRonda] = useState(0);
  const [visible, setVisible] = useState(false);
  const [posicion, setPosicion] = useState({ x: MASCOTA_SIZE / 2, y: MASCOTA_SIZE / 2 });
  const [aciertos, setAciertos] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [eventoKey, setEventoKey] = useState(0);

  const aciertosRef = useRef(0);
  const rondaResueltaRef = useRef(-1);
  const completadaRef = useRef(false);
  const feedbackKeyRef = useRef(0);
  const ocultarTimer = useRef(null);
  const siguienteTimer = useRef(null);
  const completarRef = useRef(onCompletar);
  completarRef.current = onCompletar;

  const limpiarTimers = () => {
    clearTimeout(ocultarTimer.current);
    clearTimeout(siguienteTimer.current);
    ocultarTimer.current = null;
    siguienteTimer.current = null;
  };

  useEffect(() => {
    if (area.width <= 0 || area.height <= 0) return undefined;

    limpiarTimers();
    if (ronda >= ATRAPALA_OPORTUNIDADES) {
      setVisible(false);
      if (!completadaRef.current) {
        completadaRef.current = true;
        completarRef.current?.({ puntuacion: aciertosRef.current, aciertos: aciertosRef.current });
      }
      return undefined;
    }

    if (rondaResueltaRef.current === ronda) {
      siguienteTimer.current = setTimeout(
        () => setRonda((actual) => actual + 1),
        ATRAPALA_PAUSA_MS,
      );
      return limpiarTimers;
    }

    setFeedback(null);
    setPosicion(screenReaderEnabled
      ? { x: area.width / 2, y: area.height / 2 }
      : posicionAleatoriaAtrapala({
        width: area.width,
        height: area.height,
        padding: MASCOTA_SIZE / 2 + 12,
      }));
    setVisible(true);

    // Con lector de pantalla la misma diana permanece enfocada y cada ronda
    // avanza al activarla. Ocultarla por tiempo haría imposible reencontrarla.
    if (screenReaderEnabled) return limpiarTimers;

    const ventana = reduceMotion ? ATRAPALA_VENTANA_REDUCIDA_MS : ATRAPALA_VENTANA_MS;
    ocultarTimer.current = setTimeout(() => {
      rondaResueltaRef.current = ronda;
      setVisible(false);
    }, ventana);
    siguienteTimer.current = setTimeout(() => setRonda((actual) => actual + 1), ventana + ATRAPALA_PAUSA_MS);

    return limpiarTimers;
  }, [area.height, area.width, reduceMotion, ronda, screenReaderEnabled]);

  const atrapar = () => {
    if (!visible || rondaResueltaRef.current === ronda || completadaRef.current) return;
    rondaResueltaRef.current = ronda;
    limpiarTimers();

    const nuevosAciertos = aciertosRef.current + 1;
    aciertosRef.current = nuevosAciertos;
    setAciertos(nuevosAciertos);
    setEventoKey((key) => key + 1);
    feedbackKeyRef.current += 1;
    setFeedback({ ...posicion, key: feedbackKeyRef.current });

    // La mascota queda un instante en el lugar para que se lea la reacción de
    // éxito; durante esa pausa el guard de arriba evita sumar dos veces.
    siguienteTimer.current = setTimeout(
      () => setRonda((actual) => actual + 1),
      ATRAPALA_PAUSA_MS,
    );
  };

  const actualizarArea = ({ nativeEvent }) => {
    const { width, height } = nativeEvent.layout;
    setArea((actual) => (
      actual.width === width && actual.height === height ? actual : { width, height }
    ));
  };

  return (
    <View style={styles.contenedor}>
      <View style={styles.marcador}>
        <View>
          <Text style={styles.marcadorLabel}>Encuentros</Text>
          <Text style={styles.marcadorValor} accessibilityLiveRegion="polite">{aciertos}</Text>
        </View>
        <Text style={styles.turno}>
          Aparición {Math.min(ronda + 1, ATRAPALA_OPORTUNIDADES)} de {ATRAPALA_OPORTUNIDADES}
        </Text>
      </View>

      <View
        style={styles.progreso}
        accessible
        accessibilityLabel={`${ronda} de ${ATRAPALA_OPORTUNIDADES} apariciones completadas`}
      >
        {Array.from({ length: ATRAPALA_OPORTUNIDADES }, (_, index) => (
          <View key={index} style={[styles.punto, index < ronda && styles.puntoCompleto]} />
        ))}
      </View>

      <View
        style={[styles.escenario, { height: escenarioAlto }]}
        onLayout={actualizarArea}
        testID="atrapala-escenario"
      >
        <View style={[styles.mancha, styles.manchaUno]} />
        <View style={[styles.mancha, styles.manchaDos]} />
        {visible && (
          <View
            style={[
              styles.mascota,
              { left: posicion.x - MASCOTA_SIZE / 2, top: posicion.y - MASCOTA_SIZE / 2 },
            ]}
            testID="atrapala-mascota"
          >
            {screenReaderEnabled ? (
              <Tappable
                style={styles.objetivoAccesible}
                onPress={atrapar}
                haptic={false}
                accessibilityLabel={`Atrapar a ${mascota.nombre}. Aparición ${ronda + 1} de ${ATRAPALA_OPORTUNIDADES}`}
                accessibilityHint="Activa este botón para registrar el encuentro"
              >
                <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                  <MascotaSprite
                    especie={mascota.especie}
                    etapa={mascota.etapa?.numero ?? 1}
                    accesorioCabeza={mascota.accesorios?.cabeza ?? null}
                    accesorioColor={mascota.accesorios?.color ?? null}
                    size={MASCOTA_SIZE}
                  />
                </View>
              </Tappable>
            ) : (
              <MascotaAnimada
                especie={mascota.especie}
                etapa={mascota.etapa?.numero ?? 1}
                personalidad={mascota.personalidad}
                accesorioCabeza={mascota.accesorios?.cabeza ?? null}
                accesorioColor={mascota.accesorios?.color ?? null}
                evento={{ tipo: 'encantada', key: eventoKey, confetti: false }}
                size={MASCOTA_SIZE}
                onTocar={atrapar}
              />
            )}
          </View>
        )}

        {feedback && (
          <View
            pointerEvents="none"
            style={[styles.feedback, { left: feedback.x - 54, top: feedback.y - 68 }]}
          >
            <Text style={styles.feedbackTexto}>+1 encuentro</Text>
            {!reduceMotion && (
              <RecompensaCompletada
                key={feedback.key}
                categoria="físico"
                size={38}
                onFin={() => setFeedback((actual) => (
                  actual?.key === feedback.key ? null : actual
                ))}
              />
            )}
          </View>
        )}

        {area.width === 0 && <Text style={styles.preparando}>Preparando el espacio...</Text>}
      </View>

      <Text style={styles.ayuda} accessibilityLiveRegion={screenReaderEnabled ? 'polite' : 'none'}>
        {screenReaderEnabled
          ? `Encuentra el botón de ${mascota.nombre}; permanecerá en el centro hasta que lo actives.`
          : `Toca a ${mascota.nombre} cada vez que asome.`}
      </Text>
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  contenedor: { width: '100%' },
  marcador: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  marcadorLabel: { fontSize: t.fontSize(11), color: t.colors.textFaint },
  marcadorValor: { ...t.typography.type.title, color: t.colors.primary, marginTop: -2 },
  turno: { ...t.typography.fonts.semibold, fontSize: t.fontSize(12), color: t.colors.textMuted },
  progreso: { flexDirection: 'row', gap: 5, marginBottom: 12 },
  punto: { flex: 1, height: 5, borderRadius: 3, backgroundColor: t.colors.border },
  puntoCompleto: { backgroundColor: t.colors.accent },
  escenario: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: t.shape.radiusXl,
    backgroundColor: t.colors.primarySoft,
    borderWidth: t.shape.borderMedium,
    borderColor: t.colors.primarySoftBorder,
  },
  mancha: { position: 'absolute', borderRadius: 999, backgroundColor: t.colors.accentSoft },
  manchaUno: { width: 150, height: 150, right: -42, top: -36 },
  manchaDos: { width: 110, height: 110, left: -28, bottom: -22 },
  mascota: { position: 'absolute', width: MASCOTA_SIZE, height: MASCOTA_SIZE, zIndex: 2 },
  objetivoAccesible: {
    width: MASCOTA_SIZE,
    height: MASCOTA_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MASCOTA_SIZE / 2,
  },
  feedback: {
    position: 'absolute',
    zIndex: 3,
    width: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackTexto: {
    ...t.typography.fonts.bold,
    fontSize: t.fontSize(13),
    color: t.colors.primary,
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.shape.radiusXl,
    paddingHorizontal: 9,
    paddingVertical: 4,
    ...t.shadows.card,
  },
  preparando: {
    alignSelf: 'center',
    marginTop: 150,
    fontSize: t.fontSize(13),
    color: t.colors.textMuted,
  },
  ayuda: { marginTop: 12, textAlign: 'center', fontSize: t.fontSize(13), color: t.colors.textMuted },
}));
