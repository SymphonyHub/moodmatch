const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const EXPO_TOKEN_RE = /^(?:Exponent|Expo)PushToken\[[^\]]+\]$/;

class PushDeliveryError extends Error {
  constructor(message, code = 'PUSH_DELIVERY_ERROR') {
    super(message);
    this.name = 'PushDeliveryError';
    this.code = code;
  }
}

const isExpoPushToken = (value) => typeof value === 'string' && EXPO_TOKEN_RE.test(value);

function requestHeaders() {
  const headers = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }
  return headers;
}

async function sendExpoPush({ token, title, body, data = {}, collapseId }, fetchImpl = fetch) {
  if (!isExpoPushToken(token)) {
    throw new PushDeliveryError('Token Expo Push inválido', 'INVALID_TOKEN');
  }

  const response = await fetchImpl(EXPO_PUSH_URL, {
    method: 'POST',
    headers: requestHeaders(),
    body: JSON.stringify({
      to: token,
      title,
      body,
      data,
      sound: 'default',
      channelId: 'hora-azul',
      priority: 'default',
      ...(collapseId ? { collapseId, tag: collapseId } : {}),
    }),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new PushDeliveryError(`Expo Push respondió ${response.status} sin JSON`, 'BAD_RESPONSE');
  }

  if (!response.ok) {
    throw new PushDeliveryError(
      payload?.errors?.[0]?.message ?? `Expo Push respondió ${response.status}`,
      payload?.errors?.[0]?.code ?? 'EXPO_REQUEST_ERROR',
    );
  }

  const ticket = Array.isArray(payload.data) ? payload.data[0] : payload.data;
  if (!ticket || ticket.status === 'error') {
    throw new PushDeliveryError(
      ticket?.message ?? 'Expo Push rechazó la notificación',
      ticket?.details?.error ?? 'EXPO_TICKET_ERROR',
    );
  }
  return ticket;
}

async function getExpoPushReceipts(ids, fetchImpl = fetch) {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 1000) {
    throw new PushDeliveryError('La consulta debe contener entre 1 y 1000 tickets', 'INVALID_RECEIPTS');
  }
  const response = await fetchImpl(EXPO_RECEIPTS_URL, {
    method: 'POST',
    headers: requestHeaders(),
    body: JSON.stringify({ ids }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.data) {
    throw new PushDeliveryError(
      payload?.errors?.[0]?.message ?? `Expo receipts respondió ${response.status}`,
      payload?.errors?.[0]?.code ?? 'EXPO_RECEIPTS_ERROR',
    );
  }
  return payload.data;
}

module.exports = {
  EXPO_PUSH_URL,
  EXPO_RECEIPTS_URL,
  PushDeliveryError,
  getExpoPushReceipts,
  isExpoPushToken,
  sendExpoPush,
};
