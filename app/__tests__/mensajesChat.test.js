import {
  crearOptimista,
  confirmar,
  marcarFallido,
  prepararReintento,
  reconciliar,
  esLocal,
} from '../friends/mensajesChat';

const AHORA = new Date('2026-07-17T15:30:00.000Z');

const servidor = (id, message) => ({
  id, message, mine: false, createdAt: '2026-07-17T15:00:00.000Z',
});

describe('crearOptimista', () => {
  test('nace pending, propio y con id temporal derivado del reloj', () => {
    const m = crearOptimista('hola', AHORA);
    expect(m).toEqual({
      id: `tmp-${AHORA.getTime()}`,
      message: 'hola',
      mine: true,
      pending: true,
      createdAt: AHORA.toISOString(),
    });
    expect(esLocal(m)).toBe(true);
  });
});

describe('confirmar', () => {
  test('reemplaza el optimista por el mensaje real del servidor', () => {
    const temp = crearOptimista('hola', AHORA);
    const real = { id: 42, message: 'hola', mine: true, createdAt: AHORA.toISOString() };
    const lista = confirmar([servidor(1, 'antes'), temp], temp.id, real);
    expect(lista).toEqual([servidor(1, 'antes'), real]);
    expect(esLocal(lista[1])).toBe(false);
  });

  test('no toca otros mensajes', () => {
    const temp = crearOptimista('hola', AHORA);
    const otro = servidor(1, 'antes');
    const lista = confirmar([otro, temp], temp.id, { id: 42, message: 'hola' });
    expect(lista[0]).toBe(otro);
  });
});

describe('marcarFallido / prepararReintento', () => {
  test('el fallo apaga pending y enciende failed sin perder el texto', () => {
    const temp = crearOptimista('mensaje importante', AHORA);
    const [fallido] = marcarFallido([temp], temp.id);
    expect(fallido.pending).toBe(false);
    expect(fallido.failed).toBe(true);
    expect(fallido.message).toBe('mensaje importante');
    expect(esLocal(fallido)).toBe(true);
  });

  test('el reintento vuelve a pending y apaga failed', () => {
    const temp = crearOptimista('hola', AHORA);
    const [fallido] = marcarFallido([temp], temp.id);
    const [reintentando] = prepararReintento([fallido], fallido.id);
    expect(reintentando.pending).toBe(true);
    expect(reintentando.failed).toBe(false);
  });
});

describe('reconciliar (poll del servidor)', () => {
  test('la verdad del servidor reemplaza lo confirmado', () => {
    const prev = [servidor(1, 'viejo')];
    const nuevos = [servidor(1, 'viejo'), servidor(2, 'nuevo')];
    expect(reconciliar(nuevos, prev)).toEqual(nuevos);
  });

  test('preserva pendientes en vuelo al final de la lista', () => {
    const temp = crearOptimista('en vuelo', AHORA);
    const lista = reconciliar([servidor(1, 'a')], [servidor(1, 'a'), temp]);
    expect(lista).toEqual([servidor(1, 'a'), temp]);
  });

  test('preserva fallidos esperando reintento (no se pierde el texto)', () => {
    const temp = crearOptimista('no llegó', AHORA);
    const [fallido] = marcarFallido([temp], temp.id);
    const lista = reconciliar([servidor(1, 'a')], [fallido]);
    expect(lista).toEqual([servidor(1, 'a'), fallido]);
  });

  test('descarta locales ya confirmados que el servidor ahora incluye', () => {
    const confirmado = { id: 42, message: 'hola', mine: true, createdAt: AHORA.toISOString() };
    const lista = reconciliar([servidor(1, 'a'), confirmado], [confirmado]);
    expect(lista).toEqual([servidor(1, 'a'), confirmado]);
  });
});
