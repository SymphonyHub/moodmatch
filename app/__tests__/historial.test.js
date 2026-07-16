import {
  analizarPatron,
  mensajeResumen,
  agruparPorDia,
  horaCorta,
  MENSAJES_PATRON,
  RUTA_HISTORIAL,
  MIN_REGISTROS,
} from '../features/wellness/historial';
import { normalizar } from '../features/emociones/crisis';
import { MOOD_KEYS } from '../theme/tokens';

const AHORA = new Date('2026-07-15T12:00:00.000Z').getTime();
const DIA_MS = 24 * 60 * 60 * 1000;

// entry a `dias` días (y `horas` extra) antes de AHORA
const hace = (dias, moodType, extra = {}) => ({
  id: Math.floor(Math.random() * 10000),
  moodType,
  nota: null,
  createdAt: new Date(AHORA - dias * DIA_MS).toISOString(),
  ...extra,
});

describe('analizarPatron — ventana y mínimo', () => {
  test('0, 1 y 2 registros en ventana → insuficiente, aunque haya muchos viejos', () => {
    const viejos = Array.from({ length: 10 }, () => hace(10, 'TRISTE'));
    expect(analizarPatron([], AHORA).tipo).toBe('insuficiente');
    expect(analizarPatron([...viejos, hace(1, 'FELIZ')], AHORA).tipo).toBe('insuficiente');
    expect(analizarPatron([...viejos, hace(1, 'FELIZ'), hace(2, 'FELIZ')], AHORA).tipo)
      .toBe('insuficiente');
  });

  test('una entry a 8 días queda fuera; el borde exacto de 7 días queda dentro', () => {
    const base = [hace(0, 'FELIZ'), hace(1, 'FELIZ')];
    // La tercera justo en el borde: cuenta → positivo.
    const conBorde = analizarPatron([...base, hace(7, 'CALMADO')], AHORA);
    expect(conBorde.total).toBe(3);
    expect(conBorde.tipo).toBe('positivo');
    // A 8 días: fuera → insuficiente.
    const conVieja = analizarPatron([...base, hace(8, 'CALMADO')], AHORA);
    expect(conVieja.total).toBe(2);
    expect(conVieja.tipo).toBe('insuficiente');
  });

  test('conteos trae siempre las 6 claves y su suma es el total', () => {
    const { conteos, total } = analizarPatron(
      [hace(0, 'FELIZ'), hace(1, 'TRISTE'), hace(2, 'TRISTE'), hace(9, 'ENOJADO')],
      AHORA,
    );
    expect(Object.keys(conteos).sort()).toEqual([...MOOD_KEYS].sort());
    expect(Object.values(conteos).reduce((a, b) => a + b, 0)).toBe(total);
    expect(total).toBe(3);
    expect(conteos.TRISTE).toBe(2);
    expect(conteos.ENOJADO).toBe(0);
  });
});

describe('analizarPatron — clasificación', () => {
  test('60% exacto positivo: 3 de 5 FELIZ/CALMADO → positivo', () => {
    const entries = [
      hace(0, 'FELIZ'), hace(1, 'CALMADO'), hace(2, 'FELIZ'),
      hace(3, 'TRISTE'), hace(4, 'NEUTRO'),
    ];
    expect(analizarPatron(entries, AHORA).tipo).toBe('positivo');
  });

  test('60% exacto difícil: 3 de 5 TRISTE/ANSIOSO/ENOJADO → dificil', () => {
    const entries = [
      hace(0, 'TRISTE'), hace(1, 'ANSIOSO'), hace(2, 'ENOJADO'),
      hace(3, 'FELIZ'), hace(4, 'NEUTRO'),
    ];
    expect(analizarPatron(entries, AHORA).tipo).toBe('dificil');
  });

  test('bajo el umbral por ambos lados → mixto', () => {
    const entries = [
      hace(0, 'FELIZ'), hace(1, 'CALMADO'),
      hace(2, 'NEUTRO'), hace(3, 'TRISTE'),
    ];
    expect(analizarPatron(entries, AHORA).tipo).toBe('mixto');
  });

  test('mayoría NEUTRO → mixto (lo neutro no es racha positiva ni difícil)', () => {
    const entries = [
      hace(0, 'NEUTRO'), hace(1, 'NEUTRO'), hace(2, 'NEUTRO'),
      hace(3, 'FELIZ'), hace(4, 'TRISTE'),
    ];
    expect(analizarPatron(entries, AHORA).tipo).toBe('mixto');
  });
});

describe('mensajeResumen', () => {
  test('es determinista y pertenece a las variantes del tipo', () => {
    const analisis = analizarPatron(
      [hace(0, 'TRISTE'), hace(1, 'TRISTE'), hace(2, 'ANSIOSO')],
      AHORA,
    );
    const mensaje = mensajeResumen(analisis);
    expect(mensajeResumen(analisis)).toBe(mensaje);
    expect(MENSAJES_PATRON.dificil).toContain(mensaje);
  });

  test('la variante rota con el total', () => {
    const variantes = new Set();
    for (let total = 0; total < MENSAJES_PATRON.mixto.length; total += 1) {
      variantes.add(mensajeResumen({ tipo: 'mixto', total }));
    }
    expect(variantes.size).toBe(MENSAJES_PATRON.mixto.length);
  });
});

describe('reglas de tono de los mensajes (mecánicas)', () => {
  const LISTA_NEGRA_UNIVERSAL = [
    'no es para tanto',
    'podria ser peor',
    'hay gente peor',
    'no te preocupes',
    'exagera',
    'depresion',
    'trastorno',
    'diagnos',
    'deberias sentirte',
  ];

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

  test('estructura: 4 tipos con al menos 2 variantes no vacías', () => {
    expect(Object.keys(MENSAJES_PATRON).sort())
      .toEqual(['dificil', 'insuficiente', 'mixto', 'positivo']);
    Object.values(MENSAJES_PATRON).forEach((variantes) => {
      expect(variantes.length).toBeGreaterThanOrEqual(2);
      variantes.forEach((t) => expect(t.trim().length).toBeGreaterThan(0));
    });
  });

  test('ningún mensaje de ningún tipo minimiza, diagnostica ni fuerza positividad', () => {
    Object.values(MENSAJES_PATRON).flat().forEach((texto) => {
      const n = normalizar(texto);
      [...LISTA_NEGRA_UNIVERSAL, ...LISTA_NEGRA_POSITIVIDAD].forEach((prohibida) => {
        expect(n).not.toContain(prohibida);
      });
    });
  });

  test('los mensajes de racha difícil validan sin CTA imperativa: mencionan Para mí en condicional', () => {
    MENSAJES_PATRON.dificil.forEach((texto) => {
      expect(normalizar(texto)).toContain('para mi');
    });
  });
});

describe('agruparPorDia y horaCorta', () => {
  test('agrupa Hoy / Ayer / fecha, preservando el orden descendente', () => {
    const entries = [
      hace(0, 'FELIZ', { id: 4 }),
      hace(0.2, 'NEUTRO', { id: 3 }),
      hace(1, 'TRISTE', { id: 2 }),
      hace(5, 'CALMADO', { id: 1 }),
    ];
    const secciones = agruparPorDia(entries, AHORA);
    expect(secciones.map((s) => s.titulo)).toEqual(['Hoy', 'Ayer', '10 de julio']);
    expect(secciones[0].data.map((e) => e.id)).toEqual([4, 3]);
    expect(secciones[1].data.map((e) => e.id)).toEqual([2]);
  });

  test('sin registros devuelve lista vacía de secciones', () => {
    expect(agruparPorDia([], AHORA)).toEqual([]);
  });

  test('horaCorta formatea HH:MM local con padding', () => {
    const fecha = new Date(AHORA);
    fecha.setHours(9, 5, 0, 0);
    expect(horaCorta(fecha.toISOString())).toBe('09:05');
    expect(horaCorta('no-es-fecha')).toBe('');
  });
});

describe('constantes', () => {
  test('la ruta del historial es absoluta y el mínimo es el acordado', () => {
    expect(RUTA_HISTORIAL.startsWith('/')).toBe(true);
    expect(MIN_REGISTROS).toBe(3);
  });
});
