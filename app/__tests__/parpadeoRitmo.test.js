import { planParpadeo, pasosParpadeo } from '../mascota/animation/parpadeo';
import { parpadeo } from '../mascota/animation/movimiento';

// El rig corre en worklets (mockeados en jest), así que el ritmo del parpadeo se
// escribió como lógica pura para poder verificarlo de verdad. Todos los asserts
// van CONTRA EL TOKEN, no contra literales: si alguien hardcodea un número en el
// componente o cambia un token sin querer, estos tests lo cazan.

// Sorteo determinista: devuelve los valores de la lista, en orden.
const azarFijo = (...valores) => {
  let i = 0;
  return () => valores[Math.min(i++, valores.length - 1)];
};

const MEDIA = 3800; // 'curiosa' en personalidad.js

describe('planParpadeo: cuánto espera hasta el próximo parpadeo', () => {
  test('el sorteo se mantiene dentro del rango de jitter del token', () => {
    const minimo = planParpadeo(MEDIA, azarFijo(0)).esperaMs;
    const maximo = planParpadeo(MEDIA, azarFijo(0.999)).esperaMs;

    expect(minimo).toBe(Math.round(MEDIA * parpadeo.jitterMin));
    expect(maximo).toBeLessThanOrEqual(Math.round(MEDIA * parpadeo.jitterMax));
    expect(maximo).toBeGreaterThan(minimo);
    expect(minimo).toBeGreaterThanOrEqual(parpadeo.esperaMinMs);
  });

  test('respeta el piso duro aunque la media sea absurdamente corta', () => {
    // Nunca dos parpadeos encimados, pase lo que pase con la media.
    expect(planParpadeo(50, azarFijo(0)).esperaMs).toBe(parpadeo.esperaMinMs);
  });

  test('no es un metrónomo: las esperas varían de un parpadeo al otro', () => {
    const esperas = Array.from({ length: 60 }, () => planParpadeo(MEDIA).esperaMs);
    // Con un timer fijo (el bug que corrige esta tarea) habría UN solo valor.
    expect(new Set(esperas).size).toBeGreaterThan(30);
  });

  test('conserva la media de personalidad: la tranquila sigue parpadeando menos', () => {
    // El sesgo inclina el sorteo hacia esperas cortas, pero el promedio tiene que
    // seguir orbitando la media de personalidad — si no, todas las mascotas
    // terminarían parpadeando igual y se perdería la identidad de la pose.
    const promedio = (media) => {
      const muestras = Array.from({ length: 5000 }, () => planParpadeo(media).esperaMs);
      return muestras.reduce((a, b) => a + b, 0) / muestras.length;
    };
    // E[u^sesgo] = 1 / (sesgo + 1) para u uniforme en [0,1].
    const factorEsperado = parpadeo.jitterMin
      + (parpadeo.jitterMax - parpadeo.jitterMin) / (parpadeo.sesgo + 1);
    const esperado = MEDIA * factorEsperado;

    // Margen del 5%: holgado para el ruido del muestreo (~8 desvíos estándar),
    // estrecho para cazar un sesgo mal calibrado.
    expect(Math.abs(promedio(MEDIA) - esperado)).toBeLessThan(esperado * 0.05);
    // 'más animada' (3000) vs 'más tranquila' (5400) en personalidad.js.
    expect(promedio(3000)).toBeLessThan(promedio(5400));
  });

  test('una media inválida cae al valor por defecto en vez de romper el timer', () => {
    // Un setTimeout con NaN o con un número negativo dispararía en bucle: sería
    // un parpadeo frenético, justo lo contrario del ritmo de la fase.
    for (const media of [undefined, null, 0, -100, NaN, 'pronto']) {
      const { esperaMs } = planParpadeo(media, azarFijo(0.5));
      expect(Number.isFinite(esperaMs)).toBe(true);
      expect(esperaMs).toBeGreaterThanOrEqual(parpadeo.esperaMinMs);
    }
  });
});

describe('planParpadeo: parpadeo doble ocasional', () => {
  test('sale doble solo por debajo de la probabilidad del token', () => {
    // El segundo sorteo del par decide si es doble.
    expect(planParpadeo(MEDIA, azarFijo(0.5, 0)).doble).toBe(true);
    expect(planParpadeo(MEDIA, azarFijo(0.5, 0.99)).doble).toBe(false);
  });

  test('la probabilidad queda en un rango sano: ocasional, no un tic', () => {
    expect(parpadeo.probDoble).toBeGreaterThan(0);
    expect(parpadeo.probDoble).toBeLessThan(0.5);
  });

  test('la frecuencia real sigue a la probabilidad del token', () => {
    const dobles = Array.from({ length: 3000 }, () => planParpadeo(MEDIA).doble)
      .filter(Boolean).length;
    expect(dobles / 3000).toBeCloseTo(parpadeo.probDoble, 1);
  });
});

describe('pasosParpadeo: la secuencia que encadena el rig', () => {
  test('el parpadeo simple es cerrar y abrir, con los tiempos del token', () => {
    const pasos = pasosParpadeo(false);
    expect(pasos).toHaveLength(2);
    expect(pasos[0]).toMatchObject({ a: parpadeo.cerrado, ms: parpadeo.cierreMs });
    expect(pasos[1]).toMatchObject({ a: 1, ms: parpadeo.aperturaMs });
  });

  test('el doble agrega un segundo golpe más corto y menos profundo', () => {
    const pasos = pasosParpadeo(true);
    expect(pasos).toHaveLength(5);
    // Vuelve a abrir del todo entre los dos golpes.
    expect(pasos[1].a).toBe(1);
    expect(pasos[2]).toMatchObject({ a: 1, ms: parpadeo.pausaDobleMs });
    // Segundo golpe: más rápido que el primero...
    expect(pasos[3].ms).toBeLessThan(pasos[0].ms);
    // ...y sin llegar a cerrar tanto (a mayor = ojo más abierto).
    expect(pasos[3].a).toBeGreaterThan(pasos[0].a);
    // Y termina siempre con el ojo abierto: nunca se queda a media asta.
    expect(pasos[pasos.length - 1].a).toBe(1);
  });

  test('cada paso lleva su curva y ninguna duración es frenética', () => {
    for (const doble of [false, true]) {
      for (const paso of pasosParpadeo(doble)) {
        expect(paso.curva).toBeDefined();
        expect(paso.ms).toBeGreaterThan(0);
        // El techo de 400 ms de theme/motion.js: los loops ambientales del rig
        // pueden pasarlo (respirar es lento), un parpadeo no.
        expect(paso.ms).toBeLessThanOrEqual(400);
      }
    }
  });
});
