/**
 * WidgetInteractivo — widget de respiración guiada de la pestaña "Para mí"
 * (Fase 10, Agente B). Reescribe el slot que dejó el Agente A (ParaMiTab lo
 * monta con <WidgetInteractivo moodType={MOOD} /> entre la sugerencia y la
 * RachaCard). Autosuficiente: no toca ParaMiTab.jsx ni actividades.jsx.
 *
 * Un círculo se expande y contrae en un ciclo 4-4-4-4 (respiración en caja):
 * inhalar, mantener, exhalar, mantener. Arranca en pausa —nada se anima solo al
 * entrar— y el usuario toca "Comenzar". La lentitud del pacer es la calma que
 * busca la app; la regla de theme/motion.js (nada > 400 ms) rige las
 * microinteracciones de UI (press del botón, reset al pausar), no la guía en sí.
 *
 * Se conecta al ánimo del último registro (prop moodType) por el acento del
 * círculo y una línea de entrada; si el mood falta, usa un neutro. La lógica de
 * fases y los textos viven en features/wellness/respiracion.js (testeados).
 *
 * @param {string} [moodType] - ánimo del último registro (una de MOOD_KEYS).
 */
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, makeThemedStyles } from '../theme/ThemeContext';
import { durations } from '../theme/motion';
import Tappable from '../components/Tappable';
import { FASES, ESCALA_MIN, ESCALA_MAX, introDe } from '../features/wellness/respiracion';

// Respiración natural: transición simétrica y suave en cada tramo.
const EASING_RESPIRO = Easing.inOut(Easing.quad);

export default function WidgetInteractivo({ moodType }) {
  const { theme } = useTheme();
  const styles = useStyles();

  const [activo, setActivo] = useState(false);
  const [faseIdx, setFaseIdx] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const escala = useRef(new Animated.Value(ESCALA_MIN)).current;

  // Acento del ánimo (theme.colors.moods[mood] = { soft, color }); si no vino
  // el mood, cae al primario de la casa.
  const tinte = theme.colors.moods?.[moodType];
  const acento = tinte?.color ?? theme.colors.primary;
  const acentoSoft = tinte?.soft ?? theme.colors.primarySoft;

  // Respeta la preferencia del sistema de "reducir movimiento": sin escala,
  // solo la guía por texto (que igual es útil para respirar).
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled().then((val) => {
      if (vivo) setReduceMotion(val);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      vivo = false;
      sub?.remove?.();
    };
  }, []);

  // Un solo scheduler mueve la etiqueta Y el círculo, así van siempre en fase.
  // Cada fase fija su etiqueta, anima la escala hacia su destino (en sostener el
  // valor ya está en destino → sin salto) y agenda la siguiente.
  useEffect(() => {
    if (!activo) return undefined;
    let cancelado = false;
    let timer = null;

    const correrFase = (i) => {
      if (cancelado) return;
      const fase = FASES[i];
      setFaseIdx(i);
      if (!reduceMotion) {
        Animated.timing(escala, {
          toValue: fase.escala === 'alta' ? ESCALA_MAX : ESCALA_MIN,
          duration: fase.dur,
          easing: EASING_RESPIRO,
          useNativeDriver: true,
        }).start();
      }
      timer = setTimeout(() => correrFase((i + 1) % FASES.length), fase.dur);
    };

    correrFase(0);
    return () => {
      cancelado = true;
      if (timer) clearTimeout(timer);
      escala.stopAnimation();
    };
  }, [activo, reduceMotion, escala]);

  // Al pausar, el círculo vuelve con suavidad al reposo (dentro del límite de la
  // casa) y la etiqueta se reinicia a la primera fase.
  useEffect(() => {
    if (activo) return;
    setFaseIdx(0);
    Animated.timing(escala, {
      toValue: ESCALA_MIN,
      duration: durations.gentle,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [activo, escala]);

  const faseActual = FASES[faseIdx];

  return (
    <View style={[styles.card, { borderLeftColor: acento }]}>
      <View style={styles.encabezado}>
        <Ionicons name="leaf-outline" size={18} color={acento} />
        <Text style={styles.titulo}>Un momento para respirar</Text>
      </View>

      <Text style={styles.intro}>{introDe(moodType)}</Text>

      <View style={styles.escenario}>
        <Animated.View
          style={[
            styles.circulo,
            {
              backgroundColor: acentoSoft,
              borderColor: acento,
              transform: [{ scale: reduceMotion ? ESCALA_MAX : escala }],
            },
          ]}
        />
        <View style={styles.centroTexto} pointerEvents="none">
          <Text
            style={[styles.faseLabel, { color: acento }]}
            accessibilityLiveRegion="polite"
          >
            {activo ? faseActual.label : '4 · 4 · 4 · 4'}
          </Text>
          {!activo && <Text style={styles.faseHint}>inhala · mantén · exhala</Text>}
        </View>
      </View>

      <Tappable
        style={[styles.boton, { backgroundColor: acento }]}
        onPress={() => setActivo((v) => !v)}
        accessibilityLabel={activo ? 'Pausar la respiración guiada' : 'Comenzar la respiración guiada'}
      >
        <Ionicons
          name={activo ? 'pause' : 'play'}
          size={18}
          color={theme.colors.onPrimary}
        />
        <Text style={styles.botonTexto}>{activo ? 'Pausar' : 'Comenzar'}</Text>
      </Tappable>
    </View>
  );
}

const CIRCULO = 150;

const useStyles = makeThemedStyles((t) => ({
  card: {
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.shape.radiusLg,
    padding: 24,
    marginTop: 24,
    borderLeftWidth: 5,
    ...t.shadows.card,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  titulo: {
    ...t.typography.type.section,
    color: t.colors.text,
  },
  intro: {
    ...t.typography.type.body,
    color: t.colors.textMuted,
    marginBottom: 20,
  },
  escenario: {
    height: CIRCULO + 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  circulo: {
    position: 'absolute',
    width: CIRCULO,
    height: CIRCULO,
    borderRadius: CIRCULO / 2,
    borderWidth: t.shape.borderMedium,
  },
  centroTexto: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  faseLabel: {
    ...t.typography.type.title,
    letterSpacing: 0.5,
  },
  faseHint: {
    ...t.typography.type.caption,
    color: t.colors.textFaint,
    marginTop: 4,
  },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 14,
  },
  botonTexto: {
    ...t.typography.fonts.semibold,
    fontSize: t.fontSize(15),
    color: t.colors.onPrimary,
  },
}));
