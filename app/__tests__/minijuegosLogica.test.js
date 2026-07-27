import {
  ATRAPALA,
  RITMO_CARINO,
  SLUG_ATRAPALA,
  SLUG_RITMO_CARINO,
  TIPOS_MINIJUEGO,
  SLUGS_MINIJUEGO,
  MINIJUEGOS,
  esTipoMinijuego,
  esSlugMinijuego,
  slugDeTipo,
  tipoDeSlug,
  modoAccesibleMinijuego,
  ATRAPALA_OPORTUNIDADES,
  ATRAPALA_VENTANA_MS,
  ATRAPALA_VENTANA_REDUCIDA_MS,
  ATRAPALA_PAUSA_MS,
  posicionAleatoriaAtrapala,
  RITMO_IDA_MS,
  RITMO_CICLO_MS,
  RITMO_RONDAS,
  RITMO_PASO_REDUCIDO_MS,
  RITMO_PASOS_REDUCIDOS,
  posicionRitmo,
  RITMO_CENTRO,
  RITMO_ZONA_OBJETIVO,
  RITMO_ZONA_PERFECTA,
  evaluarRitmo,
  resumenResultado,
  estadoCooldownTarjeta,
} from '../mascota/minijuegos/logica';
import { normalizar } from '../features/emociones/crisis';
import {
  LISTA_NEGRA_UNIVERSAL,
  LISTA_NEGRA_POSITIVIDAD,
} from '../features/emociones/tono';

const rngSecuencia = (...valores) => {
  let indice = 0;
  return jest.fn(() => valores[Math.min(indice++, valores.length - 1)]);
};

describe('tipos, slugs y metadatos', () => {
  test('expone exactamente los dos tipos y slugs canónicos', () => {
    expect(TIPOS_MINIJUEGO).toEqual([ATRAPALA, RITMO_CARINO]);
    expect(TIPOS_MINIJUEGO).toEqual(['ATRAPALA', 'RITMO_CARINO']);
    expect(SLUGS_MINIJUEGO).toEqual([SLUG_ATRAPALA, SLUG_RITMO_CARINO]);
    expect(SLUGS_MINIJUEGO).toEqual(['atrapala', 'ritmo-carino']);
  });

  test('cada tipo tiene metadatos únicos, visibles y cálidos', () => {
    expect(MINIJUEGOS).toHaveLength(2);
    expect(MINIJUEGOS.map(({ tipo }) => tipo)).toEqual(TIPOS_MINIJUEGO);
    expect(MINIJUEGOS.map(({ slug }) => slug)).toEqual(SLUGS_MINIJUEGO);
    expect(new Set(MINIJUEGOS.map(({ tipo }) => tipo)).size).toBe(2);
    expect(new Set(MINIJUEGOS.map(({ slug }) => slug)).size).toBe(2);

    for (const minijuego of MINIJUEGOS) {
      expect(minijuego.titulo).toEqual(expect.any(String));
      expect(minijuego.descripcion).toEqual(expect.any(String));
      expect(minijuego.titulo.length).toBeGreaterThan(0);
      expect(minijuego.descripcion.length).toBeGreaterThan(20);
    }
  });

  test.each([ATRAPALA, RITMO_CARINO])('valida el tipo canónico %s', (tipo) => {
    expect(esTipoMinijuego(tipo)).toBe(true);
  });

  test.each([SLUG_ATRAPALA, SLUG_RITMO_CARINO])('valida el slug canónico %s', (slug) => {
    expect(esSlugMinijuego(slug)).toBe(true);
  });

  test.each([undefined, null, '', 'atrapala', 'ATRÁPALA', 'RITMO-CARINO', 1, {}])(
    'rechaza el tipo no canónico %p',
    (tipo) => expect(esTipoMinijuego(tipo)).toBe(false),
  );

  test.each([undefined, null, '', 'ATRAPALA', 'ritmo_carino', 'ritmo-cariño', 1, {}])(
    'rechaza el slug no canónico %p',
    (slug) => expect(esSlugMinijuego(slug)).toBe(false),
  );

  test('convierte en ambos sentidos sin normalizar valores desconocidos', () => {
    expect(slugDeTipo(ATRAPALA)).toBe(SLUG_ATRAPALA);
    expect(slugDeTipo(RITMO_CARINO)).toBe(SLUG_RITMO_CARINO);
    expect(tipoDeSlug(SLUG_ATRAPALA)).toBe(ATRAPALA);
    expect(tipoDeSlug(SLUG_RITMO_CARINO)).toBe(RITMO_CARINO);

    for (const desconocido of [undefined, null, '', 'OTRO', 'Atrápala']) {
      expect(slugDeTipo(desconocido)).toBeNull();
      expect(tipoDeSlug(desconocido)).toBeNull();
    }
  });

  test('en web ignora el true constante del detector y usa la eleccion explicita', () => {
    expect(modoAccesibleMinijuego('web', true, false)).toBe(false);
    expect(modoAccesibleMinijuego('web', false, true)).toBe(true);
    expect(modoAccesibleMinijuego('ios', true, false)).toBe(true);
    expect(modoAccesibleMinijuego('android', false, false)).toBe(false);
  });
});

describe('Atrápala', () => {
  test('fija oportunidades y tiempos del contrato', () => {
    expect(ATRAPALA_OPORTUNIDADES).toBe(8);
    expect(ATRAPALA_VENTANA_MS).toBe(1600);
    expect(ATRAPALA_VENTANA_REDUCIDA_MS).toBe(2200);
    expect(ATRAPALA_PAUSA_MS).toBe(450);
    expect(ATRAPALA_VENTANA_REDUCIDA_MS).toBeGreaterThan(ATRAPALA_VENTANA_MS);
  });

  test('rng 0 y 1 alcanzan los límites internos definidos por padding', () => {
    const rng = rngSecuencia(0, 1);
    expect(posicionAleatoriaAtrapala({
      width: 300, height: 200, padding: 20, rng,
    })).toEqual({ x: 20, y: 180 });
    expect(rng).toHaveBeenCalledTimes(2);
  });

  test('usa los dos valores del rng inyectado en orden', () => {
    const rng = rngSecuencia(0.25, 0.75);
    expect(posicionAleatoriaAtrapala({
      width: 100, height: 60, padding: 10, rng,
    })).toEqual({ x: 30, y: 40 });
  });

  test('acota valores del rng fuera de 0..1 y centra valores no finitos', () => {
    expect(posicionAleatoriaAtrapala({
      width: 100, height: 80, padding: 10, rng: rngSecuencia(-5, 9),
    })).toEqual({ x: 10, y: 70 });
    expect(posicionAleatoriaAtrapala({
      width: 100, height: 80, padding: 10, rng: rngSecuencia(NaN, Infinity),
    })).toEqual({ x: 50, y: 40 });
  });

  test('en un área menor que el padding disponible fija cada eje en su centro', () => {
    expect(posicionAleatoriaAtrapala({
      width: 30, height: 10, padding: 40, rng: rngSecuencia(0, 1),
    })).toEqual({ x: 15, y: 5 });
  });

  test('resuelve cada dimensión pequeña de forma independiente', () => {
    expect(posicionAleatoriaAtrapala({
      width: 100, height: 20, padding: 30, rng: rngSecuencia(1, 0),
    })).toEqual({ x: 70, y: 10 });
  });

  test('áreas vacías o inválidas nunca producen coordenadas negativas o NaN', () => {
    for (const area of [
      {},
      { width: 0, height: 0 },
      { width: -100, height: -20, padding: 8 },
      { width: NaN, height: Infinity, padding: 8 },
    ]) {
      const posicion = posicionAleatoriaAtrapala({ ...area, rng: rngSecuencia(0.3, 0.7) });
      expect(posicion).toEqual({ x: 0, y: 0 });
      expect(Number.isFinite(posicion.x)).toBe(true);
      expect(Number.isFinite(posicion.y)).toBe(true);
    }
  });

  test('un padding negativo se trata como cero', () => {
    expect(posicionAleatoriaAtrapala({
      width: 100, height: 80, padding: -20, rng: rngSecuencia(0, 1),
    })).toEqual({ x: 0, y: 80 });
  });

  test('todas las muestras permanecen dentro de los límites seguros', () => {
    const muestras = [0, 0.01, 0.25, 0.5, 0.75, 0.99, 1];
    for (const x of muestras) {
      for (const y of muestras) {
        const posicion = posicionAleatoriaAtrapala({
          width: 240, height: 160, padding: 24, rng: rngSecuencia(x, y),
        });
        expect(posicion.x).toBeGreaterThanOrEqual(24);
        expect(posicion.x).toBeLessThanOrEqual(216);
        expect(posicion.y).toBeGreaterThanOrEqual(24);
        expect(posicion.y).toBeLessThanOrEqual(136);
      }
    }
  });
});

describe('onda triangular de Ritmo de cariño', () => {
  const inicio = 10_000;

  test('la ida dura 1200 ms y el ciclo completo dura el doble', () => {
    expect(RITMO_IDA_MS).toBe(1200);
    expect(RITMO_CICLO_MS).toBe(2400);
    expect(RITMO_RONDAS).toBe(5);
  });

  test.each([
    [0, 0],
    [300, 0.25],
    [600, 0.5],
    [900, 0.75],
    [1200, 1],
    [1500, 0.75],
    [1800, 0.5],
    [2100, 0.25],
    [2400, 0],
    [2700, 0.25],
  ])('en +%i ms devuelve %s', (delta, esperado) => {
    expect(posicionRitmo(inicio + delta, inicio)).toBeCloseTo(esperado, 10);
  });

  test('interpola linealmente tanto en la ida como en la vuelta', () => {
    expect(posicionRitmo(inicio + 100, inicio)).toBeCloseTo(1 / 12, 10);
    expect(posicionRitmo(inicio + 1300, inicio)).toBeCloseTo(11 / 12, 10);
    expect(posicionRitmo(inicio + 2399, inicio)).toBeCloseTo(1 / 1200, 10);
  });

  test('se repite de forma determinista cada 2400 ms', () => {
    for (const delta of [0, 137, 600, 1199, 1200, 1888, 2399]) {
      const base = posicionRitmo(inicio + delta, inicio);
      expect(posicionRitmo(inicio + delta + RITMO_CICLO_MS, inicio)).toBeCloseTo(base, 10);
      expect(posicionRitmo(inicio + delta + RITMO_CICLO_MS * 23, inicio)).toBeCloseTo(base, 10);
    }
  });

  test('antes del inicio y ante tiempos inválidos queda en el origen', () => {
    expect(posicionRitmo(inicio - 1, inicio)).toBe(0);
    expect(posicionRitmo(undefined, inicio)).toBe(0);
    expect(posicionRitmo(NaN, inicio)).toBe(0);
    expect(posicionRitmo(inicio, Infinity)).toBe(0);
  });

  test('siempre permanece en el rango normalizado 0..1', () => {
    for (let delta = 0; delta <= RITMO_CICLO_MS * 4; delta += 17) {
      const posicion = posicionRitmo(inicio + delta, inicio);
      expect(posicion).toBeGreaterThanOrEqual(0);
      expect(posicion).toBeLessThanOrEqual(1);
    }
  });

  test('reduceMotion recorre muestras discretas equivalentes de la misma onda', () => {
    expect(RITMO_PASO_REDUCIDO_MS).toBe(300);
    expect(RITMO_PASOS_REDUCIDOS).toEqual([
      0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25,
    ]);

    RITMO_PASOS_REDUCIDOS.forEach((esperado, indice) => {
      const delta = indice * RITMO_PASO_REDUCIDO_MS;
      expect(posicionRitmo(inicio + delta, inicio, true)).toBe(esperado);
      expect(posicionRitmo(inicio + delta, inicio, true)).toBeCloseTo(
        posicionRitmo(inicio + delta, inicio, false),
        10,
      );
    });
  });

  test('cada paso reducido se mantiene estable hasta el siguiente', () => {
    RITMO_PASOS_REDUCIDOS.forEach((esperado, indice) => {
      const inicioPaso = inicio + indice * RITMO_PASO_REDUCIDO_MS;
      expect(posicionRitmo(inicioPaso, inicio, true)).toBe(esperado);
      expect(posicionRitmo(inicioPaso + RITMO_PASO_REDUCIDO_MS - 1, inicio, true)).toBe(esperado);
    });
    expect(posicionRitmo(inicio + RITMO_CICLO_MS, inicio, true)).toBe(0);
  });
});

describe('evaluación de Ritmo de cariño', () => {
  test('fija centro, zona objetivo y zona perfecta', () => {
    expect(RITMO_CENTRO).toBe(0.5);
    expect(RITMO_ZONA_OBJETIVO).toEqual({ desde: 0.38, hasta: 0.62 });
    expect(RITMO_ZONA_PERFECTA).toEqual({ desde: 0.45, hasta: 0.55 });
  });

  test.each([0.45, 0.5, 0.55])('incluye %s en perfecto y da 2 puntos', (posicion) => {
    expect(evaluarRitmo(posicion)).toMatchObject({ resultado: 'perfecto', puntos: 2 });
  });

  test.each([0.38, 0.449999, 0.550001, 0.62])(
    'incluye %s en objetivo y da 1 punto',
    (posicion) => {
      expect(evaluarRitmo(posicion)).toMatchObject({ resultado: 'objetivo', puntos: 1 });
    },
  );

  test.each([0, 0.379999, 0.620001, 1, -1, 2, NaN, Infinity, undefined, null])(
    'fuera de las zonas (%p) da 0 puntos sin culpar',
    (posicion) => {
      expect(evaluarRitmo(posicion)).toMatchObject({ resultado: 'fuera', puntos: 0 });
      expect(evaluarRitmo(posicion).copia).toMatch(/compartieron/i);
    },
  );
});

describe('resúmenes y cooldown sin presión', () => {
  test('resume Atrápala con cero, singular y plural sin hablar de fallos', () => {
    expect(resumenResultado(ATRAPALA, { aciertos: 0 })).toMatchObject({
      resultado: '0 encuentros',
      detalle: expect.stringMatching(/también cuenta/i),
    });
    expect(resumenResultado(ATRAPALA, { aciertos: 1 }).resultado).toBe('1 encuentro');
    expect(resumenResultado(ATRAPALA, { aciertos: 5 }).resultado).toBe('5 encuentros');
  });

  test('normaliza resultados imposibles de Atrápala al rango de oportunidades', () => {
    expect(resumenResultado(ATRAPALA, { aciertos: -3 }).resultado).toBe('0 encuentros');
    expect(resumenResultado(ATRAPALA, { aciertos: NaN }).resultado).toBe('0 encuentros');
    expect(resumenResultado(ATRAPALA, { aciertos: 2.9 }).resultado).toBe('2 encuentros');
    expect(resumenResultado(ATRAPALA, { aciertos: 99 }).resultado).toBe('8 encuentros');
  });

  test('resume los puntos de Ritmo con cero, singular y plural', () => {
    expect(resumenResultado(RITMO_CARINO, { puntos: 0 })).toMatchObject({
      resultado: '0 puntos',
      detalle: expect.stringMatching(/también cuenta/i),
    });
    expect(resumenResultado(RITMO_CARINO, { puntos: 1 }).resultado).toBe('1 punto');
    expect(resumenResultado(RITMO_CARINO, { puntos: 2 }).resultado).toBe('2 puntos');
    expect(resumenResultado(RITMO_CARINO, { puntos: -1 }).resultado).toBe('0 puntos');
  });

  test('un tipo desconocido no inventa un resumen', () => {
    expect(resumenResultado('OTRO', { puntos: 2 })).toBeNull();
    expect(resumenResultado(undefined)).toBeNull();
  });

  test('sin dato de cooldown o sin booleano no inventa un estado', () => {
    expect(estadoCooldownTarjeta(undefined)).toBeNull();
    expect(estadoCooldownTarjeta(null)).toBeNull();
    expect(estadoCooldownTarjeta({})).toBeNull();
    expect(estadoCooldownTarjeta({ puedeJugar: 1 })).toBeNull();
  });

  test('la tarjeta disponible invita sin urgencia', () => {
    expect(estadoCooldownTarjeta({ puedeJugar: true })).toEqual({
      estado: 'disponible',
      habilitado: true,
      etiqueta: 'Jugar cuando quieran',
      detalle: 'Una partida breve para compartir con la mascota.',
      disponibleEn: null,
    });
  });

  test('la tarjeta en cooldown conserva la referencia sin crear un countdown', () => {
    const disponibleEn = '2026-07-28T15:30:00.000Z';
    const ahora = jest.spyOn(Date, 'now');
    const estado = estadoCooldownTarjeta({ puedeJugar: false, disponibleEn });

    expect(estado).toEqual({
      estado: 'descanso',
      habilitado: false,
      etiqueta: 'Este juego toma una pausa',
      detalle: 'Podrás volver cuando pasen 24 horas, sin apuro.',
      disponibleEn,
    });
    expect(ahora).not.toHaveBeenCalled();
    expect(Object.keys(estado).join(' ')).not.toMatch(/restante|countdown|segundos|minutos/i);
    expect(`${estado.etiqueta} ${estado.detalle}`).not.toContain(disponibleEn);
    ahora.mockRestore();
  });

  test('un cooldown sin fecha sigue siendo amable y no calcula nada', () => {
    expect(estadoCooldownTarjeta({ puedeJugar: false })).toMatchObject({
      estado: 'descanso',
      habilitado: false,
      disponibleEn: null,
      detalle: expect.stringMatching(/24 horas/i),
    });
  });

  test('metadatos, evaluaciones, resúmenes y tarjetas evitan culpa y urgencia', () => {
    const textos = [
      ...MINIJUEGOS.flatMap(({ titulo, descripcion }) => [titulo, descripcion]),
      ...[0.2, 0.4, 0.5].map((posicion) => evaluarRitmo(posicion).copia),
      ...[0, 1, 8].flatMap((aciertos) => {
        const resumen = resumenResultado(ATRAPALA, { aciertos });
        return [resumen.titulo, resumen.resultado, resumen.detalle];
      }),
      ...[0, 1, 2].flatMap((puntos) => {
        const resumen = resumenResultado(RITMO_CARINO, { puntos });
        return [resumen.titulo, resumen.resultado, resumen.detalle];
      }),
      ...[true, false].flatMap((puedeJugar) => {
        const estado = estadoCooldownTarjeta({
          puedeJugar,
          disponibleEn: '2026-07-28T15:30:00.000Z',
        });
        return [estado.etiqueta, estado.detalle];
      }),
    ];
    const frasesDePresion = [
      'fallaste',
      'fallo',
      'perdiste',
      'debes',
      'deberias',
      'tienes que',
      'apurate',
      'date prisa',
      'rapido',
      'ultima oportunidad',
      'se acaba',
      'tiempo restante',
      'faltan',
    ];
    const prohibidas = [
      ...LISTA_NEGRA_UNIVERSAL,
      ...LISTA_NEGRA_POSITIVIDAD,
      ...frasesDePresion,
    ];

    for (const texto of textos) {
      const normalizado = normalizar(texto);
      for (const prohibida of prohibidas) {
        expect(normalizado).not.toContain(prohibida);
      }
    }
  });
});
