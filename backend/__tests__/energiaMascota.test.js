const {
  COSTOS_ENERGIA,
  ENERGIA_MAXIMA,
  ESTADOS_ENERGIA,
  INTERVALO_REGEN_SEGUNDOS,
  PUNTOS_POR_INTERVALO,
  calcularEnergiaActual,
  consumirEnergia,
  costoDeAccion,
  datosEnergia,
  errorEnergiaInsuficiente,
  estadoEnergia,
  msRecargaTotal,
  msSiguienteRecarga,
  normalizarEnergia,
  poseEnergia,
  presentarEnergia,
  puedeConsumir,
  resolverConsumo,
} = require('../lib/energiaMascota');

const AHORA = new Date('2026-07-28T12:00:00.000Z');
const MINUTO = 60 * 1000;
// Fila con la energia dada y el ancla de regeneracion N minutos en el pasado.
const filaHace = (energia, minutos) => ({
  energia,
  updatedAt: new Date(AHORA.getTime() - minutos * MINUTO),
});

describe('regeneracion por paso del tiempo', () => {
  test('suma un tramo por cada intervalo completo desde updatedAt', () => {
    const minutosPorIntervalo = INTERVALO_REGEN_SEGUNDOS / 60;
    expect(calcularEnergiaActual(filaHace(40, minutosPorIntervalo), AHORA))
      .toBe(40 + PUNTOS_POR_INTERVALO);
    expect(calcularEnergiaActual(filaHace(40, minutosPorIntervalo * 6), AHORA))
      .toBe(40 + PUNTOS_POR_INTERVALO * 6);
  });

  test('los intervalos a medio cumplir todavia no suman', () => {
    expect(calcularEnergiaActual(filaHace(40, 4), AHORA)).toBe(40);
    expect(calcularEnergiaActual(filaHace(40, 9), AHORA)).toBe(40 + PUNTOS_POR_INTERVALO);
  });

  test('nunca pasa del maximo por mucho tiempo que pase', () => {
    expect(calcularEnergiaActual(filaHace(98, 60 * 24 * 30), AHORA)).toBe(ENERGIA_MAXIMA);
    expect(normalizarEnergia(180)).toBe(ENERGIA_MAXIMA);
    expect(normalizarEnergia(-40)).toBe(0);
  });

  test('el abandono ya no descuenta energia: el tiempo solo la sube', () => {
    const abandonada = {
      energia: 30,
      createdAt: new Date(AHORA.getTime() - 60 * 24 * 10 * MINUTO),
      updatedAt: new Date(AHORA.getTime() - 60 * 24 * 10 * MINUTO),
      ultimoCuidadoUsuario1: new Date(AHORA.getTime() - 60 * 24 * 10 * MINUTO),
    };
    expect(calcularEnergiaActual(abandonada, AHORA)).toBe(ENERGIA_MAXIMA);
  });

  test('cae a createdAt cuando la fila todavia no tiene updatedAt', () => {
    const minutos = (INTERVALO_REGEN_SEGUNDOS / 60) * 3;
    const recienCreada = { energia: 50, createdAt: new Date(AHORA.getTime() - minutos * MINUTO) };
    expect(calcularEnergiaActual(recienCreada, AHORA)).toBe(50 + PUNTOS_POR_INTERVALO * 3);
  });

  test('sin ninguna marca temporal devuelve el saldo guardado tal cual', () => {
    expect(calcularEnergiaActual({ energia: 50 }, AHORA)).toBe(50);
    expect(calcularEnergiaActual({}, AHORA)).toBe(50);
  });
});

describe('temporizadores de recarga', () => {
  test('cuentan lo que falta del intervalo en curso', () => {
    const minutosPorIntervalo = INTERVALO_REGEN_SEGUNDOS / 60;
    expect(msSiguienteRecarga(filaHace(40, minutosPorIntervalo / 2), AHORA))
      .toBe((INTERVALO_REGEN_SEGUNDOS / 2) * 1000);
    expect(msSiguienteRecarga(filaHace(40, 0), AHORA)).toBe(INTERVALO_REGEN_SEGUNDOS * 1000);
  });

  test('la recarga total cubre todos los tramos que faltan hasta el maximo', () => {
    const intervaloMs = INTERVALO_REGEN_SEGUNDOS * 1000;
    const fila = filaHace(ENERGIA_MAXIMA - PUNTOS_POR_INTERVALO * 3, 0);
    expect(msRecargaTotal(fila, AHORA)).toBe(intervaloMs * 3);
  });

  test('con la barra llena los dos contadores quedan en cero', () => {
    const llena = filaHace(ENERGIA_MAXIMA, 120);
    expect(msSiguienteRecarga(llena, AHORA)).toBe(0);
    expect(msRecargaTotal(llena, AHORA)).toBe(0);
    const presentada = presentarEnergia(llena, AHORA);
    expect(presentada.segundosSiguienteRecarga).toBe(0);
    expect(presentada.segundosRecargaTotal).toBe(0);
  });
});

describe('estados de la barra', () => {
  test('cubre el enum completo', () => {
    expect(estadoEnergia(ENERGIA_MAXIMA)).toBe(ESTADOS_ENERGIA.LLENO);
    expect(estadoEnergia(60)).toBe(ESTADOS_ENERGIA.DISPONIBLE);
    expect(estadoEnergia(25)).toBe(ESTADOS_ENERGIA.DISPONIBLE);
    expect(estadoEnergia(24)).toBe(ESTADOS_ENERGIA.CRITICO);
    expect(estadoEnergia(1)).toBe(ESTADOS_ENERGIA.CRITICO);
    expect(estadoEnergia(0)).toBe(ESTADOS_ENERGIA.AGOTADO);
  });

  test('la energia baja se dibuja como siesta, nunca como enfermedad', () => {
    expect(poseEnergia(10)).toBe('siesta');
    expect(poseEnergia(0)).toBe('siesta');
    expect(poseEnergia(80)).toBe('normal');
  });
});

describe('costos y consumo', () => {
  test('alimentar y acariciar son gratis; jugar y los minijuegos cuestan', () => {
    expect(costoDeAccion('ALIMENTAR')).toBe(0);
    expect(costoDeAccion('CARICIA')).toBe(0);
    expect(costoDeAccion('jugar')).toBe(COSTOS_ENERGIA.JUGAR);
    expect(costoDeAccion('MINIJUEGO')).toBe(COSTOS_ENERGIA.MINIJUEGO);
    expect(costoDeAccion('LO_QUE_SEA')).toBe(0);
  });

  test('descuenta el costo cuando alcanza', () => {
    expect(puedeConsumir(20, 20)).toBe(true);
    expect(consumirEnergia(50, COSTOS_ENERGIA.MINIJUEGO)).toBe(50 - COSTOS_ENERGIA.MINIJUEGO);
    expect(consumirEnergia(20, 20)).toBe(0);
  });

  test('devuelve null en vez de un saldo negativo saneado a cero', () => {
    expect(puedeConsumir(19, 20)).toBe(false);
    expect(consumirEnergia(19, 20)).toBeNull();
    expect(consumirEnergia(0, 15)).toBeNull();
  });

  test('resolverConsumo mide sobre la energia ya regenerada', () => {
    // 10 de saldo guardado + 6 intervalos de recarga alcanzan para jugar.
    const fila = filaHace(10, (INTERVALO_REGEN_SEGUNDOS / 60) * 6);
    const consumo = resolverConsumo(fila, 'JUGAR', AHORA);
    expect(consumo.ok).toBe(true);
    expect(consumo.energiaActual).toBe(10 + PUNTOS_POR_INTERVALO * 6);
    expect(consumo.data).toEqual({ energia: consumo.energiaActual - COSTOS_ENERGIA.JUGAR });
  });

  test('un consumo rechazado no trae nada que escribir', () => {
    const consumo = resolverConsumo(filaHace(5, 0), 'MINIJUEGO', AHORA);
    expect(consumo.ok).toBe(false);
    expect(consumo.data).toBeUndefined();
    expect(errorEnergiaInsuficiente(consumo)).toEqual({
      error: 'ENERGIA_INSUFICIENTE',
      energiaActual: 5,
      energiaRequerida: COSTOS_ENERGIA.MINIJUEGO,
    });
  });

  test('datosEnergia deja en la fila el saldo regenerado', () => {
    expect(datosEnergia(filaHace(40, (INTERVALO_REGEN_SEGUNDOS / 60) * 2), AHORA))
      .toEqual({ energia: 40 + PUNTOS_POR_INTERVALO * 2 });
  });
});

describe('contrato expuesto por la API', () => {
  test('presentarEnergia trae saldo, maximo, contadores y estado', () => {
    const fila = filaHace(40, 0);
    expect(presentarEnergia(fila, AHORA)).toEqual({
      energia: 40,
      energiaActual: 40,
      energiaMaxima: ENERGIA_MAXIMA,
      segundosSiguienteRecarga: INTERVALO_REGEN_SEGUNDOS,
      segundosRecargaTotal: (ENERGIA_MAXIMA - 40) / PUNTOS_POR_INTERVALO * INTERVALO_REGEN_SEGUNDOS,
      estadoEnergia: ESTADOS_ENERGIA.DISPONIBLE,
      costosEnergia: COSTOS_ENERGIA,
      cansada: false,
      poseEnergia: 'normal',
    });
  });

  test('con la barra agotada avisa el estado sin culpabilizar', () => {
    const presentada = presentarEnergia(filaHace(0, 0), AHORA);
    expect(presentada.estadoEnergia).toBe(ESTADOS_ENERGIA.AGOTADO);
    expect(presentada.cansada).toBe(true);
    expect(presentada.poseEnergia).toBe('siesta');
    expect(presentada.segundosSiguienteRecarga).toBe(INTERVALO_REGEN_SEGUNDOS);
  });
});
