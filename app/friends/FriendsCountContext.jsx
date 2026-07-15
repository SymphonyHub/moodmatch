// Contexto global de cantidad de amigos (Fase 6 — base del Wellness Hub).
//
// CONTRATO DE CONSUMO (agentes A y C, leer antes de usar):
//
//   const { friendsCount, status, refreshIfStale, refresh } = useFriendsCount();
//
// - `friendsCount === null` significa DESCONOCIDO (sin sesión o aún cargando),
//   NO cero. Bloquear la pestaña "Con amigos" solo con `friendsCount === 0`;
//   con null, mostrar estado neutro/carga — nunca el candado por un null
//   transitorio.
// - En cada pantalla que dependa del conteo:
//     useFocusEffect(useCallback(() => { refreshIfStale(); }, [refreshIfStale]));
//   El TTL (30 s) + el dedupe de promesa en vuelo garantizan que N pantallas
//   enfocándose a la vez producen como máximo 1 llamada al backend.
// - Tras un apiAddFriend exitoso: `refresh({ force: true })`.
// - No llamar apiGetFriendsCount/apiGetFriendships directo para contar:
//   siempre a través de este hook, o se pierde la garantía de no duplicar.
// - `reset()` está disponible para el flujo de logout. Edge case documentado:
//   logout+login con OTRO usuario en <30 s puede mostrar un count rancio un
//   instante; el store se autolimpia al detectar token ausente en el
//   siguiente refresh.
import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { apiGetFriendsCount, apiGetFriendships, getToken } from '../services/api';
import { createFriendsCountStore } from './friendsCountStore';

// Fetcher con fallback: si el backend aún no expone /count (build viejo en
// Render durante la ventana de deploy), cae al GET grande y cuenta.
async function fetchFriendsCount() {
  const data = await apiGetFriendsCount().catch(() => null);
  if (data && typeof data.count === 'number') return data.count;

  const completo = await apiGetFriendships();
  if (Array.isArray(completo?.amigos)) return completo.amigos.length;

  throw new Error('friendsCount no disponible');
}

const FriendsCountContext = createContext(null);

export function FriendsCountProvider({ children, store: injectedStore }) {
  // Una sola instancia por provider; `store` inyectable para tests.
  const storeRef = useRef(null);
  if (storeRef.current === null) {
    storeRef.current =
      injectedStore ?? createFriendsCountStore({ fetchCount: fetchFriendsCount, getToken });
  }
  const store = storeRef.current;

  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);

  // Calienta el caché al montar; sin sesión es un no-op sin red (gate en el store).
  useEffect(() => {
    store.refreshIfStale();
  }, [store]);

  // Volver del background: los useFocusEffect de los consumidores no se
  // re-disparan si la pantalla ya estaba enfocada — este es el único punto
  // que cubre ese hueco. Respeta el TTL, así que en general no cuesta red.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') store.refreshIfStale();
    });
    return () => sub.remove();
  }, [store]);

  const value = useMemo(
    () => ({
      friendsCount: state.count,
      status: state.status,
      lastUpdatedAt: state.lastUpdatedAt,
      refresh: store.refresh,
      refreshIfStale: store.refreshIfStale,
      reset: store.reset,
    }),
    [state, store],
  );

  return <FriendsCountContext.Provider value={value}>{children}</FriendsCountContext.Provider>;
}

export function useFriendsCount() {
  const ctx = useContext(FriendsCountContext);
  if (!ctx) throw new Error('useFriendsCount debe usarse dentro de <FriendsCountProvider>');
  return ctx;
}
