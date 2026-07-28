// Catálogo y política de las celebraciones Lottie de la mascota.
//
// Este módulo es PURO a propósito: no importa react-native ni el reproductor.
// Lo que decide —si una celebración corre, con qué se dibuja y de qué tamaño—
// se puede probar sin módulo nativo, que es justo lo que no está disponible
// hasta el próximo build. El reproductor vive en CelebracionLottie.jsx.
//
// Las medidas intrínsecas y la duración salen del propio .json (composición `w`,
// `h`, y `op`/`fr` para los fotogramas). Están acá copiadas porque leerlas en
// caliente obligaría a parsear 235 KB de animación solo para medir un contenedor.

const HEART = require('../assets/animaciones/floating heart.json');
const LEVEL_UP = require('../assets/animaciones/Level Up.json');
const CONFETTI = require('../assets/animaciones/confetti.json');
const SPARKLES = require('../assets/animaciones/sparkles.json');

// `encaje` dice cómo se coloca la animación:
//   'sprite'  → cuadrada, centrada sobre la mascota
//   'punto'   → nace en un punto (el dedo que acaricia)
//   'pantalla'→ cubre la pantalla entera
//   'caja'    → llena el contenedor que la monta (una tarjeta, una vista previa)
//
// `factor` es cuánto mide respecto de la referencia que le pasen (el lado del
// sprite, o el ancho de la caja).
export const CELEBRACIONES = {
  'subida-nivel': {
    fuente: LEVEL_UP,
    ancho: 1080,
    alto: 1080,
    encaje: 'sprite',
    factor: 1.6,
    duracionMs: 2000,
  },
  corazones: {
    fuente: HEART,
    ancho: 100,
    alto: 300,
    encaje: 'punto',
    factor: 0.62,
    duracionMs: 3500,
  },
  confeti: {
    fuente: CONFETTI,
    // Lienzo de teléfono en vertical: solo tiene sentido a pantalla completa.
    // Dentro del sprite de 132 px se vería un puñado de puntos perdidos.
    ancho: 1242,
    alto: 2688,
    encaje: 'pantalla',
    factor: 1,
    duracionMs: 3733,
  },
  destellos: {
    fuente: SPARKLES,
    ancho: 246,
    alto: 111,
    encaje: 'caja',
    factor: 1,
    duracionMs: 2469,
  },
};

export const IDS_CELEBRACION = Object.keys(CELEBRACIONES);

export const celebracion = (id) => CELEBRACIONES[id] ?? null;

// Qué se monta para una celebración. Es la única decisión que toma el sistema:
//
//   'nada'     → con movimiento reducido no se anima NADA, ni siquiera el
//                respaldo. Es la misma regla que ya cumple el rig.
//   'lottie'   → el módulo nativo está en el binario
//   'respaldo' → no lo está (dev-client viejo, o falló al montar): se dibuja la
//                celebración de siempre, hecha con Animated del core
export function modoCelebracion({ reduceMotion = false, lottieDisponible = false, id } = {}) {
  if (reduceMotion) return 'nada';
  if (!CELEBRACIONES[id]) return 'nada';
  return lottieDisponible ? 'lottie' : 'respaldo';
}

// Medida del contenedor, conservando la proporción de la composición original.
// `base` es el lado de referencia: el tamaño del sprite para 'sprite' y 'punto',
// el ancho disponible para 'caja'.
export function medidaCelebracion(id, base) {
  const c = CELEBRACIONES[id];
  const lado = Number(base);
  if (!c || !Number.isFinite(lado) || lado <= 0) return { width: 0, height: 0 };
  const width = lado * c.factor;
  return { width, height: (width * c.alto) / c.ancho };
}

// Posición absoluta dentro del contenedor del sprite. Para 'punto' se centra la
// animación en el dedo y se la sube un poco: los corazones nacen de la mano y
// suben, así que arrancar centrados los dejaría medio cuerpo por debajo.
export function ubicacionCelebracion(id, base, origen) {
  const c = CELEBRACIONES[id];
  if (!c) return null;
  const { width, height } = medidaCelebracion(id, base);

  if (c.encaje === 'punto') {
    const lado = Number(base) || 0;
    const x = Number.isFinite(Number(origen?.x)) ? Number(origen.x) : lado / 2;
    const y = Number.isFinite(Number(origen?.y)) ? Number(origen.y) : lado / 2;
    return { left: x - width / 2, top: y - height * 0.78, width, height };
  }
  if (c.encaje === 'sprite') {
    const lado = Number(base) || 0;
    return { left: (lado - width) / 2, top: (lado - height) / 2, width, height };
  }
  return { width, height };
}

// Margen sobre la duración real antes de dar la animación por terminada. Existe
// porque `onAnimationFinish` no llega si la vista se desmonta o si el módulo
// nativo no responde: sin este techo, el overlay se quedaría montado para
// siempre tapando la pantalla.
export const MARGEN_FIN_MS = 400;

export function esperaFin(id) {
  const c = CELEBRACIONES[id];
  return c ? c.duracionMs + MARGEN_FIN_MS : MARGEN_FIN_MS;
}
