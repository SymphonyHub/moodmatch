jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { act, create } from 'react-test-renderer';
import MascotaSprite from '../mascota/MascotaSprite';
import MascotaAnimada from '../mascota/animation/MascotaAnimada';
import { ESPECIES } from '../mascota/sprites/especies';

// react-native-reanimated está mockeado globalmente (testing/jest-setup.js): la
// validación real de las animaciones requiere un build nativo (ver plan Fase 14).

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
        necesitaAtencion
        size={120}
      />,
    );
  });
  expect(renderer.toJSON()).toBeTruthy();
  act(() => renderer.unmount());
});
