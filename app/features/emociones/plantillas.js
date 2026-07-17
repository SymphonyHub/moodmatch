// Respuestas locales por plantilla para el chat con IA — espejo ESM de
// backend/lib/plantillas.js (fuente autoritativa compartida; la paridad se
// vigila en backend/__tests__/chatParidad.test.js). Se usan cuando el turno
// no puede o no debe llegar a Gemini:
//   - el Escudo de Crisis marcó omitirIA (el texto no sale del dispositivo)
//   - el usuario eligió "Seguir sin conexión" tras agotar los reintentos
// El tono está validado mecánicamente con validarTono() en chat.test.js.
//
// `seguir` mantiene la conversación (valida + pregunta suave); `cierre` se usa
// cuando la conversación termina (sin pregunta, puente a la sugerencia).

export const PLANTILLAS = {
  FELIZ: {
    seguir: [
      'Qué bueno leer eso. ¿Qué fue lo que más te alegró el día?',
      'Se nota que fue un buen momento. ¿Quieres contarme un poco más?',
    ],
    cierre: [
      'Gracias por compartir esa alegría conmigo. Te dejo una idea para que ese ánimo te acompañe un rato más.',
      'Me alegra que hoy se sienta así. Aquí va una sugerencia para seguir disfrutando el día.',
    ],
  },
  TRISTE: {
    seguir: [
      'Siento que estés pasando por esto; está bien sentirse así. ¿Quieres contarme qué lo hizo más pesado hoy?',
      'Te leo, y lo que sientes tiene sentido. ¿Hay algo puntual que te tenga así?',
    ],
    cierre: [
      'Gracias por confiarme esto; no es fácil ponerlo en palabras. Te dejo una sugerencia suave, por si te hace bien.',
      'Lo que sientes importa, y me alegra que lo hayas compartido. Aquí va una idea tranquila para este momento.',
    ],
  },
  ANSIOSO: {
    seguir: [
      'Esa inquietud puede ser muy incómoda; tiene sentido que la sientas. ¿Qué es lo que más vueltas te está dando?',
      'Te entiendo, cargar con esa tensión cansa. ¿Quieres contarme qué la despertó?',
    ],
    cierre: [
      'Gracias por ponerle palabras a esa inquietud. Te dejo una sugerencia pensada para soltar un poco la tensión.',
      'Lo que describes es agotador, y hablarlo ya es un paso. Aquí va una idea para este momento.',
    ],
  },
  CALMADO: {
    seguir: [
      'Qué bien se lee esa tranquilidad. ¿Qué te ayudó a llegar a este momento?',
      'Ese espacio de calma vale mucho. ¿Quieres contarme cómo lo encontraste?',
    ],
    cierre: [
      'Gracias por compartir esta calma. Te dejo una idea para cuidarla un rato más.',
      'Qué bueno cerrar el registro en este estado. Aquí va una sugerencia para acompañarlo.',
    ],
  },
  ENOJADO: {
    seguir: [
      'Ese enojo es válido; algo lo provocó y merece espacio. ¿Quieres contarme qué pasó?',
      'Te leo, y suena frustrante de verdad. ¿Qué fue lo que más te molestó?',
    ],
    cierre: [
      'Gracias por sacarlo en vez de guardártelo. Te dejo una sugerencia para descargar un poco de esa energía.',
      'Lo que cuentas justifica ese enojo. Aquí va una idea que puede ayudarte a soltarlo de a poco.',
    ],
  },
  NEUTRO: {
    seguir: [
      'A veces los días son así, sin mucho color, y está bien. ¿Cómo ha estado el tuyo?',
      'Un día tranquilo también cuenta. ¿Hubo algo que te llamara la atención hoy?',
    ],
    cierre: [
      'Gracias por pasar a registrar cómo estás. Te dejo una idea por si quieres darle un giro al día.',
      'Registrar también los días normales ayuda a conocerse. Aquí va una sugerencia por si te tienta.',
    ],
  },
};

// Rotación simple por número de turno (mismo espíritu del rotador de
// conversacion.js): determinista y sin repetición inmediata.
export function respuestaPlantilla(mood, turno, terminar) {
  const set = PLANTILLAS[mood] ?? PLANTILLAS.NEUTRO;
  const variantes = terminar ? set.cierre : set.seguir;
  return variantes[Math.abs(turno) % variantes.length];
}
