import {
  PREGUNTAS_PERSONALIDAD,
  crearPerfilPersonalidad,
  respuestasCompletas,
} from '../features/onboarding/perfilPersonalidad';

const respuestas = {
  compania: 'grupo_pequeno',
  ritmo: 'equilibrado',
  entorno: 'aire_libre',
  actividad: 'creativa',
  recarga: 'musica',
  novedad: 'explorar',
};

test('el cuestionario fijo tiene entre 5 y 8 preguntas', () => {
  expect(PREGUNTAS_PERSONALIDAD).toHaveLength(6);
});

test('crea el contrato v1 estable de perfilPersonalidad', () => {
  const fecha = new Date('2026-07-20T12:00:00.000Z');

  expect(crearPerfilPersonalidad(respuestas, fecha)).toEqual({
    version: 1,
    completadoEn: '2026-07-20T12:00:00.000Z',
    respuestas,
  });
});

test('rechaza respuestas faltantes o fuera de las opciones fijas', () => {
  expect(respuestasCompletas({ ...respuestas, ritmo: 'caotico' })).toBe(false);
  expect(() => crearPerfilPersonalidad({ ...respuestas, recarga: undefined })).toThrow(/incompletas/i);
});
