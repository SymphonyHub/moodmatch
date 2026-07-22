const NOTIFICATION_TYPES = ['mensajes', 'mascota', 'mascota_social', 'actividades', 'recordatorio', 'amistad', 'invitacion_mascota'];
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  mensajes: true,
  mascota: true,
  mascota_social: true,
  actividades: true,
  recordatorio: true,
  amistad: true,
  invitacion_mascota: true,
  noMolestar: null,
});

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

function isValidQuietHours(value) {
  if (value === null) return true;
  return (
    isObject(value) &&
    Object.keys(value).length === 2 &&
    TIME_RE.test(value.desde) &&
    TIME_RE.test(value.hasta)
  );
}

function isValidTimeZone(value) {
  if (typeof value !== 'string' || value.length > 100) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function normalizePreferences(value) {
  const source = isObject(value) ? value : {};
  const normalized = { ...DEFAULT_NOTIFICATION_PREFERENCES };

  for (const type of NOTIFICATION_TYPES) {
    if (typeof source[type] === 'boolean') normalized[type] = source[type];
  }
  if (isValidQuietHours(source.noMolestar)) normalized.noMolestar = source.noMolestar;

  const sourceMeta = isObject(source._meta) ? source._meta : {};
  normalized._meta = {
    ...(isValidTimeZone(sourceMeta.timeZone) ? { timeZone: sourceMeta.timeZone } : {}),
    ...(isObject(sourceMeta.sent) ? { sent: sourceMeta.sent } : {}),
    ...(isObject(sourceMeta.claims) ? { claims: sourceMeta.claims } : {}),
    ...(Array.isArray(sourceMeta.receipts) ? { receipts: sourceMeta.receipts.slice(-50) } : {}),
  };
  return normalized;
}

function publicPreferences(value) {
  const { _meta: _ignored, ...preferences } = normalizePreferences(value);
  return preferences;
}

function validatePreferencePatch(value) {
  if (!isObject(value)) return false;
  const allowed = new Set([...NOTIFICATION_TYPES, 'noMolestar']);
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.some((key) => !allowed.has(key))) return false;
  return keys.every((key) => (
    key === 'noMolestar' ? isValidQuietHours(value[key]) : typeof value[key] === 'boolean'
  ));
}

function mergePreferencePatch(current, patch) {
  return { ...normalizePreferences(current), ...patch };
}

function withTimeZone(current, timeZone) {
  const preferences = normalizePreferences(current);
  return {
    ...preferences,
    _meta: {
      ...preferences._meta,
      ...(isValidTimeZone(timeZone) ? { timeZone } : {}),
    },
  };
}

const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

function localMinutes(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: isValidTimeZone(timeZone) ? timeZone : 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return (Number(parts.hour) % 24) * 60 + Number(parts.minute);
}

function isDoNotDisturbActive(value, now = new Date()) {
  const preferences = normalizePreferences(value);
  const quietHours = preferences.noMolestar;
  if (!quietHours) return false;

  const start = toMinutes(quietHours.desde);
  const end = toMinutes(quietHours.hasta);
  if (start === end) return true;

  const current = localMinutes(now, preferences._meta.timeZone);
  return start < end
    ? current >= start && current < end
    : current >= start || current < end;
}

module.exports = {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_TYPES,
  isDoNotDisturbActive,
  isValidTimeZone,
  mergePreferencePatch,
  normalizePreferences,
  publicPreferences,
  validatePreferencePatch,
  withTimeZone,
};
