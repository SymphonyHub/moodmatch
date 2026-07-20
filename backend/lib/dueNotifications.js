const {
  isDoNotDisturbActive,
  normalizePreferences,
} = require('./notificationPreferences');
const { notifyMoodReminder, notifyPetNeedsAttention } = require('./notificationEvents');
const {
  finalizeNotificationClaim,
  mutatePreferences,
  releaseNotificationClaim,
} = require('./notificationStore');

const HOUR_MS = 60 * 60 * 1000;
const MOOD_REMINDER_AFTER_MS = 3 * 24 * HOUR_MS;
const PET_ATTENTION_AFTER_MS = 48 * HOUR_MS;
const CLAIM_LEASE_MS = 20 * 60 * 1000;

const validDateMs = (value) => {
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(time) ? null : time;
};

function isDue(reference, lastSent, thresholdMs, now) {
  const referenceMs = validDateMs(reference);
  if (referenceMs === null || now.getTime() - referenceMs < thresholdMs) return false;
  const lastSentMs = validDateMs(lastSent);
  return lastSentMs === null || lastSentMs < referenceMs;
}

function deliveryTimestamp(preferences, type, key) {
  const sent = normalizePreferences(preferences)._meta.sent ?? {};
  return key === undefined ? sent[type] : sent[type]?.[key];
}

function withClaim(preferences, claim) {
  const claims = { ...(preferences._meta.claims ?? {}) };
  const { type, key } = claim;
  if (key === undefined) {
    claims[type] = claim;
  } else {
    claims[type] = { ...(claims[type] ?? {}), [key]: claim };
  }
  return {
    ...preferences,
    _meta: { ...preferences._meta, claims },
  };
}

async function claimDelivery(db, userId, type, reference, thresholdMs, now, key) {
  let claim = null;
  const claimTimestamp = now.toISOString();
  const preferences = await mutatePreferences(db, userId, (current) => {
    claim = null;
    if (!current[type] || isDoNotDisturbActive(current, now)) return null;

    const previous = deliveryTimestamp(current, type, key);
    if (!isDue(reference, previous, thresholdMs, now)) return null;
    const claims = current._meta.claims ?? {};
    const activeClaim = key === undefined ? claims[type] : claims[type]?.[key];
    if (
      activeClaim?.timestamp &&
      now.getTime() - Date.parse(activeClaim.timestamp) < CLAIM_LEASE_MS
    ) return null;

    claim = { type, key, previous, timestamp: claimTimestamp };
    return withClaim(current, claim);
  });
  return preferences && claim ? claim : null;
}

function latestPetCare(pet) {
  const dates = [pet.createdAt, pet.ultimoCuidadoUsuario1, pet.ultimoCuidadoUsuario2]
    .map(validDateMs)
    .filter((value) => value !== null);
  return dates.length ? new Date(Math.max(...dates)) : null;
}

async function sendMoodReminders(db, now) {
  const users = await db.user.findMany({
    where: { expoPushToken: { not: null } },
    select: {
      id: true,
      createdAt: true,
      expoPushToken: true,
      notificationPreferences: true,
      moodEntries: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  let sent = 0;
  for (const user of users) {
    const reference = user.moodEntries[0]?.createdAt ?? user.createdAt;
    const claim = await claimDelivery(
      db,
      user.id,
      'recordatorio',
      reference,
      MOOD_REMINDER_AFTER_MS,
      now,
    );
    if (!claim) continue;

    const result = await notifyMoodReminder(user.id, { db, now, receiptContext: claim });
    if (!result.sent) {
      await releaseNotificationClaim(db, user.id, claim);
      continue;
    }
    await finalizeNotificationClaim(db, user.id, claim);
    sent += 1;
  }
  return sent;
}

async function sendPetAttentionReminders(db, now) {
  const pets = await db.mascotaAmistad.findMany({
    select: {
      amistadId: true,
      createdAt: true,
      ultimoCuidadoUsuario1: true,
      ultimoCuidadoUsuario2: true,
      amistad: {
        select: {
          user: {
            select: { id: true, expoPushToken: true, notificationPreferences: true },
          },
          friend: {
            select: { id: true, expoPushToken: true, notificationPreferences: true },
          },
        },
      },
    },
  });

  let sent = 0;
  for (const pet of pets) {
    const lastCare = latestPetCare(pet);
    const recipients = [pet.amistad.user, pet.amistad.friend];
    for (const user of recipients) {
      if (!user.expoPushToken) continue;
      const key = String(pet.amistadId);
      const claim = await claimDelivery(
        db,
        user.id,
        'mascota',
        lastCare,
        PET_ATTENTION_AFTER_MS,
        now,
        key,
      );
      if (!claim) continue;

      const result = await notifyPetNeedsAttention(user.id, pet.amistadId, {
        db,
        now,
        receiptContext: claim,
      });
      if (!result.sent) {
        await releaseNotificationClaim(db, user.id, claim);
        continue;
      }
      await finalizeNotificationClaim(db, user.id, claim);
      sent += 1;
    }
  }
  return sent;
}

async function sendDueNotifications(db, now = new Date()) {
  // Secuencial para que ambos tipos no se pisen al actualizar el JSON interno
  // de deduplicación de un mismo usuario.
  const moodReminders = await sendMoodReminders(db, now);
  const petReminders = await sendPetAttentionReminders(db, now);
  return { moodReminders, petReminders };
}

module.exports = {
  MOOD_REMINDER_AFTER_MS,
  PET_ATTENTION_AFTER_MS,
  CLAIM_LEASE_MS,
  claimDelivery,
  deliveryTimestamp,
  isDue,
  latestPetCare,
  sendDueNotifications,
};
