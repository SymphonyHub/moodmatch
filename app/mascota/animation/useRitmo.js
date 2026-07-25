import { useEffect, useRef } from 'react';

// Un ciclo que se reprograma solo: espera lo que diga `planear`, ejecuta `hacer`
// y vuelve a empezar. Es el motor del parpadeo variable y del gesto por
// inactividad — los dos necesitan lo mismo, así que vive acá y no duplicado.
//
// El temporizador vive en JS y no como una cadena de worklets a propósito: una
// secuencia con withRepeat vuelve a ser periódica (solo que con un período más
// largo), y re-armarse desde el callback de withTiming recursa infinito contra
// el mock de reanimated, que lo invoca de forma síncrona. Que el hilo de JS
// llegue tarde a un parpadeo o a un bostezo no es un problema: los hace menos
// mecánicos.
//
//   planear(vuelta) → { esperaMs, ...datos }   `vuelta` cuenta desde el último
//                                              reinicio, para ciclos que se
//                                              espacian solos
//   hacer(plan)                                lo que se ejecuta al vencer
//   alParar()                                  al apagarse o desmontar
//   activo                                     false lo detiene y limpia
//   reinicio                                   cambiar este valor arranca de cero
export function useRitmo({
  planear, hacer, alParar, activo = true, reinicio = 0,
}) {
  // Las funciones se leen por referencia para que el ciclo no se reinicie en
  // cada render: solo `activo` y `reinicio` lo controlan.
  const fns = useRef({ planear, hacer, alParar });
  useEffect(() => {
    fns.current = { planear, hacer, alParar };
  });

  useEffect(() => {
    if (!activo) {
      fns.current.alParar?.();
      return undefined;
    }
    let timer = null;
    let vivo = true;
    let vuelta = 0;

    const programar = () => {
      const plan = fns.current.planear(vuelta);
      timer = setTimeout(() => {
        if (!vivo) return;
        fns.current.hacer(plan);
        vuelta += 1;
        programar();
      }, plan.esperaMs);
    };
    programar();

    return () => {
      vivo = false;
      clearTimeout(timer);
      fns.current.alParar?.();
    };
  }, [activo, reinicio]);
}
