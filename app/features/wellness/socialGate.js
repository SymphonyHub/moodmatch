// Regla de bloqueo de la pestaña "Con amigos" del Wellness Hub.
// Encapsula el contrato de FriendsCountContext: null significa DESCONOCIDO
// (sin sesión o cargando) y NUNCA muestra el candado — solo un 0 confirmado
// bloquea. Ver docblock en app/friends/FriendsCountContext.jsx.

export const GATE = {
  CARGANDO: 'cargando',
  BLOQUEADO: 'bloqueado',
  DESBLOQUEADO: 'desbloqueado',
};

export const gateState = (friendsCount) => {
  if (typeof friendsCount !== 'number') return GATE.CARGANDO;
  return friendsCount === 0 ? GATE.BLOQUEADO : GATE.DESBLOQUEADO;
};
