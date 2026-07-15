// Núcleo sin React del conteo global de amigos. La capa React vive en
// FriendsCountContext.jsx; este módulo se testea con jest puro inyectando
// fetchCount/getToken/now. Garantías que dan sentido al diseño:
//   - N consumidores simultáneos = 1 sola llamada (dedupe de promesa en vuelo)
//   - dentro del TTL no hay red (caché por timestamp)
//   - sin token no hay red y el estado queda limpio (cubre logout)

const INITIAL_STATE = {
  count: null, // null = desconocido (sin sesión o aún sin cargar); NO es 0
  status: 'idle', // 'idle' | 'loading' | 'ready' | 'error'
  lastUpdatedAt: null,
};

export const DEFAULT_TTL_MS = 30000;

export function createFriendsCountStore({
  fetchCount,
  getToken,
  ttlMs = DEFAULT_TTL_MS,
  now = Date.now,
}) {
  // Un solo objeto de estado reemplazado inmutablemente en cada cambio:
  // useSyncExternalStore exige que getState() devuelva la misma referencia
  // mientras nada cambió (si no, render loop).
  let state = INITIAL_STATE;
  let inFlight = null;
  const listeners = new Set();

  const setState = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };

  const getState = () => state;

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const refresh = ({ force = false } = {}) => {
    // El dedupe gana incluso a force: la llamada en curso ya traerá el dato.
    if (inFlight) return inFlight;

    const fresh =
      state.lastUpdatedAt !== null && now() - state.lastUpdatedAt < ttlMs;
    if (!force && fresh) return Promise.resolve(state);

    // inFlight se asigna de forma síncrona ANTES de cualquier await: dos
    // refresh() en el mismo tick deben compartir promesa (si se asignara
    // después de resolver el token, ambos pasarían el check de arriba).
    inFlight = (async () => {
      const token = await getToken();
      if (!token) {
        // Sin sesión: estado limpio (descarta cualquier count de una sesión
        // anterior) y cero red.
        setState({ ...INITIAL_STATE });
        return state;
      }

      setState({ status: 'loading' });
      try {
        const count = await fetchCount();
        setState({ count, status: 'ready', lastUpdatedAt: now() });
      } catch {
        // Conserva el último count conocido; lastUpdatedAt no avanza, así el
        // próximo refreshIfStale reintenta en vez de cachear el error.
        setState({ status: 'error' });
      }
      return state;
    })().finally(() => {
      inFlight = null;
    });

    return inFlight;
  };

  const refreshIfStale = () => refresh({ force: false });

  const reset = () => {
    inFlight = null;
    setState({ ...INITIAL_STATE });
  };

  return { getState, subscribe, refresh, refreshIfStale, reset };
}
