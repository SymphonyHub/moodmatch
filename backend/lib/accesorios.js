// Accesorios cosméticos de la mascota (Fase 14, Parte C). Dos categorías:
// "cabeza" (gorro/moño/corona/flor) y "color" (patrón/aura sobre el cuerpo).
// Nunca comprables: se desbloquean por nivel de cariño o por hitos del
// historial. El backend es la autoridad del desbloqueo; el frontend solo
// renderiza el overlay por id. Catálogo cerrado (no configurable).

const ACCESORIOS = [
  { id: 'gorrito', categoria: 'cabeza', nombre: 'Gorrito', nivel: 6 },
  { id: 'bufanda', categoria: 'cabeza', nombre: 'Bufanda', nivel: 16 },
  { id: 'corona', categoria: 'cabeza', nombre: 'Corona', nivel: 36 },
  // Se gana al completar el primer reto cooperativo (deja un hito con "Completaron").
  { id: 'flor', categoria: 'cabeza', nombre: 'Flor', hito: 'Completaron' },
  { id: 'lunares', categoria: 'color', nombre: 'Lunares', nivel: 10 },
  { id: 'estrellas', categoria: 'color', nombre: 'Estrellas', nivel: 24 },
  { id: 'aura', categoria: 'color', nombre: 'Aura', nivel: 40 },
];

const PORE_ID = new Map(ACCESORIOS.map((a) => [a.id, a]));

const CATEGORIAS = ['cabeza', 'color'];

function derivarDesbloqueados(nivelCarino = 0, historialHitos = []) {
  const nivel = Math.max(0, Number.isFinite(nivelCarino) ? nivelCarino : 0);
  const hitos = Array.isArray(historialHitos) ? historialHitos : [];
  return ACCESORIOS.filter((a) => {
    if (typeof a.nivel === 'number') return nivel >= a.nivel;
    if (a.hito) return hitos.some((h) => typeof h?.hito === 'string' && h.hito.includes(a.hito));
    return false;
  }).map((a) => a.id);
}

// Valida que un id equipable exista, sea de la categoría indicada y esté en el
// set desbloqueado. `null` (desequipar) siempre es válido.
function puedeEquipar(id, categoria, desbloqueados) {
  if (id === null) return true;
  const acc = PORE_ID.get(id);
  if (!acc || acc.categoria !== categoria) return false;
  return desbloqueados.includes(id);
}

module.exports = {
  ACCESORIOS,
  CATEGORIAS,
  derivarDesbloqueados,
  puedeEquipar,
};
