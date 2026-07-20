export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  mensajes: true,
  mascota: true,
  actividades: true,
  recordatorio: true,
  amistad: true,
  noMolestar: null,
});

export const NOTIFICATION_OPTIONS = [
  { key: 'mensajes', label: 'Mensajes nuevos', hint: 'Cuando una amistad te escribe.' },
  { key: 'mascota', label: 'Mascota', hint: 'Si lleva más de 48 horas sin cuidados.' },
  { key: 'actividades', label: 'Actividades compartidas', hint: 'Cuando completan una actividad contigo.' },
  { key: 'recordatorio', label: 'Registro de ánimo', hint: 'Un recordatorio suave después de varios días.' },
  { key: 'amistad', label: 'Invitaciones', hint: 'Cuando una amistad acepta tu invitación.' },
];

const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function normalizePublicPreferences(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...Object.fromEntries(
      NOTIFICATION_OPTIONS.map(({ key }) => [
        key,
        typeof source[key] === 'boolean' ? source[key] : true,
      ]),
    ),
    noMolestar: source.noMolestar === null || (
      TIME_RE.test(source.noMolestar?.desde) && TIME_RE.test(source.noMolestar?.hasta)
    ) ? source.noMolestar : null,
  };
}

export function quietMode(preferences) {
  const quietHours = normalizePublicPreferences(preferences).noMolestar;
  if (!quietHours) return 'off';
  return quietHours.desde === quietHours.hasta ? 'all-day' : 'schedule';
}

export const isValidTime = (value) => TIME_RE.test(value);

export function quietHoursFor(mode, desde = '22:00', hasta = '08:00') {
  if (mode === 'off') return null;
  if (mode === 'all-day') return { desde: '00:00', hasta: '00:00' };
  return isValidTime(desde) && isValidTime(hasta) ? { desde, hasta } : undefined;
}
