// Reintentos con backoff (Fase 8) — pieza AISLADA de resiliencia para las
// llamadas a /api/chat/respond. En esta fase ninguna pantalla lo importa
// todavía: la integración la hace el implementador del chat con IA siguiendo
// CONTRATO-GEMINI.md.
//
// CONTRATO DE USO (integrador del chat):
//
//   const { ejecutar, estado, intentos, reset } = useRetry();
//   const resultado = await ejecutar(() => apiChatRespond(mood, texto, historial));
//   if (resultado.ok) { /* resultado.valor = { respuesta, fuente, terminar } */ }
//   else { /* responder por plantilla local + <FallbackMessage /> — NUNCA un error */ }
//
// - `ejecutar` NUNCA lanza: si la red falla se reintenta con backoff y, si se
//   agotan los intentos, resuelve `{ ok: false, error, intentos }`. El caller
//   cae a la plantilla local del guion (CONTRATO-GEMINI.md §3: "la app nunca
//   muestra un error del modelo").
// - Un 200 con `fuente: "plantilla"` NO es un fallo: es el fallback
//   transparente del backend y no se reintenta.
// - Recordar el escudo: `useCrisisShield().evaluar(texto)` corre ANTES de
//   `ejecutar`; si `omitirIA` es true, esta pieza no se usa para ese turno.
// - Llamar `reset()` al reiniciar la conversación (acción REINICIAR).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const esperarDefault = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Núcleo puro, sin React: testeable directo y reutilizable fuera de un
// componente. `maxIntentos` son los REintentos tras el primer fallo (2 por
// defecto → hasta 3 llamadas en total). `esperar` es inyectable para que los
// tests midan el backoff sin timers reales.
export async function ejecutarConReintentos(
  fn,
  { maxIntentos = 2, baseMs = 600, esperar = esperarDefault } = {},
) {
  const totalLlamadas = maxIntentos + 1;
  let error = null;

  for (let intento = 1; intento <= totalLlamadas; intento += 1) {
    try {
      const valor = await fn(intento);
      return { ok: true, valor, intentos: intento };
    } catch (e) {
      error = e;
      if (intento < totalLlamadas) {
        await esperar(baseMs * 2 ** (intento - 1));
      }
    }
  }

  return { ok: false, error, intentos: totalLlamadas };
}

export function useRetry(opciones = {}) {
  const [estado, setEstado] = useState('inactivo');
  const [intentos, setIntentos] = useState(0);

  // Las opciones viven en un ref para que `ejecutar` sea estable aunque el
  // caller pase un objeto literal en cada render.
  const opcionesRef = useRef(opciones);
  opcionesRef.current = opciones;

  const montado = useRef(true);
  useEffect(
    () => () => {
      montado.current = false;
    },
    [],
  );

  const ejecutar = useCallback(async (fn) => {
    if (montado.current) setEstado('intentando');
    const resultado = await ejecutarConReintentos(fn, opcionesRef.current);
    if (montado.current) {
      setEstado(resultado.ok ? 'exito' : 'fallo');
      setIntentos(resultado.intentos);
    }
    return resultado;
  }, []);

  const reset = useCallback(() => {
    setEstado('inactivo');
    setIntentos(0);
  }, []);

  return useMemo(
    () => ({ ejecutar, estado, intentos, reset }),
    [ejecutar, estado, intentos, reset],
  );
}
