// Contrato puro de los minijuegos de mascota. La UI solo consume estos datos y
// resultados; aquí no hay timers, estado de React ni acceso al reloj del sistema.

export const ATRAPALA = 'ATRAPALA';
export const RITMO_CARINO = 'RITMO_CARINO';

export const SLUG_ATRAPALA = 'atrapala';
export const SLUG_RITMO_CARINO = 'ritmo-carino';

export const TIPOS_MINIJUEGO = Object.freeze([ATRAPALA, RITMO_CARINO]);
export const SLUGS_MINIJUEGO = Object.freeze([SLUG_ATRAPALA, SLUG_RITMO_CARINO]);

export const MINIJUEGOS = Object.freeze([
  Object.freeze({
    tipo: ATRAPALA,
    slug: SLUG_ATRAPALA,
    titulo: 'Atrápala',
    descripcion: 'La mascota asoma en distintos rincones para compartir un rato de juego, sin apuro.',
  }),
  Object.freeze({
    tipo: RITMO_CARINO,
    slug: SLUG_RITMO_CARINO,
    titulo: 'Ritmo de cariño',
    descripcion: 'Un vaivén suave para acompañar a la mascota y encontrar juntos su propio ritmo.',
  }),
]);

const MINIJUEGO_POR_TIPO = Object.fromEntries(
  MINIJUEGOS.map((minijuego) => [minijuego.tipo, minijuego]),
);
const TIPO_POR_SLUG = Object.fromEntries(
  MINIJUEGOS.map((minijuego) => [minijuego.slug, minijuego.tipo]),
);

export function esTipoMinijuego(valor) {
  return Object.prototype.hasOwnProperty.call(MINIJUEGO_POR_TIPO, valor);
}

export function esSlugMinijuego(valor) {
  return Object.prototype.hasOwnProperty.call(TIPO_POR_SLUG, valor);
}

export function slugDeTipo(tipo) {
  return MINIJUEGO_POR_TIPO[tipo]?.slug ?? null;
}

export function tipoDeSlug(slug) {
  return TIPO_POR_SLUG[slug] ?? null;
}

// React Native Web informa siempre `true` al consultar lector de pantalla. En
// web se usa una elección explícita; Android/iOS sí consumen el dato nativo.
export function modoAccesibleMinijuego(plataforma, lectorDetectado, eleccionManual = false) {
  return plataforma === 'web' ? Boolean(eleccionManual) : Boolean(lectorDetectado || eleccionManual);
}

export const ATRAPALA_OPORTUNIDADES = 8;
export const ATRAPALA_VENTANA_MS = 1600;
export const ATRAPALA_VENTANA_REDUCIDA_MS = 2200;
export const ATRAPALA_PAUSA_MS = 450;

const numeroNoNegativo = (valor) => (
  Number.isFinite(valor) ? Math.max(0, valor) : 0
);

const unidadAleatoria = (valor) => (
  Number.isFinite(valor) ? Math.min(1, Math.max(0, valor)) : 0.5
);

const coordenadaSegura = (tamano, padding, unidad) => {
  const margen = Math.min(padding, tamano / 2);
  return margen + (tamano - margen * 2) * unidad;
};

// `x` e `y` representan el centro de la mascota. Si el área no admite dos
// paddings, esa coordenada se fija en el centro en vez de salir de los límites.
export function posicionAleatoriaAtrapala({
  width = 0,
  height = 0,
  padding = 0,
  rng = Math.random,
} = {}) {
  const anchoSeguro = numeroNoNegativo(width);
  const altoSeguro = numeroNoNegativo(height);
  const paddingSeguro = numeroNoNegativo(padding);
  const azar = typeof rng === 'function' ? rng : Math.random;

  return {
    x: coordenadaSegura(anchoSeguro, paddingSeguro, unidadAleatoria(azar())),
    y: coordenadaSegura(altoSeguro, paddingSeguro, unidadAleatoria(azar())),
  };
}

export const RITMO_IDA_MS = 1200;
export const RITMO_CICLO_MS = RITMO_IDA_MS * 2;
export const RITMO_RONDAS = 5;
export const RITMO_PASO_REDUCIDO_MS = 300;
export const RITMO_PASOS_REDUCIDOS = Object.freeze([
  0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25,
]);

// Onda triangular: parte de 0, llega a 1 al terminar la ida y vuelve a 0. Con
// movimiento reducido usa muestras equivalentes de la misma onda, sin barrido.
export function posicionRitmo(tiempoMs, inicioMs = 0, reduceMotion = false) {
  if (!Number.isFinite(tiempoMs) || !Number.isFinite(inicioMs)) return 0;

  const transcurrido = Math.max(0, tiempoMs - inicioMs);
  const tiempoEnCiclo = transcurrido % RITMO_CICLO_MS;

  if (reduceMotion) {
    const indice = Math.floor(tiempoEnCiclo / RITMO_PASO_REDUCIDO_MS);
    return RITMO_PASOS_REDUCIDOS[indice];
  }

  const tramo = tiempoEnCiclo / RITMO_IDA_MS;
  return tramo <= 1 ? tramo : 2 - tramo;
}

export const RITMO_CENTRO = 0.5;
export const RITMO_ZONA_OBJETIVO = Object.freeze({ desde: 0.38, hasta: 0.62 });
export const RITMO_ZONA_PERFECTA = Object.freeze({ desde: 0.45, hasta: 0.55 });

const dentroDe = (valor, zona) => valor >= zona.desde && valor <= zona.hasta;

export function evaluarRitmo(posicion) {
  if (Number.isFinite(posicion) && dentroDe(posicion, RITMO_ZONA_PERFECTA)) {
    return {
      resultado: 'perfecto',
      puntos: 2,
      copia: 'Se encontraron justo en el centro.',
    };
  }
  if (Number.isFinite(posicion) && dentroDe(posicion, RITMO_ZONA_OBJETIVO)) {
    return {
      resultado: 'objetivo',
      puntos: 1,
      copia: 'Quedó cerquita del centro.',
    };
  }
  return {
    resultado: 'fuera',
    puntos: 0,
    copia: 'Compartieron el vaivén a su manera.',
  };
}

const enteroNoNegativo = (valor, maximo = Number.POSITIVE_INFINITY) => {
  if (!Number.isFinite(valor)) return 0;
  return Math.min(maximo, Math.max(0, Math.floor(valor)));
};

export function resumenResultado(tipo, resultado = {}) {
  if (!esTipoMinijuego(tipo)) return null;
  const datos = resultado && typeof resultado === 'object' ? resultado : {};

  if (tipo === ATRAPALA) {
    const encuentros = enteroNoNegativo(datos.aciertos, ATRAPALA_OPORTUNIDADES);
    return {
      titulo: 'Un rato de juego compartido',
      resultado: `${encuentros} ${encuentros === 1 ? 'encuentro' : 'encuentros'}`,
      detalle: encuentros === 0
        ? 'La mascota exploró todos sus escondites. Compartir el juego también cuenta.'
        : 'Cada encuentro fue una forma de compartir cariño.',
    };
  }

  const puntos = enteroNoNegativo(datos.puntos);
  return {
    titulo: 'Un rato de juego compartido',
    resultado: `${puntos} ${puntos === 1 ? 'punto' : 'puntos'}`,
    detalle: puntos === 0
      ? 'Acompañaron el vaivén a su manera. El rato compartido también cuenta.'
      : 'Acompañaron el vaivén juntos y encontraron su propio ritmo.',
  };
}

// El timestamp se conserva como referencia del contrato, pero no se transforma
// en cuenta regresiva ni en mensajes que apuren a volver.
export function estadoCooldownTarjeta(cooldown) {
  if (!cooldown || typeof cooldown.puedeJugar !== 'boolean') return null;

  if (cooldown.puedeJugar) {
    return {
      estado: 'disponible',
      habilitado: true,
      etiqueta: 'Jugar cuando quieran',
      detalle: 'Una partida breve para compartir con la mascota.',
      disponibleEn: null,
    };
  }

  return {
    estado: 'descanso',
    habilitado: false,
    etiqueta: 'Este juego toma una pausa',
    detalle: 'Podrás volver cuando pasen 24 horas, sin apuro.',
    disponibleEn: typeof cooldown.disponibleEn === 'string' ? cooldown.disponibleEn : null,
  };
}
