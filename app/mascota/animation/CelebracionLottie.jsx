import { Component, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useMotionPrefs } from '../../theme/ThemeContext';
import {
  celebracion, esperaFin, modoCelebracion, ubicacionCelebracion,
} from './celebraciones';

// Reproductor de celebraciones Lottie con respaldo.
//
// `lottie-react-native` es un módulo NATIVO: vive en el binario, no en el bundle
// de JS. Un dev-client construido antes de agregarlo no lo tiene, y montarlo ahí
// revienta la pantalla. Por eso nada acá asume que está: se resuelve una vez, se
// vigila el montaje, y ante cualquier señal de que no está se dibuja el respaldo
// —la celebración de siempre, hecha con Animated del core— que funciona igual.
//
// La guarda tiene dos capas porque una sola no alcanza:
//   1. `require` en try/catch → cubre que el paquete no esté instalado.
//   2. límite de error en el montaje → cubre el caso real y más probable, que es
//      que el JS cargue bien pero el binario no tenga registrada la vista nativa.
// El primer fallo apaga Lottie para TODA la sesión: si no está en este binario,
// no va a aparecer en el próximo render, y reintentar sería parpadear en cada
// celebración.

let vistaResuelta;
let apagadoPorFallo = false;

// Un componente de React es una función, o un objeto envuelto (memo/forwardRef)
// que se reconoce por $$typeof. Cualquier otra cosa —null, o el objeto de
// módulo entero— significa que la librería no resolvió a algo montable.
const esComponente = (v) => typeof v === 'function'
  || (v != null && typeof v === 'object' && v.$$typeof != null);

function resolverVista() {
  if (vistaResuelta !== undefined) return vistaResuelta;
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const mod = require('lottie-react-native');
    // Ojo con `mod?.default ?? mod`: si el paquete existe pero su default es
    // null, el `??` cae al objeto de módulo y lo daría por bueno.
    const Vista = mod && mod.__esModule ? mod.default : mod;
    vistaResuelta = esComponente(Vista) ? Vista : null;
  } catch {
    vistaResuelta = null;
  }
  return vistaResuelta;
}

export const lottieDisponible = () => !apagadoPorFallo && resolverVista() != null;

// Solo para las pruebas: devuelve la resolución al estado inicial.
export function reiniciarLottie() {
  vistaResuelta = undefined;
  apagadoPorFallo = false;
}

class LimiteDeError extends Component {
  constructor(props) {
    super(props);
    this.state = { fallo: false };
  }

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch() {
    apagadoPorFallo = true;
    this.props.alFallar?.();
  }

  render() {
    return this.state.fallo ? null : this.props.children;
  }
}

/**
 * `tipo`     — id del catálogo de celebraciones.js
 * `base`     — lado de referencia para medir (el `size` del sprite, o el ancho
 *              disponible en una tarjeta).
 * `origen`   — {x, y} dentro del contenedor, solo para las de encaje 'punto'.
 * `respaldo` — qué dibujar si Lottie no está. Suele ser la pieza que ya existía.
 * `onFin`    — se llama SIEMPRE que la celebración termina, gane quien gane, para
 *              que el contenedor desmonte el overlay.
 */
export default function CelebracionLottie({
  tipo,
  base = 132,
  origen = null,
  respaldo = null,
  onFin,
  testID,
}) {
  const { reduceMotion } = useMotionPrefs();
  const [fallo, setFallo] = useState(false);
  const finLlamado = useRef(false);

  const modo = modoCelebracion({
    reduceMotion,
    lottieDisponible: !fallo && lottieDisponible(),
    id: tipo,
  });

  const terminar = () => {
    if (finLlamado.current) return;
    finLlamado.current = true;
    onFin?.();
  };
  const terminarRef = useRef(terminar);
  terminarRef.current = terminar;

  // Los dos temporizadores de abajo existen solo para garantizar `onFin`. Sin
  // quien lo escuche no se arma ninguno: una celebración suelta —los corazones
  // de la caricia, que se reemplazan por key— no necesita avisar que terminó, y
  // dejarle un timer colgado ensucia el conteo del rig sin ganar nada.
  const hayQuienEscuche = typeof onFin === 'function';

  // Con movimiento reducido no se monta nada, pero el contenedor igual tiene que
  // enterarse de que "terminó": si no, se queda esperando un overlay que nunca
  // va a existir y el estado de fiesta no vuelve a cero.
  useEffect(() => {
    if (modo !== 'nada' || !hayQuienEscuche) return undefined;
    const t = setTimeout(() => terminarRef.current(), 0);
    return () => clearTimeout(t);
  }, [modo, hayQuienEscuche]);

  // Techo de duración. `onAnimationFinish` no llega si la vista se desmonta a
  // mitad de camino ni si el nativo no responde.
  useEffect(() => {
    if (modo !== 'lottie' || !hayQuienEscuche) return undefined;
    const t = setTimeout(() => terminarRef.current(), esperaFin(tipo));
    return () => clearTimeout(t);
  }, [modo, tipo, hayQuienEscuche]);

  if (modo === 'nada') return null;
  if (modo === 'respaldo') return respaldo;

  const conf = celebracion(tipo);
  const caja = ubicacionCelebracion(tipo, base, origen);
  const Vista = resolverVista();
  const aPantalla = conf.encaje === 'pantalla';
  const aCaja = conf.encaje === 'caja';

  const estiloContenedor = aPantalla
    ? {
      position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 9, elevation: 9,
    }
    : {
      position: 'absolute', zIndex: 7, elevation: 7, ...caja,
    };

  return (
    <View
      pointerEvents="none"
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={aCaja ? { width: '100%', height: '100%' } : estiloContenedor}
    >
      <LimiteDeError alFallar={() => setFallo(true)}>
        <Vista
          source={conf.fuente}
          autoPlay
          loop={false}
          resizeMode={aPantalla ? 'cover' : 'contain'}
          onAnimationFinish={terminar}
          style={{ width: '100%', height: '100%' }}
        />
      </LimiteDeError>
    </View>
  );
}
