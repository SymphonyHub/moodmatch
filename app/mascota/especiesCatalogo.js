// Catálogo de especies para el carrusel de propuesta del flujo de invitación.
//
// La FUENTE CANÓNICA de qué especies existen es `./sprites/especies` (Parte C):
// su lista de ids es la única verdad y este módulo la reutiliza tal cual en vez
// de mantener una copia que se pueda desincronizar. Aquí solo se añaden los datos
// de presentación que el módulo canónico no tiene: el nombre y un emoji chico
// para el carrusel de invitación (las siluetas SVG reales las dibujan
// MascotaSprite/MascotaAnimada). Si C agrega, quita o reordena una especie, esta
// lista lo sigue sola; solo habría que sumar el nombre/emoji nuevo (con fallback
// seguro si falta).
import { ESPECIES as IDS_CANONICOS } from './sprites/especies';

const NOMBRES = {
  polluelo: 'Polluelo',
  'nutria-lunar': 'Nutria lunar',
  'espiritu-calma': 'Espíritu de calma',
  pinguino: 'Pingüino',
  perro: 'Perro',
  dinosaurio: 'Dinosaurio',
  huevo: 'Huevo',
};

const EMOJIS = {
  polluelo: '🐤',
  'nutria-lunar': '🦦',
  'espiritu-calma': '🌙',
  pinguino: '🐧',
  perro: '🐶',
  dinosaurio: '🦕',
  huevo: '🥚',
};

export const ESPECIES = IDS_CANONICOS.map((id) => ({
  id,
  nombre: NOMBRES[id] ?? 'Mascota',
  emoji: EMOJIS[id] ?? '🐾',
}));

export const especiePorId = (id) => ESPECIES.find((e) => e.id === id) ?? null;

export const nombreEspecie = (id) => especiePorId(id)?.nombre ?? 'Mascota';

export const emojiEspecie = (id) => especiePorId(id)?.emoji ?? '🐾';
