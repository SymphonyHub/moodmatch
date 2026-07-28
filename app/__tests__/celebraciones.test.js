jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import CelebracionLottie, { lottieDisponible, reiniciarLottie } from '../mascota/animation/CelebracionLottie';
import {
  CELEBRACIONES,
  IDS_CELEBRACION,
  MARGEN_FIN_MS,
  celebracion,
  esperaFin,
  medidaCelebracion,
  modoCelebracion,
  ubicacionCelebracion,
} from '../mascota/animation/celebraciones';

const Respaldo = () => <Text testID="respaldo">respaldo</Text>;

describe('catálogo de celebraciones', () => {
  test('cada animación declara fuente, medidas, encaje y duración', () => {
    expect(IDS_CELEBRACION).toEqual(
      expect.arrayContaining(['subida-nivel', 'corazones', 'confeti', 'destellos']),
    );
    for (const id of IDS_CELEBRACION) {
      const c = CELEBRACIONES[id];
      expect(c.fuente).toBeTruthy();
      // Un .json de Lottie real: composición con capas y fotogramas.
      expect(Array.isArray(c.fuente.layers)).toBe(true);
      expect(c.fuente.layers.length).toBeGreaterThan(0);
      expect(['sprite', 'punto', 'pantalla', 'caja']).toContain(c.encaje);
      expect(c.ancho).toBeGreaterThan(0);
      expect(c.alto).toBeGreaterThan(0);
      expect(c.factor).toBeGreaterThan(0);
      expect(c.duracionMs).toBeGreaterThan(0);
    }
  });

  test('las medidas declaradas coinciden con las del .json de origen', () => {
    // Si alguien reemplaza un archivo por otro de distinto lienzo, la proporción
    // del contenedor quedaría mal y la animación saldría estirada.
    for (const id of IDS_CELEBRACION) {
      const c = CELEBRACIONES[id];
      expect(c.ancho).toBe(c.fuente.w);
      expect(c.alto).toBe(c.fuente.h);
      const durakReal = Math.round((c.fuente.op / c.fuente.fr) * 1000);
      expect(Math.abs(c.duracionMs - durakReal)).toBeLessThanOrEqual(5);
    }
  });

  test('celebracion() devuelve null para un id que no existe', () => {
    expect(celebracion('no-existe')).toBeNull();
  });
});

describe('modoCelebracion', () => {
  test('con movimiento reducido no se anima nada, ni el respaldo', () => {
    expect(modoCelebracion({ reduceMotion: true, lottieDisponible: true, id: 'confeti' }))
      .toBe('nada');
    expect(modoCelebracion({ reduceMotion: true, lottieDisponible: false, id: 'confeti' }))
      .toBe('nada');
  });

  test('elige Lottie si el módulo nativo está y el respaldo si no', () => {
    expect(modoCelebracion({ lottieDisponible: true, id: 'confeti' })).toBe('lottie');
    expect(modoCelebracion({ lottieDisponible: false, id: 'confeti' })).toBe('respaldo');
  });

  test('un id desconocido no monta nada', () => {
    expect(modoCelebracion({ lottieDisponible: true, id: 'no-existe' })).toBe('nada');
    expect(modoCelebracion({ lottieDisponible: true })).toBe('nada');
    expect(modoCelebracion()).toBe('nada');
  });
});

describe('medidas y ubicación', () => {
  test('conserva la proporción de la composición original', () => {
    const { width, height } = medidaCelebracion('confeti', 100);
    expect(width).toBeCloseTo(100);
    expect(height / width).toBeCloseTo(2688 / 1242, 4);
  });

  test('una base inválida da medida cero en vez de NaN', () => {
    for (const base of [0, -5, NaN, null, undefined, 'ancho']) {
      expect(medidaCelebracion('confeti', base)).toEqual({ width: 0, height: 0 });
    }
    expect(medidaCelebracion('no-existe', 100)).toEqual({ width: 0, height: 0 });
  });

  test('la celebración de sprite queda centrada sobre la mascota', () => {
    const u = ubicacionCelebracion('subida-nivel', 132);
    expect(u.width).toBeCloseTo(132 * 1.6);
    expect(u.height).toBeCloseTo(132 * 1.6);
    // Más grande que el sprite: desborda parejo por los cuatro lados.
    expect(u.left).toBeCloseTo((132 - u.width) / 2);
    expect(u.top).toBeCloseTo(u.left);
  });

  test('los corazones nacen en el dedo y suben', () => {
    const u = ubicacionCelebracion('corazones', 132, { x: 40, y: 60 });
    expect(u.left).toBeCloseTo(40 - u.width / 2);
    expect(u.top).toBeLessThan(60);
  });

  test('sin origen, el punto cae al centro del sprite', () => {
    const u = ubicacionCelebracion('corazones', 132, null);
    expect(u.left).toBeCloseTo(66 - u.width / 2);
    expect(Number.isFinite(u.top)).toBe(true);
  });

  test('esperaFin deja margen sobre la duración real', () => {
    expect(esperaFin('confeti')).toBe(CELEBRACIONES.confeti.duracionMs + MARGEN_FIN_MS);
    expect(esperaFin('no-existe')).toBe(MARGEN_FIN_MS);
  });
});

describe('CelebracionLottie', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    reiniciarLottie();
  });
  afterEach(() => jest.useRealTimers());

  test('con el módulo disponible monta la vista Lottie y no el respaldo', () => {
    expect(lottieDisponible()).toBe(true);
    let r;
    act(() => {
      r = create(
        <CelebracionLottie tipo="subida-nivel" base={120} respaldo={<Respaldo />} testID="cel" />,
      );
    });
    expect(r.root.findAllByProps({ testID: 'cel' }).length).toBeGreaterThan(0);
    expect(r.root.findAllByProps({ testID: 'respaldo' })).toHaveLength(0);
    act(() => r.unmount());
  });

  test('avisa que terminó cuando la animación llega al final', () => {
    const onFin = jest.fn();
    let r;
    act(() => {
      r = create(<CelebracionLottie tipo="subida-nivel" base={120} onFin={onFin} />);
    });
    const vista = r.root.findByProps({ testID: 'lottie-view' });
    act(() => vista.props.onAnimationFinish());
    expect(onFin).toHaveBeenCalledTimes(1);
    act(() => r.unmount());
  });

  test('si la animación nunca avisa, el techo de duración lo hace igual', () => {
    const onFin = jest.fn();
    let r;
    act(() => {
      r = create(<CelebracionLottie tipo="subida-nivel" base={120} onFin={onFin} />);
    });
    expect(onFin).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(esperaFin('subida-nivel') + 10); });
    expect(onFin).toHaveBeenCalledTimes(1);
    act(() => r.unmount());
  });

  test('onFin se llama una sola vez aunque lleguen las dos señales', () => {
    const onFin = jest.fn();
    let r;
    act(() => {
      r = create(<CelebracionLottie tipo="subida-nivel" base={120} onFin={onFin} />);
    });
    const vista = r.root.findByProps({ testID: 'lottie-view' });
    act(() => vista.props.onAnimationFinish());
    act(() => { jest.advanceTimersByTime(esperaFin('subida-nivel') + 10); });
    expect(onFin).toHaveBeenCalledTimes(1);
    act(() => r.unmount());
  });

  test('sin onFin no arma ningún temporizador', () => {
    // Los corazones de la caricia se reemplazan por key: no hay nada que avisar,
    // y un timer de más ensuciaría el conteo del rig.
    const antes = jest.getTimerCount();
    let r;
    act(() => {
      r = create(<CelebracionLottie tipo="corazones" base={120} origen={{ x: 10, y: 10 }} />);
    });
    expect(jest.getTimerCount()).toBe(antes);
    act(() => r.unmount());
  });

  test('con movimiento reducido no dibuja nada, pero avisa que terminó', () => {
    const ThemeContext = require('../theme/ThemeContext');
    const spy = jest.spyOn(ThemeContext, 'useMotionPrefs')
      .mockReturnValue({ reduceMotion: true, hapticsEnabled: true });
    const onFin = jest.fn();
    let r;
    act(() => {
      r = create(
        <CelebracionLottie tipo="subida-nivel" base={120} onFin={onFin} respaldo={<Respaldo />} />,
      );
    });
    expect(r.toJSON()).toBeNull();
    // Sin este aviso el contenedor se queda con el overlay "encendido" para
    // siempre esperando una animación que nunca se montó.
    act(() => { jest.advanceTimersByTime(10); });
    expect(onFin).toHaveBeenCalledTimes(1);
    act(() => r.unmount());
    spy.mockRestore();
  });

  test('un id desconocido no rompe: no dibuja y avisa', () => {
    const onFin = jest.fn();
    let r;
    act(() => {
      r = create(<CelebracionLottie tipo="no-existe" base={120} onFin={onFin} />);
    });
    expect(r.toJSON()).toBeNull();
    act(() => { jest.advanceTimersByTime(10); });
    expect(onFin).toHaveBeenCalledTimes(1);
    act(() => r.unmount());
  });
});

// El camino sin módulo nativo vive en celebracionRespaldo.test.js: necesita el
// mock del paquete declarado arriba del archivo, y desde acá no se puede aislar
// sin arrastrar una segunda copia de React.
