// Escudo de Seguridad de Crisis (Fase 8) — capa AISLADA que intercepta el
// texto del usuario ANTES de cualquier llamada a la IA. En esta fase ninguna
// pantalla lo importa todavía: la integración la hace el implementador del
// chat con IA siguiendo CONTRATO-GEMINI.md.
//
// CONTRATO DE USO (integrador del chat):
//
//   const { evaluar, avisoMostrado, reset } = useCrisisShield();
//   const { esCrisis, omitirIA, mensajeCrisis } = evaluar(textoDelUsuario);
//
// - Llamar `evaluar` con CADA texto libre, SIEMPRE antes de llamar a
//   /api/chat/respond.
// - Si `omitirIA` es true, NO enviar ese texto a la API: un mensaje con
//   señales de crisis no debe salir del dispositivo hacia Gemini (capa
//   gratuita = Google puede usar los datos). Responder por plantilla local.
// - `mensajeCrisis` trae MENSAJE_CRISIS solo la PRIMERA vez en la
//   conversación (misma semántica que `crisisMostrada` del reducer actual:
//   la burbuja no se repite, no alarma, no bloquea el flujo). Las veces
//   siguientes llega null pero `omitirIA` sigue true.
// - Llamar `reset()` al reiniciar la conversación (acción REINICIAR).
//
// La detección es la MISMA del chat por reglas (crisis.js, única fuente de
// patrones); el backend replica esa detección como segunda capa.
import { useCallback, useMemo, useState } from 'react';
import { detectarCrisis, MENSAJE_CRISIS } from './crisis';

// Núcleo puro, sin React: testeable directo y reutilizable fuera de un
// componente (p. ej. por el backend vía copia del contrato, o en tests).
export function evaluarEscudo(texto, { avisoYaMostrado = false } = {}) {
  const esCrisis = detectarCrisis(texto);
  return {
    esCrisis,
    omitirIA: esCrisis,
    mensajeCrisis: esCrisis && !avisoYaMostrado ? MENSAJE_CRISIS : null,
  };
}

export function useCrisisShield() {
  const [avisoMostrado, setAvisoMostrado] = useState(false);

  const evaluar = useCallback(
    (texto) => {
      const resultado = evaluarEscudo(texto, { avisoYaMostrado: avisoMostrado });
      if (resultado.mensajeCrisis) setAvisoMostrado(true);
      return resultado;
    },
    [avisoMostrado],
  );

  const reset = useCallback(() => setAvisoMostrado(false), []);

  return useMemo(
    () => ({ evaluar, avisoMostrado, reset }),
    [evaluar, avisoMostrado, reset],
  );
}
