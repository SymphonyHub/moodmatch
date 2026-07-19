const { resolveJwtSecret, DEV_SECRET } = require('../middleware/auth');

// Guarda y restaura las variables de entorno que toca cada caso, para no
// filtrar estado entre tests ni afectar al resto de la suite.
describe('resolveJwtSecret — endurecimiento del secreto JWT', () => {
  const ENV_ORIGINAL = { NODE_ENV: process.env.NODE_ENV, JWT_SECRET: process.env.JWT_SECRET };

  afterEach(() => {
    process.env.NODE_ENV = ENV_ORIGINAL.NODE_ENV;
    if (ENV_ORIGINAL.JWT_SECRET === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = ENV_ORIGINAL.JWT_SECRET;
  });

  test('en producción sin JWT_SECRET lanza un error claro y no devuelve default', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    expect(() => resolveJwtSecret()).toThrow(/JWT_SECRET no está definida/);
    expect(() => resolveJwtSecret()).toThrow(/Render/);
  });

  test('en producción con JWT_SECRET definida usa ese valor (nunca el default)', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'un-secreto-largo-de-produccion';
    expect(resolveJwtSecret()).toBe('un-secreto-largo-de-produccion');
    expect(resolveJwtSecret()).not.toBe(DEV_SECRET);
  });

  test('en desarrollo sin JWT_SECRET cae al fallback conocido', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;
    expect(resolveJwtSecret()).toBe(DEV_SECRET);
  });

  test('en test (entorno de jest) sin JWT_SECRET cae al fallback — no rompe la suite', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.JWT_SECRET;
    expect(resolveJwtSecret()).toBe(DEV_SECRET);
  });

  test('JWT_SECRET del entorno gana sobre el default también fuera de producción', () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'secreto-local-explicito';
    expect(resolveJwtSecret()).toBe('secreto-local-explicito');
  });
});
