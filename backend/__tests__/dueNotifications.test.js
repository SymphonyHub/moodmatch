jest.mock('../lib/notificationEvents', () => ({
  notifyMoodReminder: jest.fn(),
  notifyPetNeedsAttention: jest.fn(),
}));

const {
  MOOD_REMINDER_AFTER_MS,
  PET_ATTENTION_AFTER_MS,
  CLAIM_LEASE_MS,
  claimDelivery,
  isDue,
  latestPetCare,
  sendDueNotifications,
} = require('../lib/dueNotifications');
const { notifyMoodReminder, notifyPetNeedsAttention } = require('../lib/notificationEvents');

const NOW = new Date('2026-07-20T12:00:00.000Z');
const pushUser = (id, notificationPreferences = null) => ({
  id,
  expoPushToken: `ExponentPushToken[user-${id}]`,
  notificationPreferences,
});

describe('job de notificaciones vencidas', () => {
  beforeEach(() => jest.clearAllMocks());

  test('umbrales son 3 días para ánimo y 48 horas para mascota', () => {
    expect(isDue(new Date(NOW - MOOD_REMINDER_AFTER_MS), null, MOOD_REMINDER_AFTER_MS, NOW)).toBe(true);
    expect(isDue(new Date(NOW - PET_ATTENTION_AFTER_MS + 1), null, PET_ATTENTION_AFTER_MS, NOW)).toBe(false);
  });

  test('el cuidado más reciente de cualquiera de los dos evita avisos prematuros', () => {
    const pet = {
      createdAt: '2026-07-01T00:00:00.000Z',
      ultimoCuidadoUsuario1: '2026-07-15T00:00:00.000Z',
      ultimoCuidadoUsuario2: '2026-07-19T10:00:00.000Z',
    };
    expect(latestPetCare(pet).toISOString()).toBe('2026-07-19T10:00:00.000Z');
  });

  test('una claim activa evita duplicados y una vencida se recupera', async () => {
    const activeClaim = {
      type: 'recordatorio',
      timestamp: new Date(NOW.getTime() - CLAIM_LEASE_MS + 1000).toISOString(),
    };
    let stored = { recordatorio: true, _meta: { claims: { recordatorio: activeClaim } } };
    const db = { user: {
      findUnique: jest.fn().mockImplementation(() => Promise.resolve({ notificationPreferences: stored })),
      update: jest.fn().mockImplementation(({ data }) => {
        stored = data.notificationPreferences;
        return Promise.resolve({});
      }),
    } };
    const reference = new Date(NOW.getTime() - MOOD_REMINDER_AFTER_MS - 1000);

    await expect(claimDelivery(
      db, 1, 'recordatorio', reference, MOOD_REMINDER_AFTER_MS, NOW,
    )).resolves.toBeNull();
    expect(db.user.update).not.toHaveBeenCalled();

    stored._meta.claims.recordatorio.timestamp = new Date(
      NOW.getTime() - CLAIM_LEASE_MS - 1000,
    ).toISOString();
    await expect(claimDelivery(
      db, 1, 'recordatorio', reference, MOOD_REMINDER_AFTER_MS, NOW,
    )).resolves.toEqual(expect.objectContaining({ timestamp: NOW.toISOString() }));
    expect(db.user.update).toHaveBeenCalledTimes(1);
  });

  test('envía cada episodio vencido una vez y persiste deduplicación', async () => {
    const user1 = pushUser(1);
    const user2 = pushUser(2, { recordatorio: false });
    const stored = new Map([[1, null], [2, { recordatorio: false }]]);
    const db = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          { ...user1, createdAt: new Date('2026-07-01'), moodEntries: [{ createdAt: new Date('2026-07-16') }] },
          { ...user2, createdAt: new Date('2026-07-01'), moodEntries: [] },
        ]),
        findUnique: jest.fn(({ where }) => Promise.resolve({
          notificationPreferences: stored.get(where.id),
        })),
        update: jest.fn(({ where, data }) => {
          stored.set(where.id, data.notificationPreferences);
          return Promise.resolve({});
        }),
      },
      mascotaAmistad: {
        findMany: jest.fn().mockResolvedValue([{
          amistadId: 8,
          createdAt: new Date('2026-07-01'),
          ultimoCuidadoUsuario1: new Date('2026-07-17T08:00:00.000Z'),
          ultimoCuidadoUsuario2: null,
          amistad: { user: user1, friend: user2 },
        }]),
      },
    };
    notifyMoodReminder.mockResolvedValue({ sent: true });
    notifyPetNeedsAttention.mockResolvedValue({ sent: true });

    await expect(sendDueNotifications(db, NOW)).resolves.toEqual({
      moodReminders: 1,
      petReminders: 2,
    });
    expect(notifyMoodReminder).toHaveBeenCalledTimes(1);
    expect(notifyPetNeedsAttention).toHaveBeenCalledTimes(2);
    // Cada envío reclama primero y finaliza la marca después del ticket aceptado.
    expect(db.user.update).toHaveBeenCalledTimes(6);
    expect(db.user.update.mock.calls.some(([arg]) =>
      arg.data.notificationPreferences._meta.sent?.mascota?.['8'] === NOW.toISOString())).toBe(true);
  });

  test('no repite mientras no haya un ánimo o cuidado posterior al último aviso', async () => {
    const sentAt = '2026-07-18T12:00:00.000Z';
    const preferences = {
      _meta: {
        sent: {
          recordatorio: sentAt,
          mascota: { 8: sentAt },
        },
      },
    };
    const user = pushUser(1, preferences);
    const stored = new Map([[1, preferences]]);
    const db = {
      user: {
        findMany: jest.fn().mockResolvedValue([{
          ...user,
          createdAt: new Date('2026-07-01'),
          moodEntries: [{ createdAt: new Date('2026-07-10') }],
        }]),
        findUnique: jest.fn(({ where }) => Promise.resolve({
          notificationPreferences: stored.get(where.id),
        })),
        update: jest.fn(),
      },
      mascotaAmistad: {
        findMany: jest.fn().mockResolvedValue([{
          amistadId: 8,
          createdAt: new Date('2026-07-01'),
          ultimoCuidadoUsuario1: new Date('2026-07-10'),
          ultimoCuidadoUsuario2: null,
          amistad: { user, friend: { id: 2, expoPushToken: null, notificationPreferences: null } },
        }]),
      },
    };

    await expect(sendDueNotifications(db, NOW)).resolves.toEqual({ moodReminders: 0, petReminders: 0 });
    expect(notifyMoodReminder).not.toHaveBeenCalled();
    expect(notifyPetNeedsAttention).not.toHaveBeenCalled();
  });
});
