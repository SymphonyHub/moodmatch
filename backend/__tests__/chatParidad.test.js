// Paridad entre la réplica CommonJS del backend (lib/tonoCrisis.js) y la
// fuente autoritativa del frontend (app/features/emociones/crisis.js y
// tono.js, propiedad del Agente D). El backend no puede importarlas (ESM vs
// CommonJS), así que este test lee su fuente y falla si las listas o los
// patrones divergen: si D agrega un patrón y la réplica no se actualiza, CI
// lo acusa aquí.

const fs = require('fs');
const path = require('path');
const backend = require('../lib/tonoCrisis');

const EMOCIONES = path.join(__dirname, '..', '..', 'app', 'features', 'emociones');
const srcCrisis = fs.readFileSync(path.join(EMOCIONES, 'crisis.js'), 'utf8');
const srcTono = fs.readFileSync(path.join(EMOCIONES, 'tono.js'), 'utf8');

// Extrae los literales string de un array `const NOMBRE = [...]` del fuente.
function stringsDeArray(src, nombre) {
  const m = src.match(new RegExp(`${nombre} = \\[([\\s\\S]*?)\\];`));
  if (!m) throw new Error(`No se encontró el array ${nombre} en el fuente`);
  return [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1]);
}

// Extrae el `source` de cada regex literal del array PATRONES del fuente.
function patronesDeFuente(src) {
  const m = src.match(/PATRONES = \[([\s\S]*?)\];/);
  if (!m) throw new Error('No se encontró PATRONES en crisis.js');
  return [...m[1].matchAll(/^\s*\/(.+)\/,/gm)].map((x) => x[1]);
}

describe('paridad con app/features/emociones/crisis.js', () => {
  test('los patrones de crisis son exactamente los mismos', () => {
    const frontend = patronesDeFuente(srcCrisis);
    const replica = backend.PATRONES.map((p) => p.source);
    expect(replica).toEqual(frontend);
  });

  test('MENSAJE_CRISIS es idéntico', () => {
    const m = srcCrisis.match(/MENSAJE_CRISIS =([\s\S]*?);/);
    const frontend = [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1]).join('');
    expect(backend.MENSAJE_CRISIS).toBe(frontend);
  });

  test('normalizar se comporta igual que la del frontend (tildes y eñes fuera)', () => {
    expect(backend.normalizar('Añoro la CANCIÓN de ayer')).toBe('anoro la cancion de ayer');
    expect(backend.normalizar(null)).toBe('');
  });

  test('detectarCrisis replica los positivos y negativos del frontend', () => {
    expect(backend.detectarCrisis('me quiero hacer daño')).toBe(true);
    expect(backend.detectarCrisis('quiero desaparecer')).toBe(true);
    // Frases por patrón, nunca palabras sueltas (docblock de crisis.js):
    expect(backend.detectarCrisis('estoy muerto de risa')).toBe(false);
    expect(backend.detectarCrisis('me muero de cansancio')).toBe(false);
  });
});

describe('paridad con app/features/emociones/tono.js', () => {
  test.each([
    ['MOODS_DIFICILES'],
    ['LISTA_NEGRA_UNIVERSAL'],
    ['LISTA_NEGRA_POSITIVIDAD'],
  ])('%s es idéntica', (nombre) => {
    expect(backend[nombre]).toEqual(stringsDeArray(srcTono, nombre));
  });
});
