const {
  aplicarExperiencia,
  calcularNivel,
  calcularProgresion,
  experienciaNecesaria,
  obtenerRecompensa,
  prepararActualizacionExperiencia,
} = require('../lib/mascotaProgresion');

describe('progresion de experiencia de la mascota', () => {
  test('calcula la experiencia necesaria con la curva cuadratica', () => {
    expect(experienciaNecesaria(1)).toBe(50);
    expect(experienciaNecesaria(4)).toBe(800);
    expect(experienciaNecesaria(14)).toBe(9800);
  });

  test('deriva el nivel desde la experiencia acumulada', () => {
    expect(calcularNivel(0)).toBe(1);
    expect(calcularNivel(49)).toBe(1);
    expect(calcularNivel(50)).toBe(2);
    expect(calcularNivel(799)).toBe(4);
    expect(calcularNivel(800)).toBe(5);
  });

  test('sube de nivel 4 a 5 y activa la evolucion a JOVEN', () => {
    const resultado = aplicarExperiencia(795, 5);

    expect(resultado).toEqual(expect.objectContaining({
      experiencia: 800,
      nivel: 5,
      subioDeNivel: true,
      evoluciono: true,
      etapa: 'JOVEN',
    }));
  });

  test('mantiene BEBE hasta nivel 4 y pasa a ADULTA desde nivel 15', () => {
    expect(calcularProgresion(799).etapa).toBe('BEBE');
    expect(calcularProgresion(800).etapa).toBe('JOVEN');
    expect(calcularProgresion(9799).etapa).toBe('JOVEN');
    expect(calcularProgresion(9800).etapa).toBe('ADULTA');
  });

  test('persiste el hito cuando cambia de etapa', () => {
    const { data } = prepararActualizacionExperiencia({
      experiencia: 795,
      historialHitos: [],
    }, 5, new Date('2026-07-27T12:00:00.000Z'));

    expect(data).toEqual({
      experiencia: { increment: 5 },
      etapa: 2,
      historialHitos: [{
        hito: 'Evolucion a JOVEN en el nivel 5',
        fecha: '2026-07-27T12:00:00.000Z',
      }],
    });
  });

  test('define puntos y limites diarios por tipo de accion', () => {
    expect(obtenerRecompensa('ANIMO')).toEqual(expect.objectContaining({ puntos: 50, limiteDiario: 1 }));
    expect(obtenerRecompensa('MINIJUEGO', 'atrapala')).toEqual(expect.objectContaining({
      puntos: 20, limiteDiario: 1, minijuego: 'ATRAPALA',
    }));
    expect(obtenerRecompensa('CUIDADO')).toEqual(expect.objectContaining({ puntos: 5, limiteDiario: 3 }));
    expect(obtenerRecompensa('CARICIA')).toEqual(expect.objectContaining({ puntos: 2, limiteDiario: 5 }));
  });
});
