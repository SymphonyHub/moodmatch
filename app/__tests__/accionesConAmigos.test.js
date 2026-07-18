import {
  tipoDeAccion,
  elegirSugerencia,
  MENSAJES_PRECARGA,
  ANIMOS_DIFICILES,
} from '../friends/accionesConAmigos';

describe('tipoDeAccion (mapeo nombre → tipo)', () => {
  test('las 3 acciones sociales canónicas mapean a su tipo', () => {
    expect(tipoDeAccion('Salida con amigos')).toBe('salida');
    expect(tipoDeAccion('Escribe a alguien que aprecias')).toBe('aprecias');
    expect(tipoDeAccion('Comparte tu energía positiva')).toBe('energia');
  });

  test('un nombre desconocido → null (cae en tarjeta informativa)', () => {
    expect(tipoDeAccion('Cocina para alguien')).toBeNull();
    expect(tipoDeAccion(undefined)).toBeNull();
  });
});

describe('elegirSugerencia (guardrail: solo moodReciente)', () => {
  const amigo = (nombre, moodReciente) => ({
    id: nombre, nombre, moodReciente, unread: 0, fechaReciente: null,
  });

  test('sugiere al amigo con ánimo difícil', () => {
    const amigos = [amigo('Ana', 'FELIZ'), amigo('Beto', 'TRISTE'), amigo('Cira', 'CALMADO')];
    expect(elegirSugerencia(amigos).nombre).toBe('Beto');
  });

  test.each(ANIMOS_DIFICILES)('reconoce %s como ánimo difícil', (mood) => {
    expect(elegirSugerencia([amigo('X', mood)]).nombre).toBe('X');
  });

  test('sin ningún ánimo difícil → null', () => {
    const amigos = [amigo('Ana', 'FELIZ'), amigo('Cira', 'CALMADO'), amigo('Dux', 'NEUTRO')];
    expect(elegirSugerencia(amigos)).toBeNull();
  });

  test('ignora amigos sin ánimo registrado', () => {
    const amigos = [amigo('Ana', null), amigo('Beto', 'ANSIOSO')];
    expect(elegirSugerencia(amigos).nombre).toBe('Beto');
  });

  test('el primero en la lista gana ante varios difíciles', () => {
    const amigos = [amigo('Ana', 'ENOJADO'), amigo('Beto', 'TRISTE')];
    expect(elegirSugerencia(amigos).nombre).toBe('Ana');
  });

  test('lista vacía o no-array → null', () => {
    expect(elegirSugerencia([])).toBeNull();
    expect(elegirSugerencia(null)).toBeNull();
  });
});

describe('MENSAJES_PRECARGA', () => {
  test('aprecias es un texto cálido no vacío, sin sentinel', () => {
    expect(typeof MENSAJES_PRECARGA.aprecias).toBe('string');
    expect(MENSAJES_PRECARGA.aprecias.length).toBeGreaterThan(0);
    expect(MENSAJES_PRECARGA.aprecias).not.toContain('[[mm');
  });

  test('energia personaliza con el nombre y funciona sin él', () => {
    expect(MENSAJES_PRECARGA.energia('Marcos')).toContain('Marcos');
    expect(MENSAJES_PRECARGA.energia('')).not.toContain('  ');
  });
});
