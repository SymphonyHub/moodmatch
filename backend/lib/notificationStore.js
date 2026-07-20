const { normalizePreferences } = require('./notificationPreferences');

const MAX_TRANSACTION_RETRIES = 3;

async function runSerializable(db, operation) {
  // Los dobles de Prisma de tests unitarios pueden no implementar transacciones.
  if (typeof db.$transaction !== 'function') return operation(db);

  for (let attempt = 1; attempt <= MAX_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await db.$transaction(operation, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error?.code !== 'P2034' || attempt === MAX_TRANSACTION_RETRIES) throw error;
    }
  }
  return null;
}

async function mutatePreferences(db, userId, mutate) {
  return runSerializable(db, async (tx) => {
    const current = await tx.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });
    if (!current) return null;

    const normalized = normalizePreferences(current.notificationPreferences);
    const next = mutate(normalized);
    if (next === null) return normalized;
    await tx.user.update({
      where: { id: userId },
      data: { notificationPreferences: next },
    });
    return next;
  });
}

async function queuePushReceipt(db, userId, receipt) {
  return mutatePreferences(db, userId, (preferences) => ({
    ...preferences,
    _meta: {
      ...preferences._meta,
      receipts: [...(preferences._meta.receipts ?? []), receipt].slice(-50),
    },
  }));
}

async function removePushReceipt(db, userId, receiptId) {
  return mutatePreferences(db, userId, (preferences) => ({
    ...preferences,
    _meta: {
      ...preferences._meta,
      receipts: (preferences._meta.receipts ?? []).filter((receipt) => receipt.id !== receiptId),
    },
  }));
}

function claimValue(preferences, claim) {
  const claims = preferences._meta.claims ?? {};
  return claim.key === undefined ? claims[claim.type] : claims[claim.type]?.[claim.key];
}

function sentValue(preferences, claim) {
  const sent = preferences._meta.sent ?? {};
  return claim.key === undefined ? sent[claim.type] : sent[claim.type]?.[claim.key];
}

function releaseClaimInPreferences(preferences, claim) {
  if (!claim) return preferences;
  const hasActiveClaim = claimValue(preferences, claim)?.timestamp === claim.timestamp;
  const hasFinalizedClaim = sentValue(preferences, claim) === claim.timestamp;
  if (!hasActiveClaim && !hasFinalizedClaim) return preferences;

  const claims = { ...(preferences._meta.claims ?? {}) };
  if (hasActiveClaim) {
    if (claim.key === undefined) {
      delete claims[claim.type];
    } else {
      const keyed = { ...(claims[claim.type] ?? {}) };
      delete keyed[claim.key];
      claims[claim.type] = keyed;
    }
  }

  const sent = { ...(preferences._meta.sent ?? {}) };
  if (hasFinalizedClaim) {
    if (claim.key === undefined) {
      if (claim.previous === undefined) delete sent[claim.type];
      else sent[claim.type] = claim.previous;
    } else {
      const keyed = { ...(sent[claim.type] ?? {}) };
      if (claim.previous === undefined) delete keyed[claim.key];
      else keyed[claim.key] = claim.previous;
      sent[claim.type] = keyed;
    }
  }
  return {
    ...preferences,
    _meta: { ...preferences._meta, claims, sent },
  };
}

function finalizeClaimInPreferences(preferences, claim) {
  if (!claim || claimValue(preferences, claim)?.timestamp !== claim.timestamp) return preferences;
  const withoutClaim = releaseClaimInPreferences(preferences, claim);
  const sent = { ...(withoutClaim._meta.sent ?? {}) };
  if (claim.key === undefined) {
    sent[claim.type] = claim.timestamp;
  } else {
    sent[claim.type] = { ...(sent[claim.type] ?? {}), [claim.key]: claim.timestamp };
  }
  return {
    ...withoutClaim,
    _meta: { ...withoutClaim._meta, sent },
  };
}

async function releaseNotificationClaim(db, userId, claim) {
  if (!claim) return;
  await mutatePreferences(db, userId, (preferences) => {
    const next = releaseClaimInPreferences(preferences, claim);
    return next === preferences ? null : next;
  });
}

async function finalizeNotificationClaim(db, userId, claim) {
  if (!claim) return;
  await mutatePreferences(db, userId, (preferences) => {
    const next = finalizeClaimInPreferences(preferences, claim);
    return next === preferences ? null : next;
  });
}

module.exports = {
  mutatePreferences,
  queuePushReceipt,
  removePushReceipt,
  finalizeClaimInPreferences,
  finalizeNotificationClaim,
  releaseClaimInPreferences,
  releaseNotificationClaim,
  runSerializable,
};
