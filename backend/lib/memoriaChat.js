// Memoria del chat de emociones entre sesiones (Fase 15). Vive en la columna
// nullable User.memoriaChat (JSONB) y se inyecta en el system prompt para que
// el bot vaya conociendo a la persona en vez de empezar de cero cada vez.
//
// GARANTÍA CENTRAL: aquí solo entra lo que la persona compartió o pidió de
// forma explícita. Nunca inferencias sobre causas o estados, nunca contenido
// de crisis, nunca nada que no pase el validador de tono. Esta capa NO
// reemplaza ni participa del escudo de crisis: el escudo corre en vivo, antes
// que todo esto, y un mensaje con señales de crisis jamás llega a escribirse.
//
// Dos capas, a propósito distintas:
//   1. Directivas — lo que la persona PIDE sobre cómo hablarle (que deje de
//      recordarle una pestaña, cómo llamarla). Se detectan con reglas, no con
//      el modelo: que el bot deje de insistir tiene que ser una garantía
//      mecánica, no una esperanza sobre el prompt.
//   2. Notas — lo que la persona CONTÓ, destilado por el extractor de
//      lib/gemini.js y filtrado íntegramente por este módulo antes de guardarse.

const { normalizar, detectarCrisis, validarTono } = require('./tonoCrisis');

const VERSION = 1;
const MAX_NOTAS = 10;
const MAX_LARGO_NOTA = 140;

// Cada cuánto puede correr el extractor en una charla extendida. Acota el
// gasto del free tier (~1.500 req/día) sin depender del largo del historial,
// que el cliente trunca.
const INTERVALO_MEMORIA_MS = 10 * 60 * 1000;

const HUMORES = ['prefiere', 'neutro', 'evita'];

function memoriaVacia() {
  return {
    version: VERSION,
    actualizada: null,
    apodo: null,
    preferencias: { sugerirHub: true, humor: 'neutro' },
    notas: [],
  };
}

function textoUtil(valor, largoMaximo) {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim().replace(/\s+/g, ' ');
  if (!limpio || limpio.length > largoMaximo) return null;
  return limpio;
}

// ── Filtro de escritura de notas ────────────────────────────────────────────

// Marcadores de inferencia: el doc de fase prohíbe explícitamente deducir
// causas psicológicas no declaradas. Una nota que especula sobre la persona
// se descarta entera, aunque el resto del texto sea inocuo.
const MARCADORES_INFERENCIA = [
  'parece que',
  'pareciera',
  'probablemente',
  'quizas',
  'tal vez',
  'da la impresion',
  'se nota que',
  'creo que esta',
  'creo que tiene',
  'podria tener',
  'podria estar',
  'sufre de',
  'padece',
  'su problema es',
  'la causa de',
];

// Los patrones de crisis de tonoCrisis.js están escritos en primera persona
// ("me quiero morir"), porque evalúan lo que la persona escribe en vivo. Una
// nota de memoria es un resumen en tercera persona ("quiere desaparecer") y se
// les escapa. En vez de tocar esos patrones —que son la fuente compartida con
// el frontend y no se relajan ni se estiran— la memoria suma su propio filtro
// de tema, deliberadamente amplio: un falso positivo solo cuesta una nota que
// no se guarda, y ese es el lado correcto en el que equivocarse.
const PATRONES_RIESGO_NOTA = [
  /suicid/,
  /autolesi/,
  /desaparecer/,
  /\bmorir|\bmuert|\bmatar/,
  /quitar(se|me)? la vida/,
  /hacer(se|me)? dano/,
  /cortar(se|me)|cortand/,
  /lastimar(se|me)?/,
  /acabar con todo|terminar con todo/,
  /no (quiere|quiero) (seguir )?vivi/,
];

// true = la nota puede guardarse. Encadena TODOS los filtros de tono y crisis
// existentes: nada entra a la memoria que no pasaría como respuesta del bot.
function notaAceptable(texto) {
  const limpio = textoUtil(texto, MAX_LARGO_NOTA);
  if (!limpio) return false;
  if (detectarCrisis(limpio)) return false;
  if (PATRONES_RIESGO_NOTA.some((p) => p.test(normalizar(limpio)))) return false;
  // 'TRISTE' es el filtro más estricto: suma la lista negra de positividad
  // forzada a la universal. Una nota debe ser segura en cualquier ánimo.
  if (!validarTono(limpio, 'TRISTE')) return false;
  const n = normalizar(limpio);
  if (MARCADORES_INFERENCIA.some((m) => n.includes(m))) return false;
  return true;
}

// ── Saneado del JSON almacenado ─────────────────────────────────────────────

// Whitelist estricta: lo que no esté en el esquema se descarta. Un JSON
// corrupto, de otra versión o manipulado degrada a memoria vacía en vez de
// propagar basura al system prompt.
function sanearMemoria(crudo) {
  const base = memoriaVacia();
  if (!crudo || typeof crudo !== 'object' || Array.isArray(crudo)) return base;

  const apodo = textoUtil(crudo.apodo, 20);
  if (apodo && /^[\p{L}][\p{L}\p{M}'-]*$/u.test(apodo)) base.apodo = apodo;

  if (typeof crudo.actualizada === 'string' && !Number.isNaN(Date.parse(crudo.actualizada))) {
    base.actualizada = crudo.actualizada;
  }

  const prefs = crudo.preferencias;
  if (prefs && typeof prefs === 'object' && !Array.isArray(prefs)) {
    if (prefs.sugerirHub === false) base.preferencias.sugerirHub = false;
    if (HUMORES.includes(prefs.humor)) base.preferencias.humor = prefs.humor;
  }

  if (Array.isArray(crudo.notas)) {
    const vistas = new Set();
    for (const nota of crudo.notas) {
      if (!nota || typeof nota !== 'object') continue;
      if (!notaAceptable(nota.t)) continue;
      const t = textoUtil(nota.t, MAX_LARGO_NOTA);
      const clave = normalizar(t);
      if (vistas.has(clave)) continue;
      vistas.add(clave);
      const d = typeof nota.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(nota.d) ? nota.d : null;
      base.notas.push({ t, d });
      if (base.notas.length >= MAX_NOTAS) break;
    }
  }

  return base;
}

// ── Capa 1: directivas explícitas (sin modelo) ──────────────────────────────

// Pedido de parar. Se exige además una referencia al Hub (RE_HUB) para no
// confundirlo con un "no me recuerdes a mi ex" y apagar la sugerencia por
// error: las dos condiciones deben darse en el mismo mensaje.
const RE_PARAR =
  /(no me (lo )?(recuerdes|menciones|repitas|sugieras|nombres|digas|hables de)|deja de (recordar|mencionar|repetir|sugerir|nombrar|insistir|hablar de)|para de (recordar|mencionar|repetir|sugerir|insistir)|basta de|ya no me (recuerdes|menciones|sugieras|hables de)|no (vuelvas a|sigas) (recordar|mencionar|repetir|sugerir|hablando de|recordando|mencionando|sugiriendo))/;

const RE_HUB = /(para mi|con amigos|pestana|actividad|sugerencia|el hub|la app)/;

const RE_HUMOR_PREFIERE =
  /(me gustan (los )?(chistes|bromas)|prefiero que (bromees|hagas bromas)|puedes bromear|se mas relajad|hablame mas suelto|tirame tallas)/;
const RE_HUMOR_EVITA =
  /(no (me )?(hagas|quiero|tires) (bromas|chistes|tallas)|deja de bromear|no bromees|sin chistes)/;

// Apodo: se captura del texto original (no del normalizado) para conservar
// tildes y mayúsculas. Los disparadores aceptan la forma con y sin tilde. El
// corte va con lookahead y no con \b, porque \b es ASCII y partiría "José"
// en "Jos".
const RE_APODO =
  /(?:ll[áa]mame|ll[áa]mame mejor|puedes llamarme|prefiero que me llames|me dicen|me llaman)\s+["']?([\p{L}][\p{L}\p{M}'-]{1,19})(?![\p{L}\p{M}])/iu;

// Palabras que suelen seguir al disparador sin ser un apodo real.
const NO_APODOS = new Set([
  'asi',
  'como',
  'cuando',
  'si',
  'no',
  'mejor',
  'algo',
  'por',
  'para',
  'de',
  'que',
  'todos',
  'todo',
  'siempre',
  'nunca',
  'ahora',
  'hoy',
]);

function capturarApodo(mensaje) {
  const m = String(mensaje ?? '').match(RE_APODO);
  if (!m) return null;
  const bruto = m[1].trim();
  if (NO_APODOS.has(normalizar(bruto))) return null;
  return bruto.charAt(0).toUpperCase() + bruto.slice(1);
}

// Lee del mensaje del usuario solo lo que pidió de forma explícita. Devuelve
// un parche (posiblemente vacío), nunca la memoria completa.
function detectarDirectivas(mensaje) {
  const n = normalizar(mensaje);
  const directivas = {};
  if (!n) return directivas;

  if (RE_PARAR.test(n) && RE_HUB.test(n)) directivas.sugerirHub = false;
  if (RE_HUMOR_EVITA.test(n)) directivas.humor = 'evita';
  else if (RE_HUMOR_PREFIERE.test(n)) directivas.humor = 'prefiere';

  const apodo = capturarApodo(mensaje);
  if (apodo) directivas.apodo = apodo;

  return directivas;
}

// Aplica el parche sobre una memoria ya saneada. Devuelve la MISMA referencia
// si nada cambió, para que el route sepa si necesita escribir en la BD.
function aplicarDirectivas(memoria, mensaje) {
  const directivas = detectarDirectivas(mensaje);
  const claves = Object.keys(directivas);
  if (claves.length === 0) return memoria;

  const siguiente = {
    ...memoria,
    preferencias: { ...memoria.preferencias },
    notas: memoria.notas.map((nota) => ({ ...nota })),
  };
  let cambio = false;

  if (directivas.sugerirHub === false && siguiente.preferencias.sugerirHub !== false) {
    siguiente.preferencias.sugerirHub = false;
    cambio = true;
  }
  if (directivas.humor && siguiente.preferencias.humor !== directivas.humor) {
    siguiente.preferencias.humor = directivas.humor;
    cambio = true;
  }
  if (directivas.apodo && siguiente.apodo !== directivas.apodo) {
    siguiente.apodo = directivas.apodo;
    cambio = true;
  }

  return cambio ? siguiente : memoria;
}

// ── Capa 2: notas destiladas ────────────────────────────────────────────────

// Fusiona notas nuevas (strings del extractor) sobre la memoria. Descarta las
// que no pasan el filtro, deduplica por texto normalizado y conserva las más
// recientes cuando se llega al tope.
function fusionarNotas(memoria, notasNuevas, fecha = new Date()) {
  if (!Array.isArray(notasNuevas) || notasNuevas.length === 0) return memoria;

  const d = fecha.toISOString().slice(0, 10);
  const vistas = new Set(memoria.notas.map((nota) => normalizar(nota.t)));
  const agregadas = [];

  for (const cruda of notasNuevas) {
    if (!notaAceptable(cruda)) continue;
    const t = textoUtil(cruda, MAX_LARGO_NOTA);
    const clave = normalizar(t);
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    agregadas.push({ t, d });
  }

  if (agregadas.length === 0) return memoria;

  return {
    ...memoria,
    actualizada: fecha.toISOString(),
    notas: [...memoria.notas, ...agregadas].slice(-MAX_NOTAS),
  };
}

// Marca de tiempo sin tocar las notas (el extractor corrió y no aportó nada
// nuevo): evita que se dispare otra vez en el turno siguiente.
function marcarActualizada(memoria, fecha = new Date()) {
  return { ...memoria, actualizada: fecha.toISOString() };
}

// Throttle del extractor: al cerrar la conversación siempre, y durante la
// charla extendida como mucho una vez cada INTERVALO_MEMORIA_MS.
function debeActualizarMemoria({ terminar, memoria, ahora = Date.now() }) {
  if (terminar) return true;
  if (!memoria?.actualizada) return true;
  const previa = Date.parse(memoria.actualizada);
  if (Number.isNaN(previa)) return true;
  return ahora - previa >= INTERVALO_MEMORIA_MS;
}

// ── Lectura: memoria → bloque del system prompt ─────────────────────────────

// Devuelve null si no hay nada que contar, para no ensuciar el prompt con un
// encabezado vacío.
function contextoMemoria(memoria) {
  if (!memoria) return null;
  const lineas = [];
  if (memoria.apodo) lineas.push(`Te pidió que la llames ${memoria.apodo}.`);
  for (const nota of memoria.notas) lineas.push(nota.t);
  if (lineas.length === 0) return null;

  return (
    'LO QUE YA SABES DE ESTA PERSONA (te lo contó ella misma en conversaciones ' +
    'anteriores). Es TODO lo que sabes: no inventes ni deduzcas nada más allá de ' +
    'esto, no le atribuyas causas ni estados que no haya dicho, y no le recites ' +
    'la lista — úsala solo si viene al caso, como usarías lo que recuerdas de un ' +
    'amigo:\n' +
    lineas.map((linea) => `- ${linea}`).join('\n')
  );
}

module.exports = {
  VERSION,
  MAX_NOTAS,
  MAX_LARGO_NOTA,
  INTERVALO_MEMORIA_MS,
  MARCADORES_INFERENCIA,
  PATRONES_RIESGO_NOTA,
  memoriaVacia,
  notaAceptable,
  sanearMemoria,
  detectarDirectivas,
  aplicarDirectivas,
  fusionarNotas,
  marcarActualizada,
  debeActualizarMemoria,
  contextoMemoria,
};
