const prisma = require('./prisma');
const { isDoNotDisturbActive, normalizePreferences } = require('./notificationPreferences');
const { PushDeliveryError, sendExpoPush } = require('./pushService');
const { queuePushReceipt } = require('./notificationStore');

const CONTENT = {
  mensajes: () => ({
    title: 'Mensaje nuevo',
    body: 'Tienes un mensaje nuevo de una amistad.',
    data: { url: '/(tabs)/amigos', type: 'mensajes' },
  }),
  mascota: () => ({
    title: 'Su mascota los extraña',
    body: 'Hace un tiempo que no recibe cuidados. Cuando puedan, pasen a verla.',
    data: { url: '/(tabs)/amigos', type: 'mascota' },
  }),
  actividades: () => ({
    title: 'Actividad compartida',
    body: 'Una amistad completó una actividad "Con amigos" contigo.',
    data: { url: '/(tabs)/actividades', type: 'actividades' },
  }),
  recordatorio: () => ({
    title: '¿Cómo han estado tus días?',
    body: 'Si te hace sentido, puedes registrar cómo estás. Sin apuro.',
    data: { url: '/(tabs)/home', type: 'recordatorio' },
  }),
  amistad: () => ({
    title: 'Nueva amistad en Hora Azul',
    body: 'Una amistad aceptó tu invitación.',
    data: { url: '/(tabs)/amigos', type: 'amistad' },
  }),
};

async function sendUserNotification(userId, type, content, options = {}) {
  const db = options.db ?? prisma;
  let user;
  try {
    // Siempre releer: el job puede durar varios segundos y una preferencia o
    // sesión puede haber cambiado desde que armó su lista de candidatos.
    user = await db.user.findUnique({
      where: { id: userId },
      select: { expoPushToken: true, notificationPreferences: true },
    });
    if (!user?.expoPushToken) return { sent: false, reason: 'no-token' };

    const preferences = normalizePreferences(user.notificationPreferences);
    if (!preferences[type]) return { sent: false, reason: 'disabled' };
    if (isDoNotDisturbActive(preferences, options.now)) {
      return { sent: false, reason: 'do-not-disturb' };
    }

    const pushPayload = {
      token: user.expoPushToken,
      ...content,
      collapseId: options.collapseId,
    };
    const ticket = await (options.sendPush ?? sendExpoPush)(pushPayload);
    if (ticket?.id) {
      await queuePushReceipt(db, userId, {
        id: ticket.id,
        token: user.expoPushToken,
        createdAt: (options.now ?? new Date()).toISOString(),
        type,
        payload: content,
        attempt: options.receiptAttempt ?? 0,
        ...(options.collapseId ? { collapseId: options.collapseId } : {}),
        ...(options.receiptContext ? { claim: options.receiptContext } : {}),
      }).catch((error) => {
        console.warn(`No se pudo guardar el receipt push ${ticket.id}: ${error.message}`);
      });
    }
    return { sent: true, ticket };
  } catch (error) {
    if (user && error instanceof PushDeliveryError && error.code === 'DeviceNotRegistered') {
      await db.user.updateMany({
        where: { id: userId, expoPushToken: user.expoPushToken },
        data: { expoPushToken: null },
      }).catch(() => {});
    }
    console.warn(`Push ${type} no enviado al usuario ${userId}: ${error.message}`);
    return { sent: false, reason: 'delivery-error' };
  }
}

const notifyNewMessage = ({ toUserId }, options = {}) =>
  sendUserNotification(toUserId, 'mensajes', CONTENT.mensajes(), options);

const notifySharedActivity = ({ toUserId }, options = {}) =>
  sendUserNotification(toUserId, 'actividades', CONTENT.actividades(), options);

const notifyFriendAccepted = ({ invitationOwnerId }, options = {}) =>
  sendUserNotification(invitationOwnerId, 'amistad', CONTENT.amistad(), options);

const notifyPetNeedsAttention = (userId, friendshipId, options = {}) =>
  sendUserNotification(userId, 'mascota', CONTENT.mascota(), {
    ...options,
    collapseId: `mascota-${friendshipId}`,
  });

const notifyMoodReminder = (userId, options = {}) =>
  sendUserNotification(userId, 'recordatorio', CONTENT.recordatorio(), {
    ...options,
    collapseId: `recordatorio-${userId}`,
  });

// Los eventos de negocio no deben fallar por una caída del proveedor push.
function dispatchNotification(promise) {
  void promise.catch((error) => console.warn(`Consumidor de notificación falló: ${error.message}`));
}

module.exports = {
  CONTENT,
  dispatchNotification,
  notifyFriendAccepted,
  notifyMoodReminder,
  notifyNewMessage,
  notifyPetNeedsAttention,
  notifySharedActivity,
  sendUserNotification,
};
