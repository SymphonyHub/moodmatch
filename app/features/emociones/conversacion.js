// Máquina de estados de la conversación de emociones. Pura y sin efectos:
// la UI (home.jsx) despacha acciones y ejecuta los llamados a la API cuando
// la fase lo indica (fase 'creandoEntrada' → POST /api/mood-entries).
import { GUIONES, SALUDO, DESPEDIDA, ERROR_ENTRADA, ETIQUETAS, SUGERENCIA } from './guiones';
import { detectarCrisis, MENSAJE_CRISIS } from './crisis';
import { MOOD_INFO } from '../../constants/moods';

// Máximo de inputs del usuario por conversación (incluye elegir la emoción).
export const MAX_INTERCAMBIOS = 4;

export function crearConversacion(seed = Math.floor(Math.random() * 997)) {
  const base = {
    fase: 'saludo', // saludo | conversando | creandoEntrada | errorEntrada | puente | cerrado
    mood: null,
    pasoId: null,
    intercambios: 0,
    mensajes: [], // { id, autor: 'bot'|'usuario', tipo: 'texto'|'crisis', texto }
    notas: [], // texto libre acumulado → `nota` del MoodEntry
    crisisMostrada: false,
    moodEntryId: null,
    seed,
    usos: {}, // clave de variante → cuántas veces se usó (rotación)
    nextId: 1,
  };
  return agregarBot(base, 'saludo', SALUDO);
}

function agregarMensaje(estado, autor, tipo, texto) {
  return {
    ...estado,
    mensajes: [...estado.mensajes, { id: estado.nextId, autor, tipo, texto }],
    nextId: estado.nextId + 1,
  };
}

// Variante rotativa: (seed + usos) % variantes — determinista con seed fija,
// variada entre conversaciones y sin repetición inmediata dentro de una.
function agregarBot(estado, clave, variantes) {
  const uso = estado.usos[clave] ?? 0;
  const texto = variantes[(estado.seed + uso) % variantes.length];
  return agregarMensaje(
    { ...estado, usos: { ...estado.usos, [clave]: uso + 1 } },
    'bot',
    'texto',
    texto,
  );
}

function entrarPaso(estado, pasoId) {
  const paso = GUIONES[estado.mood].pasos[pasoId];
  let s = agregarBot({ ...estado, pasoId }, `${estado.mood}.${pasoId}`, paso.bot);
  if (paso.next === SUGERENCIA) s = { ...s, fase: 'creandoEntrada' };
  return s;
}

// Tope duro: al alcanzar MAX_INTERCAMBIOS se ignora la rama y se va al cierre.
function avanzar(estado, next) {
  const destino = estado.intercambios >= MAX_INTERCAMBIOS ? 'cierre' : next;
  return entrarPaso(estado, destino);
}

export function reducer(estado, accion) {
  switch (accion.tipo) {
    case 'ELEGIR_MOOD': {
      if (estado.fase !== 'saludo') return estado;
      const guion = GUIONES[accion.mood];
      if (!guion) return estado;
      const info = MOOD_INFO[accion.mood];
      let s = agregarMensaje(estado, 'usuario', 'texto', `${info.emoji} ${info.label}`);
      s = { ...s, mood: accion.mood, intercambios: 1, fase: 'conversando' };
      return entrarPaso(s, guion.pasoInicial);
    }

    case 'QUICK_REPLY': {
      if (estado.fase !== 'conversando') return estado;
      const paso = GUIONES[estado.mood].pasos[estado.pasoId];
      const reply = paso?.quickReplies?.find((r) => r.id === accion.replyId);
      if (!reply) return estado;
      let s = agregarMensaje(estado, 'usuario', 'texto', reply.label);
      s = { ...s, intercambios: s.intercambios + 1 };
      return avanzar(s, reply.next);
    }

    case 'TEXTO_LIBRE': {
      if (estado.fase !== 'conversando') return estado;
      const texto = String(accion.texto ?? '').trim();
      if (!texto) return estado;
      const paso = GUIONES[estado.mood].pasos[estado.pasoId];
      if (!paso?.textoLibre) return estado;
      let s = agregarMensaje(estado, 'usuario', 'texto', texto);
      s = { ...s, intercambios: s.intercambios + 1, notas: [...s.notas, texto] };
      // El mensaje de crisis se muestra máximo una vez y NO bloquea el flujo.
      if (!s.crisisMostrada && detectarCrisis(texto)) {
        s = agregarMensaje(s, 'bot', 'crisis', MENSAJE_CRISIS);
        s = { ...s, crisisMostrada: true };
      }
      return avanzar(s, paso.textoLibreNext ?? 'cierre');
    }

    case 'ENTRADA_CREADA': {
      if (estado.fase !== 'creandoEntrada') return estado;
      // La sugerencia ya no se muestra aquí: vive en la pestaña "Para mí"
      // del Wellness Hub. El cierre del guion hizo de puente y la UI ofrece
      // los chips "Ver mi sugerencia" / "Registrar otra emoción".
      return { ...estado, moodEntryId: accion.moodEntryId, fase: 'puente' };
    }

    case 'ENTRADA_FALLO': {
      if (estado.fase !== 'creandoEntrada') return estado;
      const s = agregarBot(estado, 'errorEntrada', ERROR_ENTRADA);
      return { ...s, fase: 'errorEntrada' };
    }

    case 'REINTENTAR_ENTRADA': {
      if (estado.fase !== 'errorEntrada') return estado;
      return { ...estado, fase: 'creandoEntrada' };
    }

    case 'VER_HUB': {
      if (estado.fase !== 'puente') return estado;
      // El usuario partió al Hub: el chat queda cerrado y despedido, para
      // que al volver encuentre el chip "Registrar otra emoción".
      let s = agregarMensaje(estado, 'usuario', 'texto', ETIQUETAS.verSugerencia);
      s = agregarBot(s, 'despedida', DESPEDIDA);
      return { ...s, fase: 'cerrado' };
    }

    case 'REINICIAR':
      return crearConversacion(accion.seed ?? estado.seed + 1);

    default:
      return estado;
  }
}

// Paso del guion en curso (o null fuera de la fase de conversación).
export function pasoActual(estado) {
  if (estado.fase !== 'conversando' || !estado.mood) return null;
  return GUIONES[estado.mood].pasos[estado.pasoId] ?? null;
}

// Qué chips mostrar al final del stream según la fase.
export function quickRepliesDe(estado) {
  if (estado.fase === 'saludo') return { tipo: 'moods' };
  if (estado.fase === 'conversando') {
    const paso = pasoActual(estado);
    if (paso?.quickReplies) return { tipo: 'guion', replies: paso.quickReplies };
    return null;
  }
  if (estado.fase === 'errorEntrada') return { tipo: 'reintentar' };
  if (estado.fase === 'puente') return { tipo: 'puente' };
  if (estado.fase === 'cerrado') return { tipo: 'reiniciar' };
  return null;
}
