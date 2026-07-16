import { estaCercaDelFinal, UMBRAL_CERCA_PX } from '../components/chat/useAutoScroll';

// Eventos sintéticos de scroll: contenido de `contenido` px, viewport de
// `viewport` px, scrolleado `offset` px desde arriba.
const evento = (contenido, viewport, offset) => ({
  contentSize: { height: contenido },
  layoutMeasurement: { height: viewport },
  contentOffset: { y: offset },
});

describe('estaCercaDelFinal (núcleo de useAutoScroll)', () => {
  test('pegado al fondo → cerca', () => {
    expect(estaCercaDelFinal(evento(1000, 600, 400))).toBe(true);
  });

  test('dentro del umbral → cerca', () => {
    expect(estaCercaDelFinal(evento(1000, 600, 400 - UMBRAL_CERCA_PX))).toBe(true);
  });

  test('releyendo arriba, fuera del umbral → lejos', () => {
    expect(estaCercaDelFinal(evento(1000, 600, 400 - UMBRAL_CERCA_PX - 1))).toBe(false);
  });

  test('al tope de una conversación larga → lejos', () => {
    expect(estaCercaDelFinal(evento(3000, 600, 0))).toBe(false);
  });

  test('contenido más corto que el viewport → siempre cerca', () => {
    expect(estaCercaDelFinal(evento(300, 600, 0))).toBe(true);
  });

  test('el umbral es configurable', () => {
    const e = evento(1000, 600, 200); // a 200 px del final
    expect(estaCercaDelFinal(e, 100)).toBe(false);
    expect(estaCercaDelFinal(e, 250)).toBe(true);
  });
});
