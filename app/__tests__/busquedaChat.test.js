import {
  buscarEnMensajes,
  moverResultado,
  normalizarBusqueda,
} from '../friends/busquedaChat';

const mensajes = [
  { id: 1, message: '¿Tomamos café mañana?' },
  { id: 2, message: '[[mm:salida]] Caminemos por el parque' },
  { id: 3, message: 'El CAFE estuvo buenísimo', failed: true },
];

describe('búsqueda dentro del chat', () => {
  test('ignora mayúsculas y diacríticos', () => {
    expect(normalizarBusqueda('  ÁNIMO  ')).toBe('animo');
    expect(buscarEnMensajes(mensajes, 'cafe')).toEqual([0, 2]);
  });

  test('busca el texto visible de invitaciones, sin depender del sentinel', () => {
    expect(buscarEnMensajes(mensajes, 'caminemos')).toEqual([1]);
    expect(buscarEnMensajes(mensajes, 'mm:salida')).toEqual([]);
  });

  test('incluye mensajes locales fallidos y consulta vacía no coincide', () => {
    expect(buscarEnMensajes(mensajes, 'buenisimo')).toEqual([2]);
    expect(buscarEnMensajes(mensajes, '  ')).toEqual([]);
  });

  test('navega circularmente entre resultados', () => {
    expect(moverResultado(3, 0, -1)).toBe(2);
    expect(moverResultado(3, 2, 1)).toBe(0);
    expect(moverResultado(0, 4, 1)).toBe(0);
  });
});
