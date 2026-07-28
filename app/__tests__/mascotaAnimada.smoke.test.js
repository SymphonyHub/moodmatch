jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { act, create } from 'react-test-renderer';
import MascotaSprite from '../mascota/MascotaSprite';
import MascotaAnimada from '../mascota/animation/MascotaAnimada';
import { ESPECIES } from '../mascota/sprites/especies';
import { expresiones } from '../mascota/animation/movimiento';

// react-native-reanimated está mockeado globalmente (testing/jest-setup.js): la
// validación real de las animaciones requiere un build nativo (ver plan Fase 14).
// Lo que sí se puede verificar acá es el ciclo de vida del timer del parpadeo
// variable (Fase 17), que vive en JS y no en un worklet.
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('MascotaSprite monta para las 7 especies × 3 etapas', () => {
  for (const especie of ESPECIES) {
    for (const etapa of [1, 2, 3]) {
      let renderer;
      act(() => { renderer = create(<MascotaSprite especie={especie} etapa={etapa} size={40} />); });
      expect(renderer.toJSON()).toBeTruthy();
      act(() => renderer.unmount());
    }
  }
});

test('MascotaSprite dibuja accesorios equipados sin crash', () => {
  let renderer;
  act(() => {
    renderer = create(
      <MascotaSprite especie="perro" etapa={3} accesorioCabeza="corona" accesorioColor="lunares" size={60} />,
    );
  });
  expect(renderer.toJSON()).toBeTruthy();
  act(() => renderer.unmount());
});

test('MascotaAnimada (rig único reanimated) monta sin crash', () => {
  let renderer;
  act(() => {
    renderer = create(
      <MascotaAnimada
        especie="huevo"
        etapa={1}
        personalidad="curiosa"
        animo="adormilada"
        size={120}
      />,
    );
  });
  expect(renderer.toJSON()).toBeTruthy();
  act(() => renderer.unmount());
});

test('el rig monta con cualquier expresión del catálogo, en las 7 especies', () => {
  for (const especie of ESPECIES) {
    for (const animo of Object.keys(expresiones)) {
      let renderer;
      act(() => {
        renderer = create(<MascotaAnimada especie={especie} etapa={2} animo={animo} size={100} />);
      });
      expect(renderer.toJSON()).toBeTruthy();
      act(() => renderer.unmount());
    }
  }
});

test('un ánimo desconocido cae en la expresión base en vez de romper', () => {
  let renderer;
  act(() => {
    renderer = create(<MascotaAnimada especie="perro" etapa={1} animo="eufórica" size={100} />);
  });
  expect(renderer.toJSON()).toBeTruthy();
  act(() => renderer.unmount());
});

test('un evento pone la cara puntual y la suelta sola', () => {
  const antes = jest.getTimerCount();
  // Sin confetti: lo que se mide acá es la cara puntual y su temporizador. El
  // confetti es un componente aparte que necesita ThemeProvider y ya se prueba
  // montado dentro de la pantalla.
  const pinta = (key) => (
    <MascotaAnimada
      especie="perro"
      etapa={1}
      evento={{ tipo: 'encantada', key, confetti: false }}
      size={100}
    />
  );

  let renderer;
  act(() => { renderer = create(pinta(0)); });
  // Solo los ritmos de fondo: montar con un evento ya presente no dispara nada,
  // o la mascota festejaría cada vez que se vuelve a entrar a la pantalla.
  const enReposo = jest.getTimerCount();
  expect(enReposo).toBeGreaterThan(antes);

  // El evento llega como cambio de key, que es como lo manda la pantalla.
  act(() => { renderer.update(pinta(1)); });
  expect(jest.getTimerCount()).toBe(enReposo + 1);

  // Pasado su tiempo, la cara puntual se suelta y solo queda el parpadeo.
  act(() => { jest.advanceTimersByTime(expresiones.encantada.duracionMs + 100); });
  expect(renderer.toJSON()).toBeTruthy();
  expect(jest.getTimerCount()).toBe(enReposo);

  act(() => renderer.unmount());
  expect(jest.getTimerCount()).toBeLessThanOrEqual(antes);
});

test('el parpadeo variable encadena timers y no deja ninguno colgado', () => {
  const antes = jest.getTimerCount();
  let renderer;
  act(() => {
    renderer = create(<MascotaAnimada especie="gato" etapa={2} personalidad="curiosa" size={120} />);
  });
  // Hay un parpadeo en cola: cada uno se programa de a uno, no en batería.
  expect(jest.getTimerCount()).toBeGreaterThan(antes);

  // Medio minuto de parpadeos encadenándose solos, sin crash ni bucle infinito
  // (si la espera saliera 0 o NaN, esto no terminaría).
  act(() => { jest.advanceTimersByTime(30000); });
  expect(jest.getTimerCount()).toBeGreaterThan(antes);

  act(() => renderer.unmount());
  expect(jest.getTimerCount()).toBeLessThanOrEqual(antes);
});

test('el saludo sí dispara al montar, al revés que el evento', () => {
  // Entrar a la pantalla es justamente el caso normal: la mascota tiene que
  // saludar la primera vez, no solo al volver.
  const antes = jest.getTimerCount();
  let renderer;
  act(() => {
    renderer = create(<MascotaAnimada especie="perro" etapa={1} saludo={1} size={100} />);
  });
  // Los ritmos de fondo más el temporizador de la cara del saludo.
  const conSaludo = jest.getTimerCount();
  expect(conSaludo).toBeGreaterThan(antes + 1);

  act(() => { jest.advanceTimersByTime(expresiones.saludando.duracionMs + 100); });
  expect(jest.getTimerCount()).toBe(conSaludo - 1);

  act(() => renderer.unmount());
  expect(jest.getTimerCount()).toBeLessThanOrEqual(antes);
});

test('una cara de fondo no puede quedarse pegada como puntual', () => {
  // serena no tiene duración: si entrara por la puerta de las puntuales, taparía
  // al ánimo real para siempre.
  const antes = jest.getTimerCount();
  let renderer;
  act(() => {
    renderer = create(
      <MascotaAnimada
        especie="perro"
        etapa={1}
        animo="radiante"
        evento={{ tipo: 'serena', key: 0, confetti: false }}
        size={100}
      />,
    );
  });
  act(() => {
    renderer.update(
      <MascotaAnimada
        especie="perro"
        etapa={1}
        animo="radiante"
        evento={{ tipo: 'serena', key: 1, confetti: false }}
        size={100}
      />,
    );
  });
  // Sin temporizador de más: la cara de fondo se descartó.
  expect(jest.getTimerCount()).toBeGreaterThan(antes);
  act(() => { jest.advanceTimersByTime(50); });
  expect(renderer.toJSON()).toBeTruthy();

  act(() => renderer.unmount());
});

test('la caricia pausa el parpadeo y lo devuelve al soltar', () => {
  // Con el ojo entrecerrado por la caricia, un parpadeo encima pelearía por la
  // misma escala. Es lo único de la caricia observable sin worklets.
  const antes = jest.getTimerCount();
  let renderer;
  act(() => { renderer = create(<MascotaAnimada especie="perro" etapa={1} size={100} />); });
  const sprite = renderer.root.findByProps({ accessibilityRole: 'image' });
  const enReposo = jest.getTimerCount();
  expect(enReposo).toBeGreaterThan(antes);

  // La caricia detiene los ritmos de fondo, parpadeo incluido.
  act(() => sprite.props.onLongPress());
  expect(jest.getTimerCount()).toBe(antes);
  expect(renderer.root.findByProps({ testID: 'celebracion-caricia' })).toBeTruthy();

  act(() => sprite.props.onPressOut());
  expect(jest.getTimerCount()).toBe(enReposo);

  act(() => renderer.unmount());
  expect(jest.getTimerCount()).toBeLessThanOrEqual(antes);
});

test('soltar sin haber acariciado no rompe nada', () => {
  let renderer;
  act(() => { renderer = create(<MascotaAnimada especie="perro" etapa={1} size={100} />); });
  const sprite = renderer.root.findByProps({ accessibilityRole: 'image' });

  // Un toque normal: entra, sale y reacciona, sin pasar por la caricia.
  act(() => { sprite.props.onPressIn({ nativeEvent: { locationX: 20, locationY: 30 } }); });
  act(() => sprite.props.onPressOut());
  act(() => sprite.props.onPress());
  expect(renderer.toJSON()).toBeTruthy();
  expect(renderer.root.findByProps({ testID: 'celebracion-caricia' })).toBeTruthy();

  act(() => renderer.unmount());
});

test('con reduce-motion no programa ningún parpadeo', () => {
  const ThemeContext = require('../theme/ThemeContext');
  const spy = jest.spyOn(ThemeContext, 'useMotionPrefs').mockReturnValue({
    reduceMotion: true,
    hapticsEnabled: true,
  });
  const antes = jest.getTimerCount();
  let renderer;
  act(() => {
    renderer = create(<MascotaAnimada especie="gato" etapa={2} personalidad="curiosa" size={120} />);
  });

  expect(jest.getTimerCount()).toBe(antes);
  const sprite = renderer.root.findByProps({ accessibilityRole: 'image' });
  act(() => sprite.props.onLongPress({ nativeEvent: { locationX: 30, locationY: 40 } }));
  act(() => sprite.props.onPress({ nativeEvent: { locationX: 30, locationY: 40 } }));
  expect(renderer.root.findAllByProps({ testID: 'celebracion-caricia' })).toHaveLength(0);

  act(() => renderer.unmount());
  spy.mockRestore();
});

test('activar reduce-motion desmonta las partículas de una caricia activa', () => {
  const ThemeContext = require('../theme/ThemeContext');
  const spy = jest.spyOn(ThemeContext, 'useMotionPrefs').mockReturnValue({
    reduceMotion: false,
    hapticsEnabled: true,
  });
  const pinta = () => <MascotaAnimada especie="perro" etapa={2} size={100} />;
  let renderer;
  act(() => { renderer = create(pinta()); });
  const sprite = renderer.root.findByProps({ accessibilityRole: 'image' });

  act(() => {
    sprite.props.onPressIn({ nativeEvent: { locationX: 22, locationY: 35 } });
    sprite.props.onLongPress({ nativeEvent: { locationX: 22, locationY: 35 } });
  });
  expect(renderer.root.findAllByProps({ testID: 'celebracion-caricia' }).length).toBeGreaterThan(0);

  spy.mockReturnValue({ reduceMotion: true, hapticsEnabled: true });
  act(() => renderer.update(pinta()));
  expect(renderer.root.findAllByProps({ testID: 'celebracion-caricia' })).toHaveLength(0);

  act(() => renderer.unmount());
  spy.mockRestore();
});
