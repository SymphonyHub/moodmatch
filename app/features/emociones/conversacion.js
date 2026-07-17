// Máquina de estados de la conversación de emociones. Pura y sin efectos:
// la UI (home.jsx) despacha acciones y ejecuta los llamados a la API cuando
// la fase lo indica (fase 'creandoEntrada' → POST /api/mood-entries).
import { GUIONES, SALUDO, DESPEDIDA, ERROR_ENTRADA, ETIQUETAS, SUGERENCIA } from './guiones';
import { detectarCrisis, MENSAJE_CRISIS } from './crisis';
import { respuestaPlantilla } from './plantillas';
import { MOOD_INFO } from '../../constants/moods';

// Máximo de inputs del usuario por conversación (incluye elegir la emoción).
export const MAX_INTERCAMBIOS = 4;

// Máximo de turnos que viajan como historial a /api/chat/respond (el backend
// también trunca a 8 — CONTRATO-GEMINI.md §1).
export const MAX_HISTORIAL_IA = 8;

export function crearConversacion(seed = Math.floor(Math.random() * 997)) {
  const base = {
    // saludo | conversando | esperandoIA | iaFallo | creandoEntrada |
    // errorEntrada | puente | cerrado
    fase: 'saludo',
    mood: null,
    pasoId: null,
    intercambios: 0,
    mensajes: [], // { id, autor: 'bot'|'usuario', tipo: 'texto'|'crisis', texto }
    notas: [], // texto libre acumulado → `nota` del MoodEntry
    crisisMostrada: false,
    moodEntryId: null,
    pendienteIA: null, // { texto, historial } del turno en vuelo / a reintentar
    seed,
    usos: {}, // clave de variante → cuántas veces se usó (rotación)
    nextId: 1,
  };
  return agregarBot(base, 'saludo', SALUDO);
}

// Historial para /api/chat/respond: solo burbujas de texto (las de crisis
// jamás salen del dispositivo), en el shape { autor, texto } del contrato,
// truncado a los últimos MAX_HISTORIAL_IA. Incluye el pseudo-turno del mood
// ("😊 Feliz"): así turnosUsuario(historial) + 1 del backend queda alineado
// 1:1 con `intercambios`/MAX_INTERCAMBIOS de este reducer.
export function historialParaIA(mensajes) {
  return mensajes
    .filter((m) => m.tipo === 'texto')
    .map((m) => ({ autor: m.autor, texto: m.texto }))
    .slice(-MAX_HISTORIAL_IA);
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

// Responde el turno con la plantilla local (crisis con omitirIA, o "Seguir
// sin conexión"): misma rotación determinista del backend. Si se alcanzó el
// tope, la plantilla es de cierre y se pasa al registro del MoodEntry.
function responderConPlantilla(estado) {
  const terminar = estado.intercambios >= MAX_INTERCAMBIOS;
  const texto = respuestaPlantilla(estado.mood, estado.intercambios, terminar);
  const s = agregarMensaje(estado, 'bot', 'texto', texto);
  return { ...s, pendienteIA: null, fase: terminar ? 'creandoEntrada' : 'conversando' };
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

    // ── Chat con IA (Fase 8) ───────────────────────────────────────────
    // El escudo de crisis corre en la UI ANTES de despachar: aquí solo
    // llegan sus resultados (omitirIA, mensajeCrisis). Con omitirIA el
    // estado nunca pasa por 'esperandoIA', así que el effect que llama a
    // /api/chat/respond no corre y el texto no sale del dispositivo.
    case 'ENVIAR_TEXTO_IA': {
      if (estado.fase !== 'conversando') return estado;
      const texto = String(accion.texto ?? '').trim();
      if (!texto) return estado;
      const historial = historialParaIA(estado.mensajes);
      let s = agregarMensaje(estado, 'usuario', 'texto', texto);
      s = { ...s, intercambios: s.intercambios + 1, notas: [...s.notas, texto] };
      if (accion.mensajeCrisis && !s.crisisMostrada) {
        s = agregarMensaje(s, 'bot', 'crisis', accion.mensajeCrisis);
        s = { ...s, crisisMostrada: true };
      }
      if (accion.omitirIA) return responderConPlantilla(s);
      return { ...s, pendienteIA: { texto, historial }, fase: 'esperandoIA' };
    }

    case 'IA_RESPONDIO': {
      if (estado.fase !== 'esperandoIA') return estado;
      const s = agregarMensaje(estado, 'bot', 'texto', accion.respuesta);
      return {
        ...s,
        pendienteIA: null,
        fase: accion.terminar ? 'creandoEntrada' : 'conversando',
      };
    }

    case 'IA_FALLO': {
      if (estado.fase !== 'esperandoIA') return estado;
      // Conserva pendienteIA: "Intentar de nuevo" reenvía el mismo turno.
      return { ...estado, fase: 'iaFallo' };
    }

    case 'IA_REINTENTAR': {
      if (estado.fase !== 'iaFallo') return estado;
      return { ...estado, fase: 'esperandoIA' };
    }

    case 'SEGUIR_SIN_IA': {
      if (estado.fase !== 'iaFallo') return estado;
      return responderConPlantilla(estado);
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
  if (estado.fase === 'iaFallo') return { tipo: 'iaFallo' };
  if (estado.fase === 'errorEntrada') return { tipo: 'reintentar' };
  if (estado.fase === 'puente') return { tipo: 'puente' };
  if (estado.fase === 'cerrado') return { tipo: 'reiniciar' };
  return null;
}
