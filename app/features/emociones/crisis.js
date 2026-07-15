// Detección conservadora de señales de crisis en el texto libre del chat.
// Patrones por frase, nunca palabras sueltas: "muerto de risa" o "me muero de
// cansancio" NO deben disparar. Todo se compara normalizado (minúsculas, sin
// tildes), por eso los patrones se escriben sin acentos ni eñes ("dano").

export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const PATRONES = [
  /suicid/, // suicidio, suicidarme, suicida
  /matarme|me quiero matar/,
  /quitarme la vida/,
  /(quiero|quisiera) morir(me)?\b/,
  /me quiero morir/,
  /no quiero (seguir )?vivi/, // vivir, viviendo
  /no vale la pena (seguir )?vivi/,
  /hacerme dano|me quiero hacer dano/,
  /cortarme|me estoy cortando/,
  /autolesi/,
  /acabar con todo|terminar con todo/,
];

export function detectarCrisis(texto) {
  const t = normalizar(texto);
  if (!t) return false;
  return PATRONES.some((p) => p.test(t));
}

// Recursos vigentes en Chile: *4141 es la línea nacional de prevención del
// suicidio del MINSAL (gratuita, 24/7); Salud Responde es el canal general.
export const MENSAJE_CRISIS =
  'Lo que me cuentas suena muy duro, y no quiero que lo lleves en silencio. ' +
  'Hablar con alguien de confianza puede ayudar más de lo que parece. ' +
  'Y si necesitas apoyo ahora, en Chile puedes llamar gratis a la Línea de ' +
  'Prevención del Suicidio *4141 (24 horas) o a Salud Responde 600 360 7777. ' +
  'No estás solo/a en esto.';
