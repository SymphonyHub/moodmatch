import { estadoMascota } from '../mascota/estadoMascota';

describe('estadoMascota', () => {
  test.each([
    [0, 'Recién se conocen'],
    [4, 'Tomando confianza'],
    [10, 'Buenos compañeros'],
    [20, 'Vínculo especial'],
    [40, 'Amistad inseparable'],
  ])('nivel %i usa la etapa correcta', (nivel, etiqueta) => {
    expect(estadoMascota(nivel).etiqueta).toBe(etiqueta);
  });

  test('normaliza niveles inválidos o negativos', () => {
    expect(estadoMascota(-5).progreso).toBe(0);
    expect(estadoMascota(Number.NaN).etiqueta).toBe('Recién se conocen');
  });

  test('calcula progreso dentro de la etapa actual', () => {
    expect(estadoMascota(7)).toEqual({
      etiqueta: 'Tomando confianza',
      progreso: 0.5,
      siguienteNivel: 10,
    });
  });
});
