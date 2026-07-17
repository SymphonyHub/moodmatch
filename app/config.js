// URL base del backend en producción (Render). Única fuente: todos los
// fetch del frontend (services/api.js) y los links de invitación la importan
// de aquí. No hay overrides por variables de entorno: para apuntar a un
// backend local durante desarrollo hay que editar este valor a mano — y no
// commitearlo.
export const API_URL = 'https://moodmatch-0x2q.onrender.com';
