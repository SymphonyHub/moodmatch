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
  withDelay,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';
import { escenaMascota } from '../sprites/disenoEtapas';
import { centroDe } from '../sprites/geometria';
import { poseDePersonalidad } from '../sprites/personalidad';
import { ESPECIE_POR_DEFECTO } from '../sprites/especies';
import { renderNodos } from '../MascotaSprite';
import RecompensaCompletada from '../../components/wellness/RecompensaCompletada';
import {
  respiracion, balanceo, salto, evolucion, followApendice,
  expresiones, EXPRESION_BASE, transicionAnimo, mirada, caricia,
} from './movimiento';
import { planParpadeo, pasosParpadeo } from './parpadeo';
import { desplazamientoMirada } from './mirada';

const AG = Animated.createAnimatedComponent(G);

// Rig ÚNICO de animación de la mascota, compartido por las 7 especies (Fase 14,
// Parte C). No conoce especies: opera sobre la estructura de grupos que expone
// disenoEtapas.js (cuerpo respira/salta, ojos parpadean, apéndice se balancea).
// Los 5 estados: idle, reacción al toque, celebración, evolución, necesita
// atención. Timing y curvas centralizados en movimiento.js (Fase 17): ritmo
// gentil, anticipación antes de moverse, follow-through del apéndice y parpadeo
// de intervalo variable (parpadeo.js). Respeta reduce-motion: sin repeticiones,
// sin parpadeo ni confetti, sprite estático.
//
// EXPRESIÓN (Fase 17): `animo` es la cara de fondo que sale del cuidado
// (animo.js) y `evento` dispara la puntual, que dura unos segundos y se disuelve
// sola. La expresión no mueve la boca —de las 7 especies varias tienen pico o
// fauces— sino párpados, rubor y postura, que sí son comunes a todas.
export default function MascotaAnimada({
  especie = ESPECIE_POR_DEFECTO,
  etapa = 1,
  personalidad = 'curiosa',
  accesorioCabeza = null,
  accesorioColor = null,
  animo = EXPRESION_BASE,
  evento = null,
  size = 132,
  onTocar,
}) {
  const reduce = useReducedMotion();
  const pose = poseDePersonalidad(personalidad);

  // Expresión puntual: se pisa sobre la de fondo y se va sola. La caricia gana
  // sobre las dos mientras el dedo siga apoyado — es lo que está pasando ahora.
  const [puntual, setPuntual] = useState(null);
  const [acariciando, setAcariciando] = useState(false);
  const expresion = acariciando
    ? 'mimosa'
    : (expresiones[puntual] ? puntual : (expresiones[animo] ? animo : EXPRESION_BASE));
  const receta = expresiones[expresion];

  const escena = escenaMascota({
    especie, etapa, accesorioCabeza, accesorioColor, parpado: receta.parpado,
  });
  const ojoCentro = centroDe(escena.cara.ojos);
  const ruborCentro = centroDe(escena.cara.rubor);

  const breath = useSharedValue(0);
  const blink = useSharedValue(1);
  const jump = useSharedValue(0);
  const sway = useSharedValue(0);
  const evo = useSharedValue(1);
  const apendiceKick = useSharedValue(0);
  // Una sola señal para todo lo que cambia con el ánimo: energía del cuerpo,
  // tamaño del ojo, intensidad del rubor e inclinación. Se anima con una curva
  // larga para que el cambio de ánimo se lea como un estado y no como un salto.
  const energia = useSharedValue(receta.energia);
  const ojoAbre = useSharedValue(receta.ojo);
  const ruborSube = useSharedValue(receta.rubor);
  const ladeo = useSharedValue(receta.inclinacionDeg);
  const miraX = useSharedValue(0);
  const miraY = useSharedValue(0);
  const mimo = useSharedValue(0);

  const [fiesta, setFiesta] = useState(false);
  const etapaPrev = useRef(etapa);
  const eventoPrev = useRef(evento?.key ?? 0);

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
    // Durante la caricia el ojo queda entrecerrado por la expresión: si además
    // siguiera parpadeando, los dos cierres pelearían por la misma escala.
    if (reduce || acariciando) {
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
  }, [reduce, acariciando, pose.parpadeoMs, blink]);

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

  // El cuerpo se acomoda a la expresión con una curva larga; los párpados, en
  // cambio, cambian de golpe porque son geometría y no una transición.
  useEffect(() => {
    const t = reduce ? { duration: 0 } : transicionAnimo;
    energia.value = withTiming(receta.energia, t);
    ojoAbre.value = withTiming(receta.ojo, t);
    ruborSube.value = withTiming(receta.rubor, t);
    ladeo.value = withTiming(receta.inclinacionDeg, t);
  }, [receta, reduce, energia, ojoAbre, ruborSube, ladeo]);

  // Evento del contenedor (cuidado, regalo, reto): dispara la cara puntual y,
  // si corresponde, el confetti. La cara se disuelve sola pasado su tiempo.
  // Se depende de los campos y no del objeto: el contenedor arma `evento` en
  // cada render, y con el objeto como dependencia el efecto correría siempre.
  const eventoKey = evento?.key ?? 0;
  const eventoTipo = evento?.tipo;
  const eventoConfetti = evento?.confetti;
  useEffect(() => {
    if (eventoKey === eventoPrev.current || eventoKey <= 0) return undefined;
    eventoPrev.current = eventoKey;
    if (reduce) return undefined;

    if (eventoConfetti !== false) setFiesta(true);

    const cara = expresiones[eventoTipo] ? eventoTipo : 'encantada';
    setPuntual(cara);
    const ms = expresiones[cara].duracionMs;
    if (!ms) return undefined;
    const timer = setTimeout(() => setPuntual(null), ms);
    return () => clearTimeout(timer);
  }, [eventoKey, eventoTipo, eventoConfetti, reduce]);

  // La mirada busca el punto tocado y se queda ahí mientras el dedo esté apoyado.
  // Al soltar sostiene un instante más y recién entonces vuelve al centro, que es
  // lo que hace que se lea como atención y no como un tic.
  const mirarHacia = (evt) => {
    if (reduce) return;
    const { locationX, locationY } = evt?.nativeEvent ?? {};
    const destino = desplazamientoMirada(locationX, locationY, size);
    miraX.value = withSpring(destino.x, mirada.spring);
    miraY.value = withSpring(destino.y, mirada.spring);
  };

  // Sostener el dedo es una caricia: se inclina hacia la mano y entrecierra los
  // ojos. RN garantiza que si dispara onLongPress ya no dispara onPress, así que
  // la caricia y el toque no se pisan.
  const empezarCaricia = () => {
    if (reduce) return;
    setAcariciando(true);
    mimo.value = withSpring(1, caricia.entrada);
  };

  const soltar = () => {
    if (reduce) return;
    miraX.value = withDelay(mirada.vueltaMs, withSpring(0, mirada.vuelta));
    miraY.value = withDelay(mirada.vueltaMs, withSpring(0, mirada.vuelta));
    if (!acariciando) return;
    setAcariciando(false);
    mimo.value = withSpring(0, caricia.entrada);
    // Una sacudida corta del apéndice al soltar: se sacude de gusto.
    apendiceKick.value = withSequence(
      withSpring(caricia.sacudida, followApendice.spring),
      withSpring(0, followApendice.spring),
    );
  };

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

  // Primitivos para los worklets (cierran sobre números, no sobre objetos).
  const respX = respiracion.escalaX;
  const respY = respiracion.escalaY;
  const saltoX = salto.escalaX;
  const saltoY = salto.escalaY;
  const alturaSalto = salto.alturaPx;
  const factorApendice = balanceo.factorApendice;
  const gradosApendice = followApendice.gradosPorSalto;
  const ampMin = balanceo.ampMinDeg;
  const ampMax = balanceo.ampMaxDeg;
  const gradosCaricia = caricia.gradosPorPunto;

  // La energía de la expresión modula el idle entero: cuánto se infla al
  // respirar y cuánto se mece. Con la mascota adormilada esto la vuelve más
  // quieta, no más agitada, que era el problema del tratamiento anterior.
  const cuerpoProps = useAnimatedProps(() => {
    const b = breath.value;
    const j = jump.value;
    const e = evo.value;
    const en = energia.value;
    const amp = ampMin + (ampMax - ampMin) * en;
    const respira = rebote * (0.55 + 0.75 * en);
    return {
      originX: 50,
      originY: 88,
      scaleX: (1 - respX * respira * b) * (1 - saltoX * j) * e,
      scaleY: (1 + respY * respira * b) * (1 + saltoY * j) * e,
      y: -alturaSalto * j,
      rotation: inclinacion + ladeo.value + (sway.value * 2 - 1) * amp
        + mimo.value * miraX.value * gradosCaricia,
    };
  });

  const ojosProps = useAnimatedProps(() => ({
    originX: ojoCentro.x,
    originY: ojoCentro.y,
    scaleY: blink.value * ojoAbre.value,
    x: miraX.value,
    y: miraY.value,
  }));

  // Los párpados viajan con la mirada pero NO con el parpadeo: si se escalaran
  // junto al ojo, el arco de la cara feliz se aplastaría hasta desaparecer.
  const gestoProps = useAnimatedProps(() => ({
    x: miraX.value,
    y: miraY.value,
  }));

  // El rubor sube y baja por tamaño, no por opacidad: las chapitas ya vienen a
  // 0.7 de la silueta aprobada, así que subir el grupo por encima de 1 no haría
  // nada. La opacidad solo sirve para apagarlo cuando la mascota dormita.
  const ruborProps = useAnimatedProps(() => {
    const r = ruborSube.value;
    return {
      originX: ruborCentro.x,
      originY: ruborCentro.y,
      opacity: Math.min(1, r),
      scale: 0.6 + 0.4 * r,
    };
  });

  const apendiceProps = useAnimatedProps(() => {
    const amp = ampMin + (ampMax - ampMin) * energia.value;
    return {
      originX: 50,
      originY: 58,
      rotation: (sway.value * 2 - 1) * amp * factorApendice
        + apendiceKick.value * gradosApendice,
    };
  });

  return (
    <Pressable
      onPress={reaccionarAlToque}
      onPressIn={mirarHacia}
      onPressOut={soltar}
      onLongPress={empezarCaricia}
      delayLongPress={caricia.esperaMs}
      accessibilityRole="image"
      accessibilityLabel={`Mascota ${especie}, etapa ${etapa}${animo === 'adormilada' ? ', te extraña' : ''}`}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {renderNodos(escena.defs, 'df')}
        {renderNodos(escena.shadow, 'sh')}
        <AG animatedProps={cuerpoProps}>
          <AG animatedProps={apendiceProps}>{renderNodos(escena.apendice, 'ap')}</AG>
          {renderNodos(escena.cuerpo, 'cu')}
          <AG animatedProps={ruborProps}>{renderNodos(escena.cara.rubor, 'ru')}</AG>
          {renderNodos(escena.cara.resto, 're')}
          <AG animatedProps={ojosProps}>{renderNodos(escena.cara.ojos, 'oj')}</AG>
          <AG animatedProps={gestoProps}>{renderNodos(escena.cara.gesto, 'ge')}</AG>
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
