// Ánimo de la mascota: qué cara pone, derivado ÚNICAMENTE de los datos de
// cuidado de la mascota compartida (cariño, racha, atención pendiente).
//
// ── La línea que este módulo no cruza ───────────────────────────────────────
// Nunca lee el historial de ánimo del usuario. Es una regla del proyecto: lo que
// la persona registra sobre cómo se siente solo se refleja donde ella lo registró
// explícitamente, sin inferir nada (FASE15-chat-cloudinary.md, CONTRATO-GEMINI.md).
// La mascota vive de cómo la cuidan, no de cómo está su dueño. Por eso la firma
// desestructura los tres campos de cuidado y nada más: aunque le pasen la mascota
// entera con datos de ánimo pegados, no hay forma de que entren. Verificado en
// animo.test.js.
//
// ── Dos registros ──────────────────────────────────────────────────────────
// FONDO (este módulo): persistente, sale del cuidado, y NUNCA es una cara
// difícil. De radiante baja a serena y a adormilada; jamás a triste o enojada.
// Que la racha se corte no puede volverse un reproche visual — la racha "nunca
// culpabiliza" (backend/lib/interaccionesSociales.js) y la mascota descuidada
// "nunca se ve enferma o triste, solo más calmada" (FASE17, Bloque 2).
//
// PUNTUAL (lo dispara la interacción, no este módulo): dura segundos y ahí sí
// hay sorpresa y enfurruñe juguetón, porque son reacciones al momento y no un
// veredicto sobre el cuidado. Los tonos viven en movimiento.js → expresiones.

// Umbral de etapa adulta, el mismo que usa el backend para evolucionar.
const CARINO_ADULTA = 36;

// De más apagado a más despierto. El orden importa: lo usa el test de tono para
// verificar que ninguna combinación de cuidado se sale de esta escala.
export const TONOS_FONDO = ['adormilada', 'serena', 'contenta', 'radiante'];

export function animoDeMascota({ nivelCarino, racha, necesitaAtencion } = {}) {
  // Hace rato que nadie pasa: se apaga hacia la siesta, no hacia la tristeza.
  if (necesitaAtencion) return 'adormilada';

  const viva = Boolean(racha?.viva);
  if (!viva) return 'serena';

  const carino = Number.isFinite(nivelCarino) ? nivelCarino : 0;
  if (racha.cuidadaHoy && carino >= CARINO_ADULTA) return 'radiante';
  return 'contenta';
}
