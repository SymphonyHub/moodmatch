import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

// Exportado para que los stores de datos (p.ej. friendsCountStore) gateen
// por sesión sin duplicar la clave de AsyncStorage.
export const getToken = () => AsyncStorage.getItem('token');

const SOCIAL_SUGGESTION_TTL_MS = 5 * 60 * 1000;
let socialSuggestionCache = null;

export const resetSocialSuggestionCache = () => {
  socialSuggestionCache = null;
};

const authHeaders = async (tokenExplicito = null) => {
  const token = tokenExplicito ?? await getToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export const apiLogin = (email, password) =>
  fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json());

export const apiRegister = (nombre, email, password) =>
  fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, email, password }),
  }).then((r) => r.json());

export const apiGetMe = async () => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/users/me`, { headers }).then((r) => r.json());
};

export const apiUpdateThemePreference = async (themePreference) => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/users/me`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ themePreference }),
  }).then((r) => r.json());
};

// PATCH genérico del perfil: { themePreference?, customTheme? }.
export const apiUpdateMe = async (fields) => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/users/me`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(fields),
  }).then((r) => r.json());
};

export const apiCreateMoodEntry = async (
  moodType,
  nota = null,
  clientId = null,
  capturedAt = null,
  tokenExplicito = null,
) => {
  const headers = await authHeaders(tokenExplicito);
  const res = await fetch(`${API_URL}/api/mood-entries`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      moodType,
      nota,
      ...(clientId && { clientId }),
      ...(capturedAt && { capturedAt }),
    }),
  });
  const data = await res.json();
  if (!res.ok || !data?.moodEntry) {
    const error = new Error(data?.error ?? 'No se pudo guardar el registro');
    error.status = res.status;
    throw error;
  }
  return data;
};

// Registros de ánimo de los últimos `days` días ({ entries }), para /historial.
export const apiGetMoodHistory = async (days = 30) => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/mood-entries?days=${days}`, { headers }).then((r) => r.json());
};

// Último ánimo registrado + su sugerencia más reciente, para la pestaña
// "Para mí" del Wellness Hub ({ moodEntry, actividad }, ambos null si no hay).
export const apiGetLatestMoodEntry = async () => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/mood-entries/latest`, { headers }).then((r) => r.json());
};

// "Quiero otra idea": nueva sugerencia sobre el MISMO MoodEntry (responde
// { activity }), en vez de crear un registro nuevo por cada reintento.
export const apiNextSuggestion = async (moodEntryId) => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/mood-entries/${moodEntryId}/suggestion`, {
    method: 'POST',
    headers,
  }).then((r) => r.json());
};


export const apiGetFriendships = async () => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/friendships`, { headers }).then((r) => r.json());
};

export const apiAddFriend = async (qrCode) => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/friendships`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ qrCode }),
  }).then((r) => r.json());
};

export const apiSendCheer = async (friendId, message) => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/friendships/${friendId}/cheer`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message }),
  }).then((r) => r.json());
};

export const apiGetCheers = async () => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/cheers`, { headers }).then((r) => r.json());
};

export const apiGetMessages = async (friendId) => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/messages/${friendId}`, { headers }).then((r) => r.json());
};

export const apiSendMessage = async (friendId, message) => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/messages/${friendId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message }),
  }).then((r) => r.json());
};

export const apiSetMessageReaction = async (friendId, messageId, emoji) => {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/api/messages/${friendId}/${messageId}/reaction`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ emoji }),
  });
  const data = await res.json();
  if (!res.ok || !data?.mensaje) {
    throw new Error(data?.error ?? 'No se pudo guardar la reacción');
  }
  return data;
};

export const apiGetMascota = async (amistadId) => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/mascota/${amistadId}`, { headers }).then((r) => r.json());
};

// Contrato para el botón "La hice" de Con amigos. completionId debe ser
// estable para la misma actividad compartida, de modo que ambos usuarios no
// sumen dos veces si la marcan desde sus dispositivos.
export const apiRegistrarActividadMascota = async (amistadId, completionId) => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/mascota/${amistadId}/actividad`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ completionId }),
  }).then((r) => r.json());
};

export const apiCuidarMascota = async (amistadId) => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/mascota/${amistadId}/cuidado`, {
    method: 'POST', headers,
  }).then((r) => r.json());
};

export const apiIniciarRetoMascota = async (amistadId) => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/mascota/${amistadId}/reto`, {
    method: 'POST', headers,
  }).then((r) => r.json());
};

export const apiProponerNombreMascota = async (amistadId, nombre) => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/mascota/${amistadId}/nombre`, {
    method: 'PATCH', headers, body: JSON.stringify({ nombre }),
  }).then((r) => r.json());
};

export const apiGetUnreadCount = async () => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/messages/unread-count`, { headers }).then((r) => r.json());
};

export const apiGetNotificationPreferences = async () => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/notifications`, { headers }).then((r) => r.json());
};

export const apiRegisterPushToken = async (expoPushToken, timeZone) => {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/api/notifications/token`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ expoPushToken, timeZone }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? 'No se pudo registrar el dispositivo');
  return data;
};

export const apiUnregisterPushToken = async (unregister) => {
  const res = await fetch(`${API_URL}/api/notifications/token/unregister`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(unregister),
  });
  if (!res.ok) throw new Error('No se pudo desvincular el dispositivo');
};

export const apiUpdateNotificationPreferences = async (preferences) => {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/api/notifications/preferences`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(preferences),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? 'No se pudieron guardar las preferencias');
  return data;
};

export const apiGetSocialActivities = async () => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/activities?categoria=social`, { headers }).then((r) => r.json());
};

// Sugerencia social asistida por IA. No envía body: el backend arma el
// contexto exclusivamente con el perfil propio y moods ya visibles.
export const apiSuggestSocialActivity = async () => {
  const token = await getToken();
  const ahora = Date.now();
  if (
    socialSuggestionCache?.token === token &&
    socialSuggestionCache.expiresAt > ahora
  ) {
    return socialSuggestionCache.request;
  }

  const request = fetch(`${API_URL}/api/activities/suggest-social`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok || !data?.activity) {
      throw new Error(data?.error ?? 'Sugerencia social inválida');
    }
    return data;
  });

  socialSuggestionCache = {
    token,
    request,
    expiresAt: ahora + SOCIAL_SUGGESTION_TTL_MS,
  };

  try {
    return await request;
  } catch (error) {
    if (socialSuggestionCache?.request === request) resetSocialSuggestionCache();
    throw error;
  }
};

export const apiGetFriendsCount = async () => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/friendships/count`, { headers }).then((r) => r.json());
};

// Chat de emociones con IA (CONTRATO-GEMINI.md §3). A diferencia del resto,
// LANZA en !res.ok o respuesta malformada: useRetry.ejecutar() detecta el
// fallo por excepción y decide reintento/fallback.
export const apiChatRespond = async (mood, mensaje, historial = [], continuar = false) => {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/api/chat/respond`, {
    method: 'POST',
    headers,
    // `continuar: true` (charla extendida, Fase 9): el backend no fuerza el
    // cierre por conteo. Solo viaja cuando aplica, por compatibilidad.
    body: JSON.stringify({ mood, mensaje, historial, ...(continuar && { continuar: true }) }),
  });
  const data = await res.json();
  if (!res.ok || typeof data?.respuesta !== 'string') {
    throw new Error(data?.error ?? 'Respuesta inválida del chat');
  }
  return data; // { respuesta, fuente, terminar }
};
