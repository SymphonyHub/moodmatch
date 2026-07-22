const {
  CATALOGO_RETOS,
  TIPOS_RETO,
  TIPO_LEGADO,
  aplicarProgresoReto,
  crearReto,
  elegirTipo,
  infoReto,
  senalDeReto,
} = require('../lib/retosCooperativos');

describe('catálogo de retos cooperativos', () => {
  test('es una lista cerrada de 4 tipos distintos', () => {
    expect(CATALOGO_RETOS).toHaveLength(4);
    expect(new Set(TIPOS_RETO).size).toBe(4);
    expect(TIPOS_RETO).toEqual([
      'CUIDADO_DUO', 'ANIMO_MISMO_DIA', 'RACHA_MENSAJES', 'ACTIVIDAD_JUNTOS',
    ]);
  });

  test('cada reto trae título y descripción no vacíos', () => {
    for (const reto of CATALOGO_RETOS) {
      expect(reto.titulo.trim().length).toBeGreaterThan(0);
      expect(reto.descripcion.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('elegirTipo — rotación sin repetir', () => {
  test('sin anterior arranca por el primero', () => {
    expect(elegirTipo(null)).toBe('CUIDADO_DUO');
  });

  test('avanza al siguiente del catálogo', () => {
    expect(elegirTipo('CUIDADO_DUO')).toBe('ANIMO_MISMO_DIA');
    expect(elegirTipo('ANIMO_MISMO_DIA')).toBe('RACHA_MENSAJES');
    expect(elegirTipo('ACTIVIDAD_JUNTOS')).toBe('CUIDADO_DUO');
  });

  test('nunca repite el tipo anterior', () => {
    for (const tipo of TIPOS_RETO) {
      expect(elegirTipo(tipo)).not.toBe(tipo);
    }
  });

  test('un tipo desconocido (o el legado) arranca por el primero', () => {
    expect(elegirTipo(TIPO_LEGADO)).toBe('CUIDADO_DUO');
    expect(elegirTipo('LO_QUE_SEA')).toBe('CUIDADO_DUO');
  });
});

describe('crearReto', () => {
  test('crea un reto con ventana de 48h y progreso en cero', () => {
    const ahora = new Date('2026-07-21T10:00:00.000Z');
    const reto = crearReto(ahora, null);
    expect(reto.tipo).toBe('CUIDADO_DUO');
    expect(reto.iniciadoEn).toBe(ahora.toISOString());
    expect(new Date(reto.expiraEn).getTime() - ahora.getTime()).toBe(48 * 60 * 60 * 1000);
    expect(reto.progresoUsuario1).toBe(false);
    expect(reto.progresoUsuario2).toBe(false);
    expect(reto.completado).toBe(false);
  });

  test('el reto de mensajes lleva su meta', () => {
    const reto = crearReto(new Date(), 'ANIMO_MISMO_DIA');
    expect(reto.tipo).toBe('RACHA_MENSAJES');
    expect(reto.meta).toBe(3);
  });
});

describe('infoReto y senalDeReto', () => {
  test('mapean el tipo legado al reto de cuidado en dúo', () => {
    expect(senalDeReto(TIPO_LEGADO)).toBe('cuidado');
    expect(infoReto(TIPO_LEGADO).titulo).toBe(infoReto('CUIDADO_DUO').titulo);
  });

  test('cada tipo tiene su señal', () => {
    expect(senalDeReto('CUIDADO_DUO')).toBe('cuidado');
    expect(senalDeReto('ANIMO_MISMO_DIA')).toBe('animo');
    expect(senalDeReto('RACHA_MENSAJES')).toBe('mensajes');
    expect(senalDeReto('ACTIVIDAD_JUNTOS')).toBe('actividad');
  });
});

describe('aplicarProgresoReto', () => {
  const base = (tipo, extra = {}) => ({
    tipo, progresoUsuario1: false, progresoUsuario2: false, completado: false, ...extra,
  });

  test('CUIDADO_DUO: cada cuidado marca su parte y se completa con ambos', () => {
    let reto = base('CUIDADO_DUO');
    reto = aplicarProgresoReto(reto, { esUsuario1: true, senales: {} });
    expect(reto.progresoUsuario1).toBe(true);
    expect(reto.completado).toBe(false);
    reto = aplicarProgresoReto(reto, { esUsuario1: false, senales: {} });
    expect(reto.progresoUsuario2).toBe(true);
    expect(reto.completado).toBe(true);
  });

  test('no muta el reto original', () => {
    const reto = base('CUIDADO_DUO');
    const siguiente = aplicarProgresoReto(reto, { esUsuario1: true, senales: {} });
    expect(reto.progresoUsuario1).toBe(false);
    expect(siguiente).not.toBe(reto);
  });

  test('ANIMO_MISMO_DIA: se completa solo si ambos registraron el mismo día', () => {
    let reto = aplicarProgresoReto(base('ANIMO_MISMO_DIA'), {
      esUsuario1: true,
      senales: { animoUsuario1: true, animoUsuario2: true, ambosMismoDia: false },
    });
    expect(reto.progresoUsuario1).toBe(true);
    expect(reto.progresoUsuario2).toBe(true);
    expect(reto.completado).toBe(false);

    reto = aplicarProgresoReto(base('ANIMO_MISMO_DIA'), {
      esUsuario1: true,
      senales: { animoUsuario1: true, animoUsuario2: true, ambosMismoDia: true },
    });
    expect(reto.completado).toBe(true);
  });

  test('RACHA_MENSAJES: se completa al alcanzar la meta de pares', () => {
    const reto = aplicarProgresoReto(base('RACHA_MENSAJES', { meta: 3 }), {
      esUsuario1: true,
      senales: { mensajesUsuario1: 4, mensajesUsuario2: 3, paresMensajes: 3 },
    });
    expect(reto.progresoUsuario1).toBe(true);
    expect(reto.progresoUsuario2).toBe(true);
    expect(reto.completado).toBe(true);
  });

  test('RACHA_MENSAJES: por debajo de la meta no se completa', () => {
    const reto = aplicarProgresoReto(base('RACHA_MENSAJES', { meta: 3 }), {
      esUsuario1: true,
      senales: { mensajesUsuario1: 5, mensajesUsuario2: 1, paresMensajes: 1 },
    });
    expect(reto.completado).toBe(false);
  });

  test('ACTIVIDAD_JUNTOS: se completa con actividad de ambos', () => {
    const reto = aplicarProgresoReto(base('ACTIVIDAD_JUNTOS'), {
      esUsuario1: true,
      senales: { actividadUsuario1: true, actividadUsuario2: true },
    });
    expect(reto.completado).toBe(true);
  });

  test('el reto legado se evalúa como cuidado en dúo', () => {
    let reto = aplicarProgresoReto(base(TIPO_LEGADO, { progresoUsuario1: true }), {
      esUsuario1: false,
      senales: {},
    });
    expect(reto.progresoUsuario2).toBe(true);
    expect(reto.completado).toBe(true);
  });
});
