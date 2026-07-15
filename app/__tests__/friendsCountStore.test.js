import { createFriendsCountStore, DEFAULT_TTL_MS } from '../friends/friendsCountStore';

// Fábrica de stores con dependencias falsas: reloj mutable, token controlable
// y fetcher espiable. Cada test arma el escenario que necesita.
function makeStore(overrides = {}) {
  const env = {
    clock: 1_000_000,
    token: 'token-válido',
    fetchCount: jest.fn().mockResolvedValue(3),
    ...overrides,
  };
  const store = createFriendsCountStore({
    fetchCount: env.fetchCount,
    getToken: jest.fn(() => Promise.resolve(env.token)),
    now: () => env.clock,
    ttlMs: env.ttlMs,
  });
  return { store, env };
}

describe('refresh básico', () => {
  test('primer refresh hace fetch y deja ready con timestamp', async () => {
    const { store, env } = makeStore();

    await store.refresh();

    expect(env.fetchCount).toHaveBeenCalledTimes(1);
    expect(store.getState()).toEqual({
      count: 3,
      status: 'ready',
      lastUpdatedAt: env.clock,
    });
  });

  test('estado inicial: count null (desconocido), idle', () => {
    const { store } = makeStore();
    expect(store.getState()).toEqual({ count: null, status: 'idle', lastUpdatedAt: null });
  });
});

describe('caché por TTL', () => {
  test('dentro del TTL, refreshIfStale no vuelve a llamar al fetcher', async () => {
    const { store, env } = makeStore();

    await store.refresh();
    env.clock += DEFAULT_TTL_MS - 1;
    await store.refreshIfStale();

    expect(env.fetchCount).toHaveBeenCalledTimes(1);
  });

  test('pasado el TTL, refreshIfStale sí refetchea', async () => {
    const { store, env } = makeStore();

    await store.refresh();
    env.clock += DEFAULT_TTL_MS + 1;
    await store.refreshIfStale();

    expect(env.fetchCount).toHaveBeenCalledTimes(2);
  });

  test('force salta el TTL fresco', async () => {
    const { store, env } = makeStore();

    await store.refresh();
    env.clock += 1;
    await store.refresh({ force: true });

    expect(env.fetchCount).toHaveBeenCalledTimes(2);
  });
});

describe('dedupe de llamadas en vuelo', () => {
  test('dos refresh concurrentes comparten un solo fetch', async () => {
    let resolveFetch;
    const fetchCount = jest.fn(
      () => new Promise((resolve) => { resolveFetch = resolve; }),
    );
    const { store, env } = makeStore({ fetchCount });

    const p1 = store.refresh();
    const p2 = store.refresh(); // mismo tick, antes de resolver getToken
    // El fetcher arranca un microtask después (tras getToken): drenar hasta entonces.
    while (!resolveFetch) await Promise.resolve();
    resolveFetch(5);
    await Promise.all([p1, p2]);

    expect(env.fetchCount).toHaveBeenCalledTimes(1);
    expect(store.getState().count).toBe(5);
  });

  test('force durante un vuelo devuelve la misma promesa sin segundo fetch', async () => {
    let resolveFetch;
    const fetchCount = jest.fn(
      () => new Promise((resolve) => { resolveFetch = resolve; }),
    );
    const { store, env } = makeStore({ fetchCount });

    const p1 = store.refresh();
    const p2 = store.refresh({ force: true });
    expect(p2).toBe(p1);

    while (!resolveFetch) await Promise.resolve();
    resolveFetch(2);
    await p1;
    expect(env.fetchCount).toHaveBeenCalledTimes(1);
  });
});

describe('gate de sesión (token)', () => {
  test('sin token no hay red y el estado queda limpio', async () => {
    const { store, env } = makeStore({ token: null });

    await store.refresh();

    expect(env.fetchCount).not.toHaveBeenCalled();
    expect(store.getState()).toEqual({ count: null, status: 'idle', lastUpdatedAt: null });
  });

  test('si el token desapareció (logout), un refresh limpia el count previo', async () => {
    const { store, env } = makeStore();

    await store.refresh();
    expect(store.getState().count).toBe(3);

    env.token = null;
    env.clock += DEFAULT_TTL_MS + 1;
    await store.refresh();

    expect(store.getState()).toEqual({ count: null, status: 'idle', lastUpdatedAt: null });
    expect(env.fetchCount).toHaveBeenCalledTimes(1); // solo el primero
  });
});

describe('errores de red', () => {
  test('conserva el count anterior, marca error y reintenta al siguiente refreshIfStale', async () => {
    const fetchCount = jest
      .fn()
      .mockResolvedValueOnce(4)
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValueOnce(6);
    const { store, env } = makeStore({ fetchCount });

    await store.refresh();
    expect(store.getState()).toMatchObject({ count: 4, status: 'ready' });
    const timestampBueno = store.getState().lastUpdatedAt;

    env.clock += DEFAULT_TTL_MS + 1;
    await store.refresh();
    expect(store.getState()).toMatchObject({ count: 4, status: 'error' });
    // lastUpdatedAt no avanzó: el error no se cachea como dato fresco.
    expect(store.getState().lastUpdatedAt).toBe(timestampBueno);

    // Sin mover el reloj: el dato sigue "rancio", así que reintenta ya.
    await store.refreshIfStale();
    expect(store.getState()).toMatchObject({ count: 6, status: 'ready' });
    expect(env.fetchCount).toHaveBeenCalledTimes(3);
  });
});

describe('reset y suscripción', () => {
  test('reset vuelve al estado inicial', async () => {
    const { store } = makeStore();

    await store.refresh();
    store.reset();

    expect(store.getState()).toEqual({ count: null, status: 'idle', lastUpdatedAt: null });
  });

  test('subscribe notifica en cada cambio y la desuscripción lo detiene', async () => {
    const { store } = makeStore();
    const listener = jest.fn();

    const unsubscribe = store.subscribe(listener);
    await store.refresh(); // loading + ready = 2 notificaciones
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    store.reset();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test('el snapshot cambia de referencia solo cuando hay cambio (contrato useSyncExternalStore)', async () => {
    const { store, env } = makeStore();

    const antes = store.getState();
    expect(store.getState()).toBe(antes); // misma referencia sin cambios

    await store.refresh();
    const despues = store.getState();
    expect(despues).not.toBe(antes); // cambió → referencia nueva
    expect(store.getState()).toBe(despues);

    // refreshIfStale con TTL fresco no debe tocar el estado ni su referencia.
    env.clock += 1;
    await store.refreshIfStale();
    expect(store.getState()).toBe(despues);
  });
});
