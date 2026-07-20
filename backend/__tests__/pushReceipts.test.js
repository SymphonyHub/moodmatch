const { processPushReceipts } = require('../lib/pushReceipts');

const NOW = new Date('2026-07-20T12:00:00.000Z');

function makeDb(user) {
  const state = { ...user };
  return {
    state,
    user: {
      findMany: jest.fn().mockResolvedValue([{
        id: state.id,
        notificationPreferences: state.notificationPreferences,
      }]),
      findUnique: jest.fn().mockImplementation(() => Promise.resolve({ ...state })),
      update: jest.fn().mockImplementation(({ data }) => {
        Object.assign(state, data);
        return Promise.resolve({ ...state });
      }),
    },
  };
}

describe('receipts de Expo Push', () => {
  test('limpia un token que Expo marca DeviceNotRegistered', async () => {
    const token = 'ExponentPushToken[old]';
    const db = makeDb({
      id: 1,
      expoPushToken: token,
      notificationPreferences: {
        _meta: {
          receipts: [{ id: 'ticket-1', token, createdAt: '2026-07-20T11:30:00.000Z' }],
        },
      },
    });
    const fetchReceipts = jest.fn().mockResolvedValue({
      'ticket-1': { status: 'error', details: { error: 'DeviceNotRegistered' } },
    });

    await expect(processPushReceipts(db, NOW, fetchReceipts)).resolves.toEqual({
      checked: 1,
      invalidTokens: 1,
    });
    expect(db.state.expoPushToken).toBeNull();
    expect(db.state.notificationPreferences._meta.receipts).toEqual([]);
  });

  test('conserva tickets jóvenes y espera al menos 15 minutos', async () => {
    const token = 'ExponentPushToken[current]';
    const receipt = { id: 'ticket-new', token, createdAt: '2026-07-20T11:50:00.000Z' };
    const db = makeDb({
      id: 1,
      expoPushToken: token,
      notificationPreferences: { _meta: { receipts: [receipt] } },
    });
    const fetchReceipts = jest.fn();

    await expect(processPushReceipts(db, NOW, fetchReceipts)).resolves.toEqual({
      checked: 0,
      invalidTokens: 0,
    });
    expect(fetchReceipts).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });

  test('si Expo aún no publica un receipt lo conserva para el próximo cron', async () => {
    const token = 'ExponentPushToken[current]';
    const receipt = { id: 'ticket-pending', token, createdAt: '2026-07-20T11:00:00.000Z' };
    const db = makeDb({
      id: 1,
      expoPushToken: token,
      notificationPreferences: { _meta: { receipts: [receipt] } },
    });

    await processPushReceipts(db, NOW, jest.fn().mockResolvedValue({}));
    expect(db.user.update).not.toHaveBeenCalled();
    expect(db.state.notificationPreferences._meta.receipts).toEqual([receipt]);
  });

  test('reintenta MessageRateExceeded y conserva el contexto del claim', async () => {
    const token = 'ExponentPushToken[current]';
    const claim = {
      type: 'recordatorio',
      previous: undefined,
      timestamp: '2026-07-20T10:00:00.000Z',
    };
    const receipt = {
      id: 'ticket-rate',
      token,
      createdAt: '2026-07-20T11:00:00.000Z',
      type: 'recordatorio',
      payload: { title: 'Recordatorio', body: 'Cuerpo', data: {} },
      attempt: 0,
      claim,
    };
    const db = makeDb({
      id: 1,
      expoPushToken: token,
      notificationPreferences: {
        recordatorio: true,
        _meta: { sent: { recordatorio: claim.timestamp }, receipts: [receipt] },
      },
    });
    const sendNotification = jest.fn().mockResolvedValue({ sent: true });

    await processPushReceipts(
      db,
      NOW,
      jest.fn().mockResolvedValue({
        'ticket-rate': { status: 'error', details: { error: 'MessageRateExceeded' } },
      }),
      sendNotification,
    );

    expect(sendNotification).toHaveBeenCalledWith(
      1,
      'recordatorio',
      receipt.payload,
      expect.objectContaining({ receiptAttempt: 1, receiptContext: claim }),
    );
    expect(db.state.notificationPreferences._meta.receipts).toEqual([]);
    expect(db.state.notificationPreferences._meta.sent.recordatorio).toBe(claim.timestamp);
  });

  test('libera el claim si un reintento no puede enviarse', async () => {
    const token = 'ExponentPushToken[current]';
    const claim = {
      type: 'recordatorio',
      previous: '2026-07-01T00:00:00.000Z',
      timestamp: '2026-07-20T10:00:00.000Z',
    };
    const receipt = {
      id: 'ticket-rate', token, createdAt: '2026-07-20T11:00:00.000Z',
      type: 'recordatorio', payload: { title: 'a', body: 'b' }, attempt: 2, claim,
    };
    const db = makeDb({
      id: 1,
      expoPushToken: token,
      notificationPreferences: {
        recordatorio: true,
        _meta: {
          sent: { recordatorio: claim.timestamp },
          receipts: [receipt],
        },
      },
    });

    await processPushReceipts(
      db,
      NOW,
      jest.fn().mockResolvedValue({
        'ticket-rate': { status: 'error', details: { error: 'MessageRateExceeded' } },
      }),
      jest.fn().mockResolvedValue({ sent: false, reason: 'do-not-disturb' }),
    );

    expect(db.state.notificationPreferences._meta.sent.recordatorio).toBe(claim.previous);
  });

  test('tras agotar reintentos libera el episodio para un futuro cron', async () => {
    const token = 'ExponentPushToken[current]';
    const claim = {
      type: 'recordatorio',
      previous: undefined,
      timestamp: '2026-07-20T10:00:00.000Z',
    };
    const receipt = {
      id: 'ticket-final', token, createdAt: '2026-07-20T11:00:00.000Z',
      type: 'recordatorio', payload: { title: 'a', body: 'b' }, attempt: 3, claim,
    };
    const db = makeDb({
      id: 1,
      expoPushToken: token,
      notificationPreferences: {
        recordatorio: true,
        _meta: { sent: { recordatorio: claim.timestamp }, receipts: [receipt] },
      },
    });
    const sendNotification = jest.fn();

    await processPushReceipts(
      db,
      NOW,
      jest.fn().mockResolvedValue({
        'ticket-final': { status: 'error', details: { error: 'MessageRateExceeded' } },
      }),
      sendNotification,
    );

    expect(sendNotification).not.toHaveBeenCalled();
    expect(db.state.notificationPreferences._meta.sent?.recordatorio).toBeUndefined();
  });

  test('una lease de reintento evita reenvíos solapados y conserva trabajo durable', async () => {
    const token = 'ExponentPushToken[current]';
    const receipt = {
      id: 'ticket-leased', token, createdAt: '2026-07-20T11:00:00.000Z',
      type: 'recordatorio', payload: { title: 'a', body: 'b' }, attempt: 1,
      retryingAt: '2026-07-20T11:55:00.000Z',
    };
    const db = makeDb({
      id: 1,
      expoPushToken: token,
      notificationPreferences: { _meta: { receipts: [receipt] } },
    });
    const sendNotification = jest.fn();

    await processPushReceipts(
      db,
      NOW,
      jest.fn().mockResolvedValue({
        'ticket-leased': { status: 'error', details: { error: 'MessageRateExceeded' } },
      }),
      sendNotification,
    );

    expect(sendNotification).not.toHaveBeenCalled();
    expect(db.state.notificationPreferences._meta.receipts).toEqual([receipt]);
  });
});
