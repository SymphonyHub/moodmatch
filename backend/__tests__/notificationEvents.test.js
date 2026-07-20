const {
  CONTENT,
  notifyNewMessage,
  sendUserNotification,
} = require('../lib/notificationEvents');
const { PushDeliveryError } = require('../lib/pushService');

const pushUser = (preferences = null) => ({
  expoPushToken: 'ExponentPushToken[abc]',
  notificationPreferences: preferences,
});

describe('consumidores de notificaciones', () => {
  test('no llama a Expo si el tipo está desactivado', async () => {
    const sendPush = jest.fn();
    const db = { user: { findUnique: jest.fn().mockResolvedValue(pushUser({ mensajes: false })) } };
    const result = await sendUserNotification(2, 'mensajes', CONTENT.mensajes('Ana'), {
      db,
      sendPush,
    });

    expect(result).toEqual({ sent: false, reason: 'disabled' });
    expect(sendPush).not.toHaveBeenCalled();
  });

  test('no llama a Expo durante no molestar', async () => {
    const sendPush = jest.fn();
    const db = { user: { findUnique: jest.fn().mockResolvedValue(pushUser({
      noMolestar: { desde: '22:00', hasta: '08:00' },
      _meta: { timeZone: 'America/Santiago' },
    })) } };
    const result = await sendUserNotification(2, 'mensajes', CONTENT.mensajes('Ana'), {
      db,
      now: new Date('2026-07-20T03:00:00.000Z'),
      sendPush,
    });

    expect(result.reason).toBe('do-not-disturb');
    expect(sendPush).not.toHaveBeenCalled();
  });

  test('mensaje no incluye nombre ni texto privado en la pantalla bloqueada', async () => {
    const db = {
      user: {
        findUnique: jest.fn().mockResolvedValue(pushUser()),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const sendPush = jest.fn().mockResolvedValue({ status: 'ok', id: 'ticket' });
    const result = await notifyNewMessage({ fromUserId: 1, toUserId: 2 }, { db, sendPush });

    expect(result.sent).toBe(true);
    expect(sendPush).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Mensaje nuevo',
      body: 'Tienes un mensaje nuevo de una amistad.',
    }));
  });

  test('DeviceNotRegistered limpia el token sin hacer fallar el evento', async () => {
    const db = { user: {
      findUnique: jest.fn().mockResolvedValue(pushUser()),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    } };
    const sendPush = jest.fn().mockRejectedValue(
      new PushDeliveryError('not registered', 'DeviceNotRegistered'),
    );
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await sendUserNotification(2, 'mensajes', CONTENT.mensajes('Ana'), {
      db,
      sendPush,
    });

    expect(result).toEqual({ sent: false, reason: 'delivery-error' });
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: 2, expoPushToken: 'ExponentPushToken[abc]' },
      data: { expoPushToken: null },
    });
    warning.mockRestore();
  });
});
