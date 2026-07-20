import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isValidTime,
  normalizePublicPreferences,
  quietHoursFor,
  quietMode,
} from '../notifications/preferences';

describe('preferencias de notificaciones en la app', () => {
  test('normaliza perfiles existentes con defaults activos', () => {
    expect(normalizePublicPreferences(null)).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    expect(normalizePublicPreferences({ mensajes: false })).toEqual({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      mensajes: false,
    });
  });

  test('representa los tres modos de no molestar con el contrato backend', () => {
    expect(quietHoursFor('off')).toBeNull();
    expect(quietHoursFor('all-day')).toEqual({ desde: '00:00', hasta: '00:00' });
    expect(quietHoursFor('schedule', '22:00', '08:00')).toEqual({ desde: '22:00', hasta: '08:00' });
    expect(quietHoursFor('schedule', '25:00', '08:00')).toBeUndefined();

    expect(quietMode({ noMolestar: null })).toBe('off');
    expect(quietMode({ noMolestar: { desde: '00:00', hasta: '00:00' } })).toBe('all-day');
    expect(quietMode({ noMolestar: { desde: '22:00', hasta: '08:00' } })).toBe('schedule');
  });

  test('valida horas estrictas HH:mm', () => {
    expect(isValidTime('09:05')).toBe(true);
    expect(isValidTime('9:05')).toBe(false);
    expect(isValidTime('24:00')).toBe(false);
  });
});
