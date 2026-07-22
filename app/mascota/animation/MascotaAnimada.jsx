import { useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import Svg, { G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  cancelAnimation,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { escenaMascota } from '../sprites/disenoEtapas';
import { centroOjos } from '../sprites/geometria';
import { poseDePersonalidad } from '../sprites/personalidad';
import { ESPECIE_POR_DEFECTO } from '../sprites/especies';
import { renderNodos } from '../MascotaSprite';
import RecompensaCompletada from '../../components/wellness/RecompensaCompletada';

const AG = Animated.createAnimatedComponent(G);

// Rig ÚNICO de animación de la mascota, compartido por las 7 especies (Fase 14,
// Parte C). No conoce especies: opera sobre la estructura de grupos que expone
// disenoEtapas.js (cuerpo respira/salta, ojos parpadean, apéndice se balancea).
// Los 5 estados: idle, reacción al toque, celebración, evolución, necesita
// atención. Springs contenidos, coherentes con el lenguaje de theme/motion.js.
// Respeta reduce-motion: sin repeticiones ni confetti, sprite estático.
export default function MascotaAnimada({
  especie = ESPECIE_POR_DEFECTO,
  etapa = 1,
  personalidad = 'curiosa',
  accesorioCabeza = null,
  accesorioColor = null,
  necesitaAtencion = false,
  celebracionKey = 0,
  size = 132,
  onTocar,
}) {
  const reduce = useReducedMotion();
  const pose = poseDePersonalidad(personalidad);
  const escena = escenaMascota({
    especie, etapa, accesorioCabeza, accesorioColor,
  });
  const ojoCentro = centroOjos(escena.cara.ojos);
  const amp = necesitaAtencion ? 3.4 : 1.4;

  const breath = useSharedValue(0);
  const blink = useSharedValue(1);
  const jump = useSharedValue(0);
  const sway = useSharedValue(0);
  const evo = useSharedValue(1);

  const [fiesta, setFiesta] = useState(false);
  const etapaPrev = useRef(etapa);
  const celebracionPrev = useRef(celebracionKey);

  // Idle: respiración + parpadeo + balanceo del apéndice. Solo si hay movimiento.
  useEffect(() => {
    if (reduce) return undefined;
    breath.value = withRepeat(
      withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }), -1, true,
    );
    sway.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true,
    );
    blink.value = withRepeat(
      withSequence(
        withTiming(1, { duration: pose.parpadeoMs }),
        withTiming(0.12, { duration: 80 }),
        withTiming(1, { duration: 120 }),
      ), -1,
    );
    return () => {
      cancelAnimation(breath);
      cancelAnimation(sway);
      cancelAnimation(blink);
    };
  }, [reduce, pose.parpadeoMs, breath, sway, blink]);

  // Evolución: al subir de etapa, pop del sprite + confetti (reutiliza el sistema
  // de Fase 12). La transición dedicada es el salto de escala con resorte.
  useEffect(() => {
    if (etapa > etapaPrev.current) {
      if (!reduce) {
        evo.value = withSequence(
          withSpring(1.18, { damping: 9, stiffness: 180 }),
          withSpring(1, { damping: 12, stiffness: 160 }),
        );
        setFiesta(true);
      }
    }
    etapaPrev.current = etapa;
  }, [etapa, reduce, evo]);

  // Celebración: cuidado/reto completado (el contenedor incrementa celebracionKey).
  useEffect(() => {
    if (celebracionKey !== celebracionPrev.current && celebracionKey > 0 && !reduce) {
      setFiesta(true);
    }
    celebracionPrev.current = celebracionKey;
  }, [celebracionKey, reduce]);

  const reaccionarAlToque = () => {
    if (!reduce) {
      jump.value = withSequence(
        withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) }),
        withSpring(0, { damping: 10, stiffness: 220, mass: 0.7 }),
      );
    }
    onTocar?.();
  };

  const rebote = pose.rebote;
  const inclinacion = pose.inclinacion;
  const dim = necesitaAtencion ? 0.85 : 1;

  const cuerpoProps = useAnimatedProps(() => {
    const b = breath.value;
    const j = jump.value;
    const e = evo.value;
    return {
      originX: 50,
      originY: 88,
      scaleX: (1 - 0.015 * rebote * b) * (1 - 0.06 * j) * e,
      scaleY: (1 + 0.025 * rebote * b) * (1 + 0.1 * j) * e,
      y: -9 * j,
      rotation: inclinacion + (sway.value * 2 - 1) * amp,
      opacity: dim,
    };
  });

  const ojosProps = useAnimatedProps(() => ({
    originX: ojoCentro.x,
    originY: ojoCentro.y,
    scaleY: blink.value,
  }));

  const apendiceProps = useAnimatedProps(() => ({
    originX: 50,
    originY: 58,
    rotation: (sway.value * 2 - 1) * amp * 1.7,
  }));

  return (
    <Pressable
      onPress={reaccionarAlToque}
      accessibilityRole="image"
      accessibilityLabel={`Mascota ${especie}, etapa ${etapa}${necesitaAtencion ? ', te extraña' : ''}`}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {renderNodos(escena.shadow, 'sh')}
        <AG animatedProps={cuerpoProps}>
          <AG animatedProps={apendiceProps}>{renderNodos(escena.apendice, 'ap')}</AG>
          {renderNodos(escena.cuerpo, 'cu')}
          {renderNodos(escena.cara.resto, 're')}
          <AG animatedProps={ojosProps}>{renderNodos(escena.cara.ojos, 'oj')}</AG>
          {renderNodos(escena.frente, 'fr')}
        </AG>
      </Svg>
      {fiesta && (
        <Pressable
          pointerEvents="none"
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <RecompensaCompletada categoria="social" size={Math.round(size * 0.5)} onFin={() => setFiesta(false)} />
        </Pressable>
      )}
    </Pressable>
  );
}
