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
} from 'react-native-reanimated';
import { escenaMascota } from '../sprites/disenoEtapas';
import { centroOjos } from '../sprites/geometria';
import { poseDePersonalidad } from '../sprites/personalidad';
import { ESPECIE_POR_DEFECTO } from '../sprites/especies';
import { renderNodos } from '../MascotaSprite';
import RecompensaCompletada from '../../components/wellness/RecompensaCompletada';
import {
  respiracion, balanceo, salto, evolucion, followApendice,
} from './movimiento';
import { planParpadeo, pasosParpadeo } from './parpadeo';

const AG = Animated.createAnimatedComponent(G);

// Rig ÚNICO de animación de la mascota, compartido por las 7 especies (Fase 14,
// Parte C). No conoce especies: opera sobre la estructura de grupos que expone
// disenoEtapas.js (cuerpo respira/salta, ojos parpadean, apéndice se balancea).
// Los 5 estados: idle, reacción al toque, celebración, evolución, necesita
// atención. Timing y curvas centralizados en movimiento.js (Fase 17): ritmo
// gentil, anticipación antes de moverse, follow-through del apéndice y parpadeo
// de intervalo variable (parpadeo.js). Respeta reduce-motion: sin repeticiones,
// sin parpadeo ni confetti, sprite estático.
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
  const amp = necesitaAtencion ? balanceo.ampAtencionDeg : balanceo.ampIdleDeg;

  const breath = useSharedValue(0);
  const blink = useSharedValue(1);
  const jump = useSharedValue(0);
  const sway = useSharedValue(0);
  const evo = useSharedValue(1);
  const apendiceKick = useSharedValue(0);

  const [fiesta, setFiesta] = useState(false);
  const etapaPrev = useRef(etapa);
  const celebracionPrev = useRef(celebracionKey);

  // Idle ambiental: respiración + balanceo del apéndice. Estos SÍ son periódicos
  // a propósito (respirar lo es), así que se quedan en withRepeat.
  useEffect(() => {
    if (reduce) return undefined;
    breath.value = withRepeat(
      withTiming(1, { duration: respiracion.duracionMs, easing: respiracion.easing }), -1, true,
    );
    sway.value = withRepeat(
      withTiming(1, { duration: balanceo.duracionMs, easing: balanceo.easing }), -1, true,
    );
    return () => {
      cancelAnimation(breath);
      cancelAnimation(sway);
    };
  }, [reduce, breath, sway]);

  // Parpadeo: fuera del loop ambiental porque no debe ser periódico. Cada
  // parpadeo se programa de cero con su propia espera sorteada (parpadeo.js), y
  // de a ratos sale doble. El timer vive en JS —y no como una cadena de worklets—
  // porque una secuencia con withRepeat volvería a ser periódica (solo que con un
  // período más largo), y porque re-armarse desde el callback de withTiming
  // recursaría infinito en jest, donde el mock invoca el callback en el acto.
  // Que el hilo de JS llegue tarde acá no es un problema: lo hace más orgánico.
  useEffect(() => {
    if (reduce) {
      blink.value = 1;
      return undefined;
    }
    let timer = null;
    let vivo = true;
    const programar = () => {
      const { esperaMs, doble } = planParpadeo(pose.parpadeoMs);
      timer = setTimeout(() => {
        if (!vivo) return;
        blink.value = withSequence(
          ...pasosParpadeo(doble).map(
            (paso) => withTiming(paso.a, { duration: paso.ms, easing: paso.curva }),
          ),
        );
        programar();
      }, esperaMs);
    };
    programar();
    return () => {
      vivo = false;
      clearTimeout(timer);
      cancelAnimation(blink);
      blink.value = 1;
    };
  }, [reduce, pose.parpadeoMs, blink]);

  // Evolución: al subir de etapa, pop del sprite + confetti (reutiliza el sistema
  // de Fase 12). La transición dedicada es el salto de escala con resorte.
  useEffect(() => {
    if (etapa > etapaPrev.current) {
      if (!reduce) {
        evo.value = withSequence(
          withSpring(evolucion.pop.toValue, evolucion.pop.spring),
          withSpring(evolucion.settle.toValue, evolucion.settle.spring),
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
      // Anticipa (squash breve, j<0) → sube → asienta con resorte.
      jump.value = withSequence(
        withTiming(salto.anticipacionMag, { duration: salto.anticipacionMs }),
        withTiming(1, { duration: salto.subidaMs, easing: salto.subidaEasing }),
        withSpring(0, salto.asentamiento),
      );
      // Follow-through: el apéndice arranca un beat después del cuerpo y arrastra
      // al volver, con un resorte más blando (sobrepasa en vez de seguir rígido).
      apendiceKick.value = withSequence(
        withTiming(0, { duration: salto.anticipacionMs + salto.subidaMs * 0.5 }),
        withSpring(1, followApendice.spring),
        withSpring(0, followApendice.spring),
      );
    }
    onTocar?.();
  };

  const rebote = pose.rebote;
  const inclinacion = pose.inclinacion;
  const dim = necesitaAtencion ? 0.85 : 1;

  // Primitivos para los worklets (cierran sobre números, no sobre objetos).
  const respX = respiracion.escalaX;
  const respY = respiracion.escalaY;
  const saltoX = salto.escalaX;
  const saltoY = salto.escalaY;
  const alturaSalto = salto.alturaPx;
  const factorApendice = balanceo.factorApendice;
  const gradosApendice = followApendice.gradosPorSalto;

  const cuerpoProps = useAnimatedProps(() => {
    const b = breath.value;
    const j = jump.value;
    const e = evo.value;
    return {
      originX: 50,
      originY: 88,
      scaleX: (1 - respX * rebote * b) * (1 - saltoX * j) * e,
      scaleY: (1 + respY * rebote * b) * (1 + saltoY * j) * e,
      y: -alturaSalto * j,
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
    rotation: (sway.value * 2 - 1) * amp * factorApendice
      + apendiceKick.value * gradosApendice,
  }));

  return (
    <Pressable
      onPress={reaccionarAlToque}
      accessibilityRole="image"
      accessibilityLabel={`Mascota ${especie}, etapa ${etapa}${necesitaAtencion ? ', te extraña' : ''}`}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {renderNodos(escena.defs, 'df')}
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
