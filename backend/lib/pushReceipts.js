const { normalizePreferences } = require('./notificationPreferences');
const {
  finalizeClaimInPreferences,
  finalizeNotificationClaim,
  releaseClaimInPreferences,
  releaseNotificationClaim,
  removePushReceipt,
  runSerializable,
} = require('./notificationStore');
const { getExpoPushReceipts } = require('./pushService');
const { sendUserNotification } = require('./notificationEvents');

const RECEIPT_WAIT_MS = 15 * 60 * 1000;
const RECEIPT_EXPIRES_MS = 24 * 60 * 60 * 1000;
const RETRY_LEASE_MS = 20 * 60 * 1000;

const validReceipt = (receipt) => (
  receipt &&
  typeof receipt.id === 'string' &&
  typeof receipt.token === 'string' &&
  !Number.isNaN(Date.parse(receipt.createdAt))
);

async function processPushReceipts(
  db,
  now = new Date(),
  fetchReceipts = getExpoPushReceipts,
  sendNotification = sendUserNotification,
) {
  const users = await db.user.findMany({
    select: { id: true, notificationPreferences: true },
  });
  const nowMs = now.getTime();
  const dueIds = [];
  const usersWithReceipts = [];

  for (const user of users) {
    const receipts = normalizePreferences(user.notificationPreferences)._meta.receipts ?? [];
    if (receipts.length > 0) usersWithReceipts.push(user);
    for (const receipt of receipts) {
      if (!validReceipt(receipt)) continue;
      const age = nowMs - Date.parse(receipt.createdAt);
      if (age >= RECEIPT_WAIT_MS && age < RECEIPT_EXPIRES_MS) dueIds.push(receipt.id);
      if (dueIds.length === 1000) break;
    }
    if (dueIds.length === 1000) break;
  }

  const uniqueIds = [...new Set(dueIds)];
  const resolved = uniqueIds.length ? await fetchReceipts(uniqueIds) : {};
  let checked = 0;
  let invalidTokens = 0;
  const retries = [];

  for (const user of usersWithReceipts) {
    const decision = await runSerializable(db, async (tx) => {
      const outcome = { checked: 0, invalidToken: false, retries: [] };
      const current = await tx.user.findUnique({
        where: { id: user.id },
        select: { expoPushToken: true, notificationPreferences: true },
      });
      if (!current) return outcome;

      let preferences = normalizePreferences(current.notificationPreferences);
      const receipts = preferences._meta.receipts ?? [];
      let clearToken = false;
      let changed = false;
      const pending = [];

      for (const receipt of receipts) {
        if (!validReceipt(receipt)) {
          changed = true;
          continue;
        }
        const age = nowMs - Date.parse(receipt.createdAt);
        if (age >= RECEIPT_EXPIRES_MS) {
          changed = true;
          preferences = releaseClaimInPreferences(preferences, receipt.claim);
          continue;
        }
        const result = resolved[receipt.id];
        if (!result) {
          pending.push(receipt);
          continue;
        }

        changed = true;
        outcome.checked += 1;
        if (
          result.status === 'error' &&
          result.details?.error === 'DeviceNotRegistered' &&
          current.expoPushToken === receipt.token
        ) {
          clearToken = true;
          preferences = releaseClaimInPreferences(preferences, receipt.claim);
        } else if (
          result.status === 'error' &&
          result.details?.error === 'MessageRateExceeded' &&
          typeof receipt.type === 'string' &&
          receipt.payload &&
          (receipt.attempt ?? 0) < 3
        ) {
          const retryAge = receipt.retryingAt
            ? nowMs - Date.parse(receipt.retryingAt)
            : Number.POSITIVE_INFINITY;
          if (retryAge < RETRY_LEASE_MS) {
            pending.push(receipt);
          } else {
            const leasedReceipt = { ...receipt, retryingAt: now.toISOString() };
            pending.push(leasedReceipt);
            outcome.retries.push({ userId: user.id, receipt: leasedReceipt });
          }
        } else if (result.status === 'error') {
          preferences = releaseClaimInPreferences(preferences, receipt.claim);
        } else if (result.status === 'ok') {
          preferences = finalizeClaimInPreferences(preferences, receipt.claim);
        }
      }

      if (!changed && !clearToken) return outcome;
      outcome.invalidToken = clearToken;
      await tx.user.update({
        where: { id: user.id },
        data: {
          ...(clearToken ? { expoPushToken: null } : {}),
          notificationPreferences: {
            ...preferences,
            _meta: { ...preferences._meta, receipts: pending },
          },
        },
      });
      return outcome;
    });
    checked += decision?.checked ?? 0;
    if (decision?.invalidToken) invalidTokens += 1;
    retries.push(...(decision?.retries ?? []));
  }

  for (const { userId, receipt } of retries) {
    const result = await sendNotification(userId, receipt.type, receipt.payload, {
      db,
      now,
      receiptAttempt: (receipt.attempt ?? 0) + 1,
      receiptContext: receipt.claim,
      collapseId: receipt.collapseId,
    });
    await removePushReceipt(db, userId, receipt.id);
    if (!result.sent && receipt.claim) {
      await releaseNotificationClaim(db, userId, receipt.claim);
    } else if (result.sent && receipt.claim) {
      await finalizeNotificationClaim(db, userId, receipt.claim);
    }
  }

  return { checked, invalidTokens };
}

module.exports = {
  RECEIPT_EXPIRES_MS,
  RECEIPT_WAIT_MS,
  RETRY_LEASE_MS,
  processPushReceipts,
};
