import {
  mensajeRacha,
  tituloRacha,
  estadoRegalo,
} from '../mascota/interaccionesSociales';
import { normalizar } from '../features/emociones/crisis';
import {
  LISTA_NEGRA_UNIVERSAL,
  LISTA_NEGRA_POSITIVIDAD,
} from '../features/emociones/tono';

describe('mensajeRacha', () => {
  test('sin racha o en pausa: invita a retomar sin reproche', () => {
    expect(mensajeRacha(null)).toMatch(/pausa/i);
    expect(mensajeRacha({ viva: false, dias: 0 })).toMatch(/cuando quieran/i);
  });

  test('racha viva de 1 día', () => {
    const txt = mensajeRacha({ viva: true, dias: 1, cuidadaHoy: false });
    expect(txt).toMatch(/racha de cuidados/i);
  });

  test('racha de varios días menciona el número', () => {
    expect(mensajeRacha({ viva: true, dias: 2, cuidadaHoy: true })).toMatch(/2 días/);
  });

  test('cuidada hoy lo reconoce', () => {
    expect(mensajeRacha({ viva: true, dias: 2, cuidadaHoy: true })).toMatch(/hoy/i);
  });
});

describe('tituloRacha', () => {
  test('en pausa no muestra número', () => {
    expect(tituloRacha({ viva: false })).toBe('Racha compartida');
  });
  test('viva muestra los días con plural correcto', () => {
    expect(tituloRacha({ viva: true, dias: 1 })).toBe('Racha compartida · 1 día');
    expect(tituloRacha({ viva: true, dias: 3 })).toBe('Racha compartida · 3 días');
  });
});

describe('estadoRegalo', () => {
  test('sin dato del backend devuelve null (no se inventa estado)', () => {
    expect(estadoRegalo(undefined)).toBeNull();
    expect(estadoRegalo(null)).toBeNull();
  });

  test('habilitado cuando se puede regalar', () => {
    const e = estadoRegalo({ puedeRegalar: true });
    expect(e.habilitado).toBe(true);
    expect(e.etiqueta).toMatch(/regalo/i);
  });

  test('deshabilitado con fecha de disponibilidad', () => {
    const e = estadoRegalo({ puedeRegalar: false, disponibleEn: '2026-07-28T00:00:00.000Z' });
    expect(e.habilitado).toBe(false);
    expect(e.detalle).toMatch(/podrán enviar otro/i);
  });

  test('deshabilitado sin fecha aún da un mensaje suave', () => {
    const e = estadoRegalo({ puedeRegalar: false });
    expect(e.habilitado).toBe(false);
    expect(e.detalle).toMatch(/próxima semana/i);
  });
});

describe('tono: ningún texto usa frases prohibidas', () => {
  const textos = [
    mensajeRacha(null),
    mensajeRacha({ viva: false, dias: 0 }),
    mensajeRacha({ viva: true, dias: 1, cuidadaHoy: false }),
    mensajeRacha({ viva: true, dias: 5, cuidadaHoy: true }),
    tituloRacha({ viva: false }),
    tituloRacha({ viva: true, dias: 2 }),
    estadoRegalo({ puedeRegalar: true }).etiqueta,
    estadoRegalo({ puedeRegalar: true }).detalle,
    estadoRegalo({ puedeRegalar: false, disponibleEn: '2026-07-28T00:00:00.000Z' }).etiqueta,
    estadoRegalo({ puedeRegalar: false }).detalle,
  ];

  test.each(textos)('«%s» está limpio de listas negras', (texto) => {
    const n = normalizar(texto);
    [...LISTA_NEGRA_UNIVERSAL, ...LISTA_NEGRA_POSITIVIDAD].forEach((frase) => {
      expect(n).not.toContain(frase);
    });
  });
});
