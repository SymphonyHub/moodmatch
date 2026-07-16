import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

// Exportado para que los stores de datos (p.ej. friendsCountStore) gateen
// por sesión sin duplicar la clave de AsyncStorage.
export const getToken = () => AsyncStorage.getItem('token');

const authHeaders = async () => {
  const token = await getToken();
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

export const apiCreateMoodEntry = async (moodType, nota = null) => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/mood-entries`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ moodType, nota }),
  }).then((r) => r.json());
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

export const apiGetUnreadCount = async () => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/messages/unread-count`, { headers }).then((r) => r.json());
};

export const apiGetSocialActivities = async () => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/activities?categoria=social`, { headers }).then((r) => r.json());
};

export const apiGetFriendsCount = async () => {
  const headers = await authHeaders();
  return fetch(`${API_URL}/api/friendships/count`, { headers }).then((r) => r.json());
};
