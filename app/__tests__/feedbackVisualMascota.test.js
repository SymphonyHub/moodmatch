jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { normalizarCantidadCarino } from '../mascota/animation/FeedbackCarino';
import {
  aumentoCarino,
  normalizarProgreso,
} from '../mascota/animation/BarraProgresoCarino';
import { normalizarOrigenCaricia } from '../mascota/animation/ParticulasCaricia';

describe('feedback visual de mascota', () => {
  test('normaliza la ganancia confirmada antes de mostrarla', () => {
    expect(normalizarCantidadCarino(6)).toBe(6);
    expect(normalizarCantidadCarino(5.6)).toBe(6);
    expect(normalizarCantidadCarino(-2)).toBe(0);
    expect(normalizarCantidadCarino('sin dato')).toBe(0);
  });

  test('el brillo solo se dispara cuando aumenta el cariño', () => {
    expect(aumentoCarino(24, 30)).toBe(true);
    expect(aumentoCarino(30, 30)).toBe(false);
    expect(aumentoCarino(30, 24)).toBe(false);
    expect(aumentoCarino(undefined, 30)).toBe(false);
    expect(normalizarProgreso(1.4)).toBe(1);
    expect(normalizarProgreso(-0.2)).toBe(0);
  });

  test('mantiene el origen de partículas dentro del rig', () => {
    expect(normalizarOrigenCaricia({ x: 30, y: 45 }, 100)).toEqual({ x: 30, y: 45 });
    expect(normalizarOrigenCaricia({ x: -20, y: 140 }, 100)).toEqual({ x: 12, y: 88 });
    expect(normalizarOrigenCaricia({}, 100)).toEqual({ x: 50, y: 50 });
  });
});
