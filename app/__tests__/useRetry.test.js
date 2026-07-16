import { ejecutarConReintentos } from '../features/emociones/useRetry';
import {
  respuestaGemini,
  respuestaPlantilla,
  respuestaTerminar,
  redCaida,
} from '../testing/contratoGemini';

// `esperar` inyectable: registra los delays del backoff y resuelve al
// instante, sin timers reales ni fake timers.
function esperarStub() {
  const delays = [];
  const esperar = (ms) => {
    delays.push(ms);
    return Promise.resolve();
  };
  return { delays, esperar };
}

describe('ejecutarConReintentos — núcleo puro de useRetry', () => {
  test('éxito al primer intento: no espera y reporta 1 intento', async () => {
    const { delays, esperar } = esperarStub();
    const fn = jest.fn().mockResolvedValue(respuestaGemini());

    const r = await ejecutarConReintentos(fn, { esperar });

    expect(r).toEqual({ ok: true, valor: respuestaGemini(), intentos: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(delays).toEqual([]);
  });

  test('falla una vez y luego éxito: un solo delay de baseMs', async () => {
    const { delays, esperar } = esperarStub();
    const fn = jest
      .fn()
      .mockRejectedValueOnce(redCaida())
      .mockResolvedValueOnce(respuestaGemini());

    const r = await ejecutarConReintentos(fn, { baseMs: 600, esperar });

    expect(r.ok).toBe(true);
    expect(r.intentos).toBe(2);
    expect(delays).toEqual([600]);
  });

  test('todas fallan: resuelve { ok: false } sin lanzar, con el último error', async () => {
    const { esperar } = esperarStub();
    const ultimoError = redCaida();
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('primer fallo'))
      .mockRejectedValueOnce(new Error('segundo fallo'))
      .mockRejectedValueOnce(ultimoError);

    const r = await ejecutarConReintentos(fn, { maxIntentos: 2, esperar });

    expect(r.ok).toBe(false);
    expect(r.error).toBe(ultimoError);
    expect(r.intentos).toBe(3); // maxIntentos + 1 llamadas en total
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('backoff exponencial: baseMs, 2·baseMs, 4·baseMs… sin delay tras el último', async () => {
    const { delays, esperar } = esperarStub();
    const fn = jest.fn().mockRejectedValue(redCaida());

    await ejecutarConReintentos(fn, { maxIntentos: 3, baseMs: 600, esperar });

    expect(delays).toEqual([600, 1200, 2400]);
  });

  test('defaults del contrato: hasta 3 llamadas en total (maxIntentos = 2)', async () => {
    const { delays, esperar } = esperarStub();
    const fn = jest.fn().mockRejectedValue(redCaida());

    const r = await ejecutarConReintentos(fn, { esperar });

    expect(fn).toHaveBeenCalledTimes(3);
    expect(delays).toEqual([600, 1200]);
    expect(r.ok).toBe(false);
  });

  test('pasa el número de intento a fn (telemetría / variación de plantilla)', async () => {
    const { esperar } = esperarStub();
    const fn = jest
      .fn()
      .mockRejectedValueOnce(redCaida())
      .mockResolvedValueOnce(respuestaGemini());

    await ejecutarConReintentos(fn, { esperar });

    expect(fn).toHaveBeenNthCalledWith(1, 1);
    expect(fn).toHaveBeenNthCalledWith(2, 2);
  });

  // El fallo del modelo NUNCA es un error HTTP (CONTRATO-GEMINI.md §1): un
  // 200 con fuente "plantilla" es fallback transparente y NO se reintenta.
  test.each([
    ['fuente gemini', respuestaGemini()],
    ['fuente plantilla (fallback transparente, no es fallo)', respuestaPlantilla()],
    ['terminar: true (cierre de conversación)', respuestaTerminar()],
    ['terminar: true por plantilla', respuestaTerminar('plantilla')],
  ])('respuesta 200 del contrato — %s: resuelve en 1 llamada', async (_caso, payload) => {
    const { delays, esperar } = esperarStub();
    const fn = jest.fn().mockResolvedValue(payload);

    const r = await ejecutarConReintentos(fn, { esperar });

    expect(r.ok).toBe(true);
    expect(r.valor).toEqual(payload);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(delays).toEqual([]);
  });

  test('la red caída (rechazo de fetch) sí dispara reintento', async () => {
    const { delays, esperar } = esperarStub();
    const fn = jest
      .fn()
      .mockRejectedValueOnce(redCaida())
      .mockResolvedValueOnce(respuestaPlantilla());

    const r = await ejecutarConReintentos(fn, { esperar });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(delays).toEqual([600]);
    expect(r.valor.fuente).toBe('plantilla');
  });
});
