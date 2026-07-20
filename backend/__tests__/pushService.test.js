const {
  EXPO_PUSH_URL,
  EXPO_RECEIPTS_URL,
  PushDeliveryError,
  getExpoPushReceipts,
  isExpoPushToken,
  sendExpoPush,
} = require('../lib/pushService');

describe('Expo Push API', () => {
  const token = 'ExponentPushToken[abc123]';

  afterEach(() => delete process.env.EXPO_ACCESS_TOKEN);

  test('valida las dos formas de token admitidas por Expo', () => {
    expect(isExpoPushToken(token)).toBe(true);
    expect(isExpoPushToken('ExpoPushToken[xyz]')).toBe(true);
    expect(isExpoPushToken('token-fcm')).toBe(false);
  });

  test('envía el payload reusable al endpoint oficial', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { status: 'ok', id: 'ticket-1' } }),
    });

    await expect(sendExpoPush({
      token,
      title: 'Título',
      body: 'Cuerpo',
      data: { url: '/amigos' },
      collapseId: 'mensaje-2',
    }, fetchImpl)).resolves.toEqual({ status: 'ok', id: 'ticket-1' });

    expect(fetchImpl).toHaveBeenCalledWith(EXPO_PUSH_URL, expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual(expect.objectContaining({
      to: token,
      channelId: 'hora-azul',
      collapseId: 'mensaje-2',
      tag: 'mensaje-2',
    }));
  });

  test('agrega el access token solo cuando push security está habilitado', async () => {
    process.env.EXPO_ACCESS_TOKEN = 'secreto-expo';
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { status: 'ok', id: 'ticket-2' } }),
    });
    await sendExpoPush({ token, title: 'a', body: 'b' }, fetchImpl);
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer secreto-expo');
  });

  test('expone DeviceNotRegistered para poder limpiar el token', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } },
      }),
    });

    await expect(sendExpoPush({ token, title: 'a', body: 'b' }, fetchImpl)).rejects.toEqual(
      expect.objectContaining({ name: 'PushDeliveryError', code: 'DeviceNotRegistered' }),
    );
  });

  test('rechaza token inválido antes de hacer red', async () => {
    const fetchImpl = jest.fn();
    await expect(sendExpoPush({ token: 'inválido', title: 'a', body: 'b' }, fetchImpl))
      .rejects.toBeInstanceOf(PushDeliveryError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('consulta receipts para confirmar la entrega al proveedor', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { 'ticket-1': { status: 'ok' } } }),
    });
    await expect(getExpoPushReceipts(['ticket-1'], fetchImpl)).resolves.toEqual({
      'ticket-1': { status: 'ok' },
    });
    expect(fetchImpl).toHaveBeenCalledWith(EXPO_RECEIPTS_URL, expect.objectContaining({
      body: JSON.stringify({ ids: ['ticket-1'] }),
    }));
  });
});
