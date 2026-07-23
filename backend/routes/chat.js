// POST /api/chat/respond — chat de emociones con IA (CONTRATO-GEMINI.md).
// El fallo del modelo NUNCA es un 5xx: crisis, violación de tono, timeout o
// key ausente responden 200 por plantilla con fuente: "plantilla".
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const {
  detectarCrisis,
  MENSAJE_CRISIS,
  validarTono,
  LARGO_MAXIMO_RELATO,
} = require('../lib/tonoCrisis');
const { respuestaPlantilla } = require('../lib/plantillas');
const { generarRespuesta, extraerMemoria, pideRelato } = require('../lib/gemini');
const prisma = require('../lib/prisma');
const {
  memoriaVacia,
  sanearMemoria,
  aplicarDirectivas,
  fusionarNotas,
  marcarActualizada,
  debeActualizarMemoria,
} = require('../lib/memoriaChat');

const VALID_MOODS = ['FELIZ', 'TRISTE', 'ANSIOSO', 'CALMADO', 'ENOJADO', 'NEUTRO'];

// Mismo tope del reducer conversacion.js: 4 inputs del usuario por
// conversación, contando la elección de la emoción (que llega en el
// historial como primer turno "usuario").
const MAX_INTERCAMBIOS = 4;

// El contrato define `historial` opcional y laxo: lo no interpretable se
// descarta en vez de rechazar la petición.
function sanearHistorial(historial) {
  if (!Array.isArray(historial)) return [];
  return historial.filter(
    (t) =>
      t &&
      (t.autor === 'usuario' || t.autor === 'bot') &&
      typeof t.texto === 'string' &&
      t.texto.trim() !== '',
  );
}

// La memoria es un accesorio del chat, no un requisito: si la lectura falla
// (BD caída, columna aún sin migrar) se conversa sin ella.
async function leerMemoria(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { memoriaChat: true },
    });
    return sanearMemoria(user?.memoriaChat);
  } catch (err) {
    console.warn(`Memoria de chat no disponible (user ${userId}): ${err.message}`);
    return memoriaVacia();
  }
}

async function guardarMemoria(userId, memoria) {
  try {
    await prisma.user.update({ where: { id: userId }, data: { memoriaChat: memoria } });
  } catch (err) {
    console.warn(`No se pudo guardar la memoria de chat (user ${userId}): ${err.message}`);
  }
}

// Corre DESPUÉS de responder: la latencia del extractor no la paga el turno
// del usuario. Nunca lanza hacia afuera — que la memoria no se actualice es
// aceptable; que se caiga el turno, no.
async function actualizarMemoriaEnSegundoPlano({ userId, historial, mensaje, memoria, terminar }) {
  try {
    if (!debeActualizarMemoria({ terminar, memoria })) return;
    const notas = await extraerMemoria({ historial, mensaje, memoria });
    const fusionada = fusionarNotas(memoria, notas);
    // Aunque no haya notas nuevas se sella la marca de tiempo, para no
    // reintentar el extractor en cada turno siguiente.
    await guardarMemoria(userId, fusionada === memoria ? marcarActualizada(memoria) : fusionada);
  } catch (err) {
    console.warn(`Extractor de memoria falló (user ${userId}): ${err.message}`);
  }
}

router.post('/respond', requireAuth, async (req, res) => {
  const { mood, historial } = req.body;
  const mensaje = typeof req.body.mensaje === 'string' ? req.body.mensaje.trim() : '';
  // Conversación extendida (Fase 9): la sesión ya registró su MoodEntry y el
  // usuario sigue charlando — el backend no fuerza el cierre por conteo.
  const continuar = req.body.continuar === true;

  if (!VALID_MOODS.includes(mood)) {
    return res.status(400).json({ error: `mood debe ser uno de: ${VALID_MOODS.join(', ')}` });
  }
  if (!mensaje) {
    return res.status(400).json({ error: 'mensaje es requerido y no puede estar vacío' });
  }

  const turnos = sanearHistorial(historial);
  // `terminar` se calcula sobre el historial completo: truncar antes de
  // contar subestimaría los intercambios.
  const turnosUsuario = turnos.filter((t) => t.autor === 'usuario').length + 1;
  const terminar = !continuar && turnosUsuario >= MAX_INTERCAMBIOS;

  // Segunda capa del escudo de crisis: el mensaje no sale hacia Gemini.
  // Sí entrega los recursos de ayuda, por si el frontend viejo no trae la
  // primera capa (useCrisisShield). Corta antes que todo lo demás: un
  // mensaje de crisis tampoco toca la memoria ni despierta al extractor.
  if (detectarCrisis(mensaje)) {
    return res.json({ respuesta: MENSAJE_CRISIS, fuente: 'plantilla', terminar });
  }

  const userId = req.user.userId;
  const memoriaGuardada = await leerMemoria(userId);
  // Capa 1 de la memoria: lo que la persona pidió explícitamente sobre cómo
  // hablarle. Va por reglas y no por el modelo — que deje de insistir tiene
  // que ser una garantía mecánica (CONTRATO-GEMINI.md §5).
  const memoria = aplicarDirectivas(memoriaGuardada, mensaje);
  if (memoria !== memoriaGuardada) guardarMemoria(userId, memoria);

  // La persona pidió una historia o un chiste: el tope de brevedad del
  // validador la descartaría por larga. Solo cambia el largo permitido; los
  // filtros de crisis y de tono corren idénticos.
  const largoMaximo = pideRelato(mensaje) ? LARGO_MAXIMO_RELATO : undefined;

  let respuesta = null;
  try {
    const texto = await generarRespuesta({
      mood,
      mensaje,
      historial: turnos,
      esUltimo: terminar,
      memoria,
    });
    if (validarTono(texto, mood, { largoMaximo })) respuesta = texto;
  } catch (err) {
    console.warn(`Gemini fallback (${mood}): ${err.message}`);
  }

  if (respuesta !== null) {
    res.json({ respuesta, fuente: 'gemini', terminar });
  } else {
    res.json({
      respuesta: respuestaPlantilla(mood, turnosUsuario, terminar),
      fuente: 'plantilla',
      terminar,
    });
  }

  // Capa 2: notas destiladas. Después de responder, y solo cuando el throttle
  // lo permite.
  actualizarMemoriaEnSegundoPlano({
    userId,
    historial: turnos,
    mensaje,
    memoria,
    terminar,
  });
});

module.exports = router;
