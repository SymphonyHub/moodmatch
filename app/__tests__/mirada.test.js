import { desplazamientoMirada } from '../mascota/animation/mirada';
import { mirada } from '../mascota/animation/movimiento';

const SIZE = 132; // el tamaño del sprite hero en la pantalla de detalle

describe('hacia dónde mira cuando la tocan', () => {
  test('tocar el centro no la mueve', () => {
    expect(desplazamientoMirada(SIZE / 2, SIZE / 2, SIZE)).toEqual({ x: 0, y: 0 });
  });

  test('tocar cada esquina la lleva al tope de ese lado', () => {
    expect(desplazamientoMirada(0, 0, SIZE)).toEqual({ x: -mirada.maxPx, y: -mirada.maxPy });
    expect(desplazamientoMirada(SIZE, SIZE, SIZE)).toEqual({ x: mirada.maxPx, y: mirada.maxPy });
    expect(desplazamientoMirada(SIZE, 0, SIZE)).toEqual({ x: mirada.maxPx, y: -mirada.maxPy });
  });

  test('un toque fuera del sprite no la saca de rango', () => {
    // Pasa si el dedo se desliza más allá del borde antes de soltar.
    const lejos = desplazamientoMirada(SIZE * 3, -SIZE, SIZE);
    expect(lejos).toEqual({ x: mirada.maxPx, y: -mirada.maxPy });
  });

  test('el desplazamiento es proporcional dentro del sprite', () => {
    const cuarto = desplazamientoMirada(SIZE * 0.25, SIZE / 2, SIZE);
    expect(cuarto.x).toBeCloseTo(-mirada.maxPx / 2, 6);
    expect(cuarto.y).toBe(0);
  });

  test('el tamaño del sprite no cambia el resultado relativo', () => {
    // El mapeo es relativo, así que la mascota mira igual en la tarjeta chica.
    expect(desplazamientoMirada(62 * 0.25, 62 * 0.5, 62))
      .toEqual(desplazamientoMirada(SIZE * 0.25, SIZE * 0.5, SIZE));
  });

  test('ante datos inválidos se queda mirando al frente', () => {
    for (const caso of [
      [undefined, undefined, SIZE],
      [NaN, 10, SIZE],
      [10, NaN, SIZE],
      [10, 10, 0],
      [10, 10, undefined],
    ]) {
      expect(desplazamientoMirada(...caso)).toEqual({ x: 0, y: 0 });
    }
  });
});

describe('el ojo no se sale de la cara', () => {
  test('el corrimiento máximo es chico frente al radio del ojo', () => {
    const R_OJO = 3.2; // geometria.js
    expect(mirada.maxPx).toBeLessThan(R_OJO * 0.5);
    expect(mirada.maxPy).toBeLessThan(mirada.maxPx);
  });

  test('la vuelta al centro es más blanda que la ida', () => {
    // Va rápido a mirar y vuelve despacio: al revés se leería como un resorte.
    expect(mirada.vuelta.stiffness).toBeLessThan(mirada.spring.stiffness);
    expect(mirada.vueltaMs).toBeGreaterThan(0);
  });
});
