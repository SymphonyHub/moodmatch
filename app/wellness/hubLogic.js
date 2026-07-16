// Lógica pura del Wellness Hub (testeable sin render en __tests__/wellnessHub.test.js).

// Pestañas internas del Hub. Los ids son contrato para los agentes B y C:
// B llena el panel 'para-mi', C llena 'con-amigos'.
export const HUB_TABS = [
  { id: 'para-mi', label: 'Para mí' },
  { id: 'con-amigos', label: 'Con amigos' },
];

// Regla de bloqueo de la pestaña social según el contrato de useFriendsCount
// (app/friends/FriendsCountContext.jsx): null/undefined = DESCONOCIDO (sesión
// ausente o cargando), NUNCA se bloquea por un null transitorio; el candado
// aparece únicamente con 0 amigos confirmados.
export function lockStateFor(friendsCount) {
  if (friendsCount === null || friendsCount === undefined) return 'unknown';
  return friendsCount === 0 ? 'locked' : 'unlocked';
}
