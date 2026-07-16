// POST /api/chat/respond — chat de emociones con IA (CONTRATO-GEMINI.md).
// El fallo del modelo NUNCA es un 5xx: crisis, violación de tono, timeout o
// key ausente responden 200 por plantilla con fuente: "plantilla".
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { detectarCrisis, MENSAJE_CRISIS, validarTono } = require('../lib/tonoCrisis');
const { respuestaPlantilla } = require('../lib/plantillas');
const { generarRespuesta } = require('../lib/gemini');

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

router.post('/respond', requireAuth, async (req, res) => {
  const { mood, historial } = req.body;
  const mensaje = typeof req.body.mensaje === 'string' ? req.body.mensaje.trim() : '';

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
  const terminar = turnosUsuario >= MAX_INTERCAMBIOS;

  // Segunda capa del escudo de crisis: el mensaje no sale hacia Gemini.
  // Sí entrega los recursos de ayuda, por si el frontend viejo no trae la
  // primera capa (useCrisisShield).
  if (detectarCrisis(mensaje)) {
    return res.json({ respuesta: MENSAJE_CRISIS, fuente: 'plantilla', terminar });
  }

  let respuesta = null;
  try {
    const texto = await generarRespuesta({
      mood,
      mensaje,
      historial: turnos,
      esUltimo: terminar,
    });
    if (validarTono(texto, mood)) respuesta = texto;
  } catch (err) {
    console.warn(`Gemini fallback (${mood}): ${err.message}`);
  }

  if (respuesta !== null) {
    return res.json({ respuesta, fuente: 'gemini', terminar });
  }
  return res.json({
    respuesta: respuestaPlantilla(mood, turnosUsuario, terminar),
    fuente: 'plantilla',
    terminar,
  });
});

module.exports = router;
