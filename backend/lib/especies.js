// Catálogo cerrado de especies de mascota (Fase 14, Parte C). Es la lista de
// ids acordada; el diseño visual de cada silueta vive en el frontend
// (app/mascota/sprites/especies.js).
//
// FUENTE DE VERDAD de la especie de cada mascota: el campo
// MascotaAmistad.especie, que persiste la especie acordada por ambos amigos
// mediante el flujo de negociación de Agente A (Parte A).
//
// derivarEspecie() de abajo NO es el comportamiento general: es solo un FALLBACK
// determinista para las mascotas creadas antes de Fase 14, que quedan con
// `especie: null` tras el backfill de Fase 0. Para esas pocas mascotas legadas
// da una especie estable por amistad (misma amistad → misma especie) en vez de
// dejarlas sin sprite. Una mascota con especie negociada NUNCA pasa por aquí.

const ESPECIES = [
  'polluelo',
  'nutria-lunar',
  'espiritu-calma',
  'pinguino',
  'perro',
  'dinosaurio',
  'huevo',
];

// Hash entero de 32 bits (Math.imul → determinista y bien definido) para
// repartir amistadIds consecutivos por todo el catálogo en vez de agruparlos.
function derivarEspecie(amistadId) {
  const n = Number(amistadId);
  if (!Number.isInteger(n) || n <= 0) return ESPECIES[0];
  let h = Math.imul(n, 2654435761);
  h = (h ^ (h >>> 13)) >>> 0;
  return ESPECIES[h % ESPECIES.length];
}

module.exports = { ESPECIES, derivarEspecie };
