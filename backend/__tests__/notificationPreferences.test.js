const {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isDoNotDisturbActive,
  mergePreferencePatch,
  normalizePreferences,
  publicPreferences,
  validatePreferencePatch,
} = require('../lib/notificationPreferences');

describe('preferencias de notificaciones', () => {
  test('usuarios existentes parten con todos los tipos activos y sin silencio', () => {
    expect(publicPreferences(null)).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  test('un patch conserva metadata interna sin exponerla al cliente', () => {
    const current = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      _meta: { timeZone: 'America/Santiago', sent: { recordatorio: '2026-07-01T00:00:00.000Z' } },
    };
    const merged = mergePreferencePatch(current, { mensajes: false });

    expect(merged._meta).toEqual(current._meta);
    expect(publicPreferences(merged)).toEqual({ ...DEFAULT_NOTIFICATION_PREFERENCES, mensajes: false });
  });

  test.each([
    {},
    { mensajes: 'sí' },
    { desconocida: true },
    { noMolestar: { desde: '25:00', hasta: '08:00' } },
    { noMolestar: { desde: '22:00' } },
  ])('rechaza patch inválido %#', (patch) => {
    expect(validatePreferencePatch(patch)).toBe(false);
  });

  test('acepta toggles parciales y rango HH:mm', () => {
    expect(validatePreferencePatch({ mascota: false })).toBe(true);
    expect(validatePreferencePatch({ noMolestar: { desde: '22:00', hasta: '08:00' } })).toBe(true);
    expect(validatePreferencePatch({ noMolestar: null })).toBe(true);
  });

  test('rango nocturno usa la zona horaria guardada', () => {
    const preferences = normalizePreferences({
      noMolestar: { desde: '22:00', hasta: '08:00' },
      _meta: { timeZone: 'America/Santiago' },
    });

    expect(isDoNotDisturbActive(preferences, new Date('2026-07-20T03:00:00.000Z'))).toBe(true);
    expect(isDoNotDisturbActive(preferences, new Date('2026-07-20T16:00:00.000Z'))).toBe(false);
  });

  test('desde igual a hasta representa silencio todo el día', () => {
    expect(isDoNotDisturbActive({ noMolestar: { desde: '00:00', hasta: '00:00' } })).toBe(true);
  });
});
