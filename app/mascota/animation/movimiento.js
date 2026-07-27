// Tokens de movimiento del RIG de mascota (MascotaAnimada). Separado de
// theme/motion.js a propósito: los loops ambientales de la criatura
// (respiración ~1.9 s, balanceo ~2.6 s) son más lentos que la regla "nada dura
// más de 400 ms" de la casa, que rige transiciones discretas de UI. Acá el
// lenguaje es el de un ser que respira, no el de un botón. Reutiliza los easings
// de reanimated (el rig corre en worklets) y hace eco de los springs blandos de
// la casa.
//
// Regla de esta fase: nada frenético. La mascota "se infla" y "se mece"; cuando
// reacciona, ANTICIPA antes de moverse y el apéndice blando ARRASTRA un instante
// después de que el cuerpo se detiene (follow-through).
import { Easing } from 'react-native-reanimated';

// Respiración: el cuerpo se infla y desinfla en loop. escala* = cuánto deforma
// (leve squash & stretch vertical, coherente con el ritmo gentil).
export const respiracion = {
  duracionMs: 1900,
  easing: Easing.inOut(Easing.quad),
  escalaX: 0.015,
  escalaY: 0.025,
};

// Balanceo ambiental: el cuerpo se mece un poco; el apéndice, más (factorApendice).
// La amplitud sale de la energía de la expresión (ver `expresiones`): con poca se
// mece apenas, como dormitando; con mucha se mece más, nunca agitada. Antes eran
// dos valores fijos (idle y atención) y la mascota descuidada terminaba
// moviéndose MÁS que la cuidada, que se leía ansiosa en vez de tranquila.
export const balanceo = {
  duracionMs: 2600,
  easing: Easing.inOut(Easing.sin),
  ampMinDeg: 0.9,
  ampMaxDeg: 2.6,
  factorApendice: 1.7,
};

// Parpadeo: escala Y del ojo al cerrar + tiempos de cierre/apertura. El INTERVALO
// entre parpadeos NO es fijo — un parpadeo perfectamente periódico se lee como un
// tic mecánico. personalidad.js aporta la MEDIA y estos tokens la variación:
// cuánto se aparta de esa media (jitter) y cada cuánto sale un parpadeo doble.
// El ritmo en sí lo arma parpadeo.js, que no conoce otros números que estos.
export const parpadeo = {
  cerrado: 0.12,
  cierreMs: 80,
  aperturaMs: 120,
  // El párpado acelera al cerrarse y frena al abrirse. Antes quedaba en el easing
  // por defecto de reanimated; explícito acá, como el resto del rig.
  cierreEasing: Easing.in(Easing.quad),
  aperturaEasing: Easing.out(Easing.quad),

  // Espera hasta el próximo parpadeo = media de personalidad × un factor sorteado
  // en este rango. Con la media 3800 ms de 'curiosa' da ~1,7 s a 6,6 s.
  jitterMin: 0.45,
  jitterMax: 1.75,
  // Exponente que sesga el sorteo hacia las esperas cortas y deja las largas como
  // pausas ocasionales (una cara real parpadea en tandas, no repartido parejo).
  // Con 1.5 el promedio cae en ~0.97 de la media, así que la identidad de cada
  // personalidad se conserva: la "más tranquila" sigue parpadeando menos seguido.
  sesgo: 1.5,
  // Piso duro: pase lo que pase, nunca dos parpadeos encimados.
  esperaMinMs: 700,

  // Cada tanto un doble parpadeo. El segundo golpe es más rápido y no cierra del
  // todo — así se ve en una cara de verdad, y es lo que evita que el doble se
  // lea como un tartamudeo.
  probDoble: 0.22,
  pausaDobleMs: 90,
  dobleFactor: 0.8,
  dobleCerrado: 0.25,
};

// Reacción al toque: ANTICIPA (squash breve, j<0) → sube → asienta con spring.
// escala*/alturaPx son cuánto deforma y salta el cuerpo con j (el valor animado).
export const salto = {
  anticipacionMs: 90,
  anticipacionMag: -0.4,
  subidaMs: 130,
  subidaEasing: Easing.out(Easing.quad),
  asentamiento: { damping: 10, stiffness: 220, mass: 0.7 },
  escalaX: 0.06,
  escalaY: 0.1,
  alturaPx: 9,
};

// Evolución: pop de escala al subir de etapa y asentamiento.
export const evolucion = {
  pop: { toValue: 1.18, spring: { damping: 9, stiffness: 180 } },
  settle: { toValue: 1, spring: { damping: 12, stiffness: 160 } },
};

// Expresiones. Cada una es la misma receta: forma del párpado, cuánto sube el
// rubor, cuánta energía tiene el cuerpo (modula respiración, balanceo y rebote) y
// cuánto se inclina. `ojo` escala el globo del ojo y se multiplica con el
// parpadeo. Las cuatro primeras son de FONDO y las decide animo.js a partir del
// cuidado; las otras son PUNTUALES y las dispara la interacción, con su duración.
//
// Ninguna cara de fondo es difícil, a propósito: de radiante se baja a serena y a
// adormilada. La tristeza y el enojo existen solo como reacción de segundos, para
// que descuidar a la mascota nunca se lea como un reproche.
export const expresiones = {
  adormilada: {
    parpado: 'medio', ojo: 0.62, rubor: 0.9, energia: 0.34, inclinacionDeg: 2.6,
  },
  serena: {
    parpado: 'ninguno', ojo: 1, rubor: 1, energia: 0.55, inclinacionDeg: 0,
  },
  contenta: {
    parpado: 'ninguno', ojo: 1.04, rubor: 1.16, energia: 0.78, inclinacionDeg: 0,
  },
  radiante: {
    parpado: 'ninguno', ojo: 1.08, rubor: 1.3, energia: 1, inclinacionDeg: 0,
  },
  encantada: {
    parpado: 'arco', ojo: 0.2, rubor: 1.45, energia: 1, inclinacionDeg: 0, duracionMs: 2500,
  },
  sorprendida: {
    parpado: 'ninguno', ojo: 1.18, rubor: 1.1, energia: 0.9, inclinacionDeg: 0, duracionMs: 800,
  },
  mimosa: {
    parpado: 'medio', ojo: 0.5, rubor: 1.4, energia: 0.46, inclinacionDeg: 0, duracionMs: null,
  },
  enfurrunada: {
    parpado: 'ceno', ojo: 0.86, rubor: 1.2, energia: 0.68, inclinacionDeg: -3.2, duracionMs: 1500,
  },
  saludando: {
    parpado: 'ninguno', ojo: 1.12, rubor: 1.25, energia: 0.95, inclinacionDeg: 0, duracionMs: 1600,
  },
};

// Saludo al entrar a la pantalla: el mismo salto del toque, más chico. Que use
// la misma curva y no una propia es lo que hace que se lea como la misma
// criatura y no como una animación de entrada pegada encima.
export const saludo = { escala: 0.55 };

export const EXPRESION_BASE = 'serena';

// La mirada sigue el dedo. Los máximos son chicos a propósito: el ojo mide 3.2
// de radio en un lienzo de 100, así que más de un punto y pico de corrimiento ya
// lo saca de la cara y la mascota queda bizca. `vueltaMs` es cuánto sostiene la
// mirada después de que sueltan, antes de volver despacio al centro — sin esa
// espera el gesto se lee como un tic en vez de como atención.
export const mirada = {
  maxPx: 1.15,
  maxPy: 0.75,
  spring: { damping: 14, stiffness: 150, mass: 0.8 },
  vuelta: { damping: 16, stiffness: 90, mass: 1 },
  vueltaMs: 420,
};

// Caricia: sostener el dedo encima. Se inclina hacia donde está la mano y pone
// cara de mimosa; al soltar, el apéndice blando da una sacudida corta de gusto.
// `esperaMs` separa el toque de la caricia — por debajo de eso sigue siendo un
// toque, y RN garantiza que si dispara onLongPress ya no dispara onPress.
export const caricia = {
  esperaMs: 260,
  gradosPorPunto: 2.2,
  entrada: { damping: 15, stiffness: 110, mass: 1 },
  sacudida: 0.6,
};

// Gesto cada tanto si nadie la toca. Las esperas CRECEN (crecimiento) y tienen
// techo: la mascota hace algo al rato, un poco menos seguido después, y termina
// espaciándose mucho. Es a propósito — el gesto es para que se sienta viva, no
// para reclamar atención, y algo que insiste cada quince segundos reclama.
// El primer toque después de un gesto la agarra distraída: ahí va la sorpresa.
export const inactividad = {
  primeraMs: 16000,
  crecimiento: 1.55,
  maxMs: 78000,
  jitter: 0.18,
  estiron: { magnitud: -0.28, subidaMs: 620, vueltaMs: 520 },
  bostezo: { cerrado: 0.14, cierreMs: 420, aperturaMs: 560 },
  vistazo: { sostenerMs: 900 },
};

// Varios toques seguidos en poco rato: se enfurruña un momento, jugando. No es
// un castigo por insistir, es que reacciona a que la estén zarandeando.
export const mohin = { toques: 4, ventanaMs: 2600 };

// Cuánto tarda el cuerpo en acomodarse a una expresión nueva. Lento a propósito:
// un cambio de ánimo instantáneo se lee como un parpadeo de sistema, no como un
// estado. Los párpados sí cambian de golpe (son geometría, no una transición).
export const transicionAnimo = { duracionMs: 620, easing: Easing.inOut(Easing.sin) };

// Follow-through del apéndice: al reaccionar el cuerpo, el apéndice blando
// (penacho/orejas/cola/voluta) barre y vuelve con un spring MÁS blando —
// arrastra y sobrepasa en vez de seguir rígido. gradosPorSalto = amplitud del
// barrido cuando el cuerpo salta.
export const followApendice = {
  spring: { damping: 7, stiffness: 90, mass: 1.1 },
  gradosPorSalto: 10,
};
