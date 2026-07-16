// Dominio puro de la pestaña "Para mí" del Wellness Hub. Sin imports de
// React Native (mismo criterio que features/emociones/).

// Ruta a la que navega el chip "Ver mi sugerencia" del chat: la tab
// Actividades (Wellness Hub del Agente A), que abre en la pestaña Para mí.
export const RUTA_WELLNESS = '/actividades';

// Una línea por emoción sobre la sugerencia, según el último registro.
// Mismas reglas de tono del chat (lista negra mecánica en paraMi.test.js):
// validar sin positividad forzada; la actividad acompaña, no soluciona.
export const ENCABEZADOS = {
  FELIZ: 'Una idea para aprovechar ese buen ánimo.',
  TRISTE: 'Sin apuro. Algo pequeño para acompañarte, solo si te hace sentido.',
  ANSIOSO: 'Paso a paso. Algo simple y concreto, sin exigencias.',
  CALMADO: 'Algo suave para sostener esa calma un rato más.',
  ENOJADO: 'Una salida pequeña para esa energía, si te sirve.',
  NEUTRO: 'Una propuesta simple, por si quieres darle un matiz al día.',
};

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// "recién" / "hace N min" / "hace N h" / "ayer" / "el D de MES".
export function tiempoRelativo(iso, ahora = Date.now()) {
  const fecha = new Date(iso);
  const ms = ahora - fecha.getTime();
  if (Number.isNaN(fecha.getTime()) || ms < 0) return '';

  const minutos = Math.floor(ms / 60000);
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  if (horas < 48) return 'ayer';

  return `el ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}
