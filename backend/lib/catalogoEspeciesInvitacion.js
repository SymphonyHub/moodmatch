// Catálogo de especies para el flujo de invitación (Fase 14, multi-especie).
//
// Este módulo NO es la fuente canónica de especies: esa la posee Agente C
// (Parte B) en su propio `backend/lib/especies.js`, con las siluetas/etapas.
// Aquí solo se necesitan ids + nombres para validar la especie propuesta y
// armar el texto de la notificación de invitación.
//
// Los ids son los canónicos confirmados por C (kebab, sin acentos) y deben
// coincidir uno a uno con su módulo de especies; su orden es además el índice
// del fallback determinista para mascotas legadas — no reordenar ni renombrar.
//
// Plan de integración con C:
//   Cuando el módulo de especies de C (con siluetas/etapas) llegue a esta rama,
//   reemplazar la constante ESPECIES de abajo por un re-export desde ese módulo
//   (p.ej. `const { ESPECIES } = require('./especies');`) para NO mantener dos
//   catálogos que se puedan desincronizar. El resto de este archivo
//   (esEspecieValida / nombreEspecie) queda igual y sigue siendo la interfaz
//   que usa routes/mascota.js.
const ESPECIES = [
  { id: 'polluelo', nombre: 'Polluelo' },
  { id: 'nutria-lunar', nombre: 'Nutria lunar' },
  { id: 'espiritu-calma', nombre: 'Espíritu de calma' },
  { id: 'pinguino', nombre: 'Pingüino' },
  { id: 'perro', nombre: 'Perro' },
  { id: 'dinosaurio', nombre: 'Dinosaurio' },
  { id: 'huevo', nombre: 'Huevo' },
];

const ESPECIE_IDS = new Set(ESPECIES.map((e) => e.id));

const esEspecieValida = (id) => typeof id === 'string' && ESPECIE_IDS.has(id);

const nombreEspecie = (id) => ESPECIES.find((e) => e.id === id)?.nombre ?? 'una mascota';

module.exports = {
  ESPECIES,
  ESPECIE_IDS,
  esEspecieValida,
  nombreEspecie,
};
