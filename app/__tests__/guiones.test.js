import {
  GUIONES,
  SALUDO,
  DESPEDIDA,
  ERROR_ENTRADA,
  SUGERENCIA,
} from '../features/emociones/guiones';
import { normalizar } from '../features/emociones/crisis';
import { MOOD_KEYS } from '../theme/tokens';

const MOODS_DIFICILES = ['TRISTE', 'ANSIOSO', 'ENOJADO'];

// Frases prohibidas en TODO el guion (minimización y diagnóstico),
// comparadas sin tildes ni mayúsculas.
const LISTA_NEGRA_UNIVERSAL = [
  'no es para tanto',
  'podria ser peor',
  'hay gente peor',
  'no te preocupes',
  'exagera', // cubre "exageras", "exageración"
  'depresion',
  'trastorno',
  'diagnos',
  'deberias sentirte',
];

// Positividad forzada: prohibida en las emociones difíciles.
const LISTA_NEGRA_POSITIVIDAD = [
  'animate',
  'alegrate',
  'sonrie',
  'piensa positivo',
  'piensa en positivo',
  'mira el lado bueno',
  'todo pasa por algo',
  'se feliz',
  'calmate',
  'relajate',
  'no estes triste',
  'todo va a estar bien',
];

function textosBotDe(guion) {
  return Object.values(guion.pasos).flatMap((paso) => paso.bot);
}

describe('integridad estructural de los guiones', () => {
  test('existen las 6 emociones del contrato de temas', () => {
    expect(Object.keys(GUIONES).sort()).toEqual([...MOOD_KEYS].sort());
  });

  Object.entries(GUIONES).forEach(([mood, guion]) => {
    describe(mood, () => {
      test('el paso inicial existe', () => {
        expect(guion.pasos[guion.pasoInicial]).toBeDefined();
      });

      test('tiene paso cierre que lleva a la sugerencia', () => {
        expect(guion.pasos.cierre).toBeDefined();
        expect(guion.pasos.cierre.next).toBe(SUGERENCIA);
      });

      test('cada paso tiene al menos 2 variantes bot no vacías', () => {
        Object.entries(guion.pasos).forEach(([, paso]) => {
          expect(paso.bot.length).toBeGreaterThanOrEqual(2);
          paso.bot.forEach((texto) => {
            expect(typeof texto).toBe('string');
            expect(texto.trim().length).toBeGreaterThan(0);
          });
        });
      });

      test('todo next y textoLibreNext apunta a un paso existente', () => {
        Object.values(guion.pasos).forEach((paso) => {
          (paso.quickReplies ?? []).forEach((reply) => {
            expect(guion.pasos[reply.next]).toBeDefined();
          });
          if (paso.textoLibre) {
            expect(guion.pasos[paso.textoLibreNext]).toBeDefined();
          }
          if (paso.next) expect(paso.next).toBe(SUGERENCIA);
        });
      });

      test('el cierre es alcanzable desde el paso inicial', () => {
        const visitados = new Set();
        const cola = [guion.pasoInicial];
        while (cola.length) {
          const id = cola.pop();
          if (visitados.has(id)) continue;
          visitados.add(id);
          const paso = guion.pasos[id];
          (paso.quickReplies ?? []).forEach((r) => cola.push(r.next));
          if (paso.textoLibre) cola.push(paso.textoLibreNext);
        }
        expect(visitados.has('cierre')).toBe(true);
      });

      test('los pasos con quick replies ofrecen entre 2 y 4 opciones', () => {
        Object.values(guion.pasos).forEach((paso) => {
          if (paso.quickReplies) {
            expect(paso.quickReplies.length).toBeGreaterThanOrEqual(2);
            expect(paso.quickReplies.length).toBeLessThanOrEqual(4);
          }
        });
      });
    });
  });
});

describe('reglas de tono (mecánicas)', () => {
  const textosCompartidos = [...SALUDO, ...DESPEDIDA, ...ERROR_ENTRADA];

  test('ningún texto del guion minimiza ni diagnostica', () => {
    const todos = [
      ...textosCompartidos,
      ...Object.values(GUIONES).flatMap(textosBotDe),
    ];
    todos.forEach((texto) => {
      const n = normalizar(texto);
      LISTA_NEGRA_UNIVERSAL.forEach((prohibida) => {
        expect(n).not.toContain(prohibida);
      });
    });
  });

  MOODS_DIFICILES.forEach((mood) => {
    test(`${mood}: sin positividad forzada`, () => {
      textosBotDe(GUIONES[mood]).forEach((texto) => {
        const n = normalizar(texto);
        LISTA_NEGRA_POSITIVIDAD.forEach((prohibida) => {
          expect(n).not.toContain(prohibida);
        });
      });
    });
  });
});
