// Catálogo de especies para el flujo de invitación (Fase 14, multi-especie).
//
// La FUENTE CANÓNICA de qué especies existen es `./especies` (Parte C): su lista
// de ids es la única verdad y este módulo la reutiliza tal cual en vez de
// mantener una copia que se pueda desincronizar. Aquí solo se añaden los nombres
// de display —dato de presentación que el módulo canónico no tiene— para validar
// la especie propuesta y armar el texto de la notificación de invitación. Si C
// agrega, quita o reordena una especie, esta lista lo sigue sola; solo habría
// que sumar el nombre nuevo al mapa de abajo (con fallback seguro si falta).
const { ESPECIES: IDS_CANONICOS } = require('./especies');

const NOMBRES = {
  polluelo: 'Polluelo',
  'nutria-lunar': 'Nutria lunar',
  'espiritu-calma': 'Espíritu de calma',
  pinguino: 'Pingüino',
  perro: 'Perro',
  dinosaurio: 'Dinosaurio',
  huevo: 'Huevo',
};

const ESPECIES = IDS_CANONICOS.map((id) => ({ id, nombre: NOMBRES[id] ?? 'Mascota' }));

const ESPECIE_IDS = new Set(IDS_CANONICOS);

const esEspecieValida = (id) => typeof id === 'string' && ESPECIE_IDS.has(id);

const nombreEspecie = (id) => NOMBRES[id] ?? 'una mascota';

module.exports = {
  ESPECIES,
  ESPECIE_IDS,
  esEspecieValida,
  nombreEspecie,
};
