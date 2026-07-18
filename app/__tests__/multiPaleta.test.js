import {
  DEFAULT_CUSTOM_CONFIG,
  DEFAULT_CUSTOM_THEME,
  MAX_PALETAS,
  NAME_MAX,
  isValidPalette,
  isValidCustomTheme,
  normalizeCustomTheme,
  activePalette,
  configDe,
  upsertPalette,
  removePalette,
  setActive,
} from '../theme/customTheme';

const paleta = (id, extra = {}) => ({
  id,
  name: 'Mi paleta',
  ...DEFAULT_CUSTOM_CONFIG,
  ...extra,
});

const contenedor = (...ids) => ({
  activeId: ids[0],
  palettes: ids.map((id) => paleta(id)),
});

describe('isValidPalette', () => {
  test('acepta una paleta con id, name y los 4 campos', () => {
    expect(isValidPalette(paleta('p1'))).toBe(true);
  });

  test.each([
    ['sin id', { name: 'x', ...DEFAULT_CUSTOM_CONFIG }],
    ['id vacío', paleta('')],
    ['name vacío', paleta('p1', { name: '   ' })],
    ['name muy largo', paleta('p1', { name: 'x'.repeat(NAME_MAX + 1) })],
    ['hex malo', paleta('p1', { primary: '#zzz' })],
    ['clave extra', { ...paleta('p1'), sorpresa: 1 }],
  ])('rechaza %s', (_caso, value) => {
    expect(isValidPalette(value)).toBe(false);
  });
});

describe('isValidCustomTheme (contenedor)', () => {
  test('acepta el contenedor por defecto y uno de varias paletas', () => {
    expect(isValidCustomTheme(DEFAULT_CUSTOM_THEME)).toBe(true);
    expect(isValidCustomTheme(contenedor('a', 'b', 'c'))).toBe(true);
  });

  test.each([
    ['null', null],
    ['array', []],
    ['sin palettes', { activeId: 'a' }],
    ['palettes vacío', { activeId: 'a', palettes: [] }],
    ['activeId ausente entre ids', { activeId: 'z', palettes: [paleta('a')] }],
    ['ids duplicados', { activeId: 'a', palettes: [paleta('a'), paleta('a')] }],
    [
      'excede el máximo',
      {
        activeId: 'p0',
        palettes: Array.from({ length: MAX_PALETAS + 1 }, (_, i) => paleta(`p${i}`)),
      },
    ],
  ])('rechaza %s', (_caso, value) => {
    expect(isValidCustomTheme(value)).toBe(false);
  });
});

describe('normalizeCustomTheme', () => {
  test('migra el objeto legacy de 4 claves a un contenedor de una paleta', () => {
    const migrado = normalizeCustomTheme(DEFAULT_CUSTOM_CONFIG);
    expect(isValidCustomTheme(migrado)).toBe(true);
    expect(migrado.palettes).toHaveLength(1);
    expect(configDe(migrado.palettes[0])).toEqual(DEFAULT_CUSTOM_CONFIG);
    expect(migrado.activeId).toBe(migrado.palettes[0].id);
  });

  test('deja pasar un contenedor válido y descarta basura', () => {
    const c = contenedor('a', 'b');
    expect(normalizeCustomTheme(c)).toBe(c);
    expect(normalizeCustomTheme(null)).toBeNull();
    expect(normalizeCustomTheme({ primary: '#fff' })).toBeNull();
  });
});

describe('activePalette', () => {
  test('devuelve la config (sin id/name) de la paleta activa', () => {
    const c = { activeId: 'b', palettes: [paleta('a'), paleta('b', { primary: '#123456' })] };
    expect(activePalette(c)).toEqual({ ...DEFAULT_CUSTOM_CONFIG, primary: '#123456' });
  });

  test('null si el contenedor es inválido', () => {
    expect(activePalette(null)).toBeNull();
  });
});

describe('operaciones puras del contenedor', () => {
  test('upsertPalette agrega una nueva y la deja activa', () => {
    const c = contenedor('a');
    const next = upsertPalette(c, paleta('b'));
    expect(next.palettes.map((p) => p.id)).toEqual(['a', 'b']);
    expect(next.activeId).toBe('b');
  });

  test('upsertPalette edita una existente y conserva la activa', () => {
    const c = { activeId: 'a', palettes: [paleta('a'), paleta('b')] };
    const next = upsertPalette(c, paleta('b', { primary: '#010101' }));
    expect(next.activeId).toBe('a');
    expect(next.palettes.find((p) => p.id === 'b').primary).toBe('#010101');
    expect(next.palettes).toHaveLength(2);
  });

  test('upsertPalette respeta el tope MAX_PALETAS al agregar', () => {
    const c = {
      activeId: 'p0',
      palettes: Array.from({ length: MAX_PALETAS }, (_, i) => paleta(`p${i}`)),
    };
    expect(upsertPalette(c, paleta('nueva'))).toBe(c);
  });

  test('removePalette nunca deja el contenedor sin paletas', () => {
    const c = contenedor('a');
    expect(removePalette(c, 'a')).toBe(c);
  });

  test('removePalette mueve la activa a la primera restante', () => {
    const c = { activeId: 'b', palettes: [paleta('a'), paleta('b'), paleta('c')] };
    const next = removePalette(c, 'b');
    expect(next.palettes.map((p) => p.id)).toEqual(['a', 'c']);
    expect(next.activeId).toBe('a');
  });

  test('setActive cambia la activa solo si la paleta existe', () => {
    const c = contenedor('a', 'b');
    expect(setActive(c, 'b').activeId).toBe('b');
    expect(setActive(c, 'z')).toBe(c);
  });
});
