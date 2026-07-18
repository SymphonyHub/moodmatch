import AccionSocialCard from '../components/wellness/AccionSocialCard';

/**
 * AccionConAmigos — SLOT del Agente C en la pestaña "Con amigos".
 *
 * Contrato de integración (patrón de slots de la Fase 6): ConAmigosPanel monta
 * <AccionConAmigos actividad={act} /> por cada una de las 3 acciones sociales.
 * Hoy delega en <AccionSocialCard> en modo informativo (sin onPress): misma UI
 * renovada, sin interacción — la estructura del Agente A queda funcional.
 *
 * El Agente C REESCRIBE SOLO este archivo para volver interactivas las 3
 * acciones (selector de amigo real, chat con mensaje precargado, sugerencia de
 * a quién contactar), pasando `onPress` a AccionSocialCard. No debe tocar
 * ConAmigosPanel.jsx ni actividades.jsx.
 *
 * GUARDRAIL DE PRIVACIDAD (no negociable): la sugerencia de "a quién contactar"
 * solo puede usar información YA visible hoy en la lista de amigos (el chip de
 * ánimo más reciente que cada amigo ya comparte con este usuario). No inferir
 * ni exponer ningún dato nuevo.
 *
 * @param {{ id, nombre, descripcion, categoria }} actividad
 */
export default function AccionConAmigos({ actividad }) {
  return <AccionSocialCard actividad={actividad} />;
}
