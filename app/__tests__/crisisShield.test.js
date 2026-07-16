import { evaluarEscudo } from '../features/emociones/useCrisisShield';
import { MENSAJE_CRISIS } from '../features/emociones/crisis';

describe('evaluarEscudo — núcleo puro del Escudo de Crisis', () => {
  test('texto normal: no es crisis, no omite IA, sin mensaje', () => {
    expect(evaluarEscudo('hoy fue un día pesado en el trabajo')).toEqual({
      esCrisis: false,
      omitirIA: false,
      mensajeCrisis: null,
    });
  });

  test('crisis por primera vez: omite IA y entrega la burbuja', () => {
    const r = evaluarEscudo('no quiero seguir viviendo');
    expect(r.esCrisis).toBe(true);
    expect(r.omitirIA).toBe(true);
    expect(r.mensajeCrisis).toBe(MENSAJE_CRISIS);
  });

  test('crisis con aviso ya mostrado: sigue omitiendo IA pero sin repetir burbuja', () => {
    const r = evaluarEscudo('me quiero hacer daño', { avisoYaMostrado: true });
    expect(r.esCrisis).toBe(true);
    expect(r.omitirIA).toBe(true);
    expect(r.mensajeCrisis).toBeNull();
  });

  test('texto vacío o null: inofensivo', () => {
    expect(evaluarEscudo('').omitirIA).toBe(false);
    expect(evaluarEscudo(null).omitirIA).toBe(false);
  });

  // Un caso por patrón nuevo de Fase 8: el escudo comparte fuente con crisis.js.
  test.each([
    'no le veo sentido a la vida',
    'mejor estaría muerto',
    'estarían mejor sin mí',
    'quiero desaparecer',
  ])('intercepta el patrón de Fase 8: "%s"', (frase) => {
    const r = evaluarEscudo(frase);
    expect(r.esCrisis).toBe(true);
    expect(r.omitirIA).toBe(true);
  });

  test('las guardas no disparan el escudo', () => {
    expect(evaluarEscudo('no le veo sentido a esta tarea').omitirIA).toBe(false);
    expect(evaluarEscudo('desaparecieron mis llaves').omitirIA).toBe(false);
  });
});
