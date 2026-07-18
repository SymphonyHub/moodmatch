/**
 * WidgetInteractivo — SLOT del Agente B en la pestaña "Para mí".
 *
 * Contrato de integración (patrón de slots de la Fase 6): ParaMiTab monta
 * <WidgetInteractivo moodType={MOOD} /> entre la tarjeta de sugerencia y la
 * RachaCard. Hoy NO renderiza nada, y la estructura del Agente A queda
 * funcional sin él (sin huecos ni pantallas a medias).
 *
 * El Agente B REESCRIBE SOLO este archivo con su widget interactivo (p. ej.
 * respiración guiada con animación de expansión/contracción), autosuficiente y
 * respetando el lenguaje de movimiento de la casa (theme/motion.js: nada > 400
 * ms, sin rebote fuerte). No debe tocar ParaMiTab.jsx ni actividades.jsx.
 *
 * @param {string} moodType - ánimo del último registro (una de MOOD_KEYS), por
 *   si el widget adapta su contenido; puede ignorarse.
 */
export default function WidgetInteractivo() {
  return null;
}
