const Sentry = require('@sentry/node');

// Reporte de errores de producción. El DSN SIEMPRE viene del entorno (dashboard
// de Render): nunca se hardcodea ni se commitea, igual que GEMINI_API_KEY.
//
// Sin SENTRY_DSN definido Sentry queda inerte —no se inicializa y no abre red—,
// que es lo que queremos en desarrollo y en la suite de tests: los errores
// locales se ven en la consola, no se mandan a un servicio externo.

// Separada de la inicialización para poder testear la configuración sin
// levantar el cliente real ni tocar la red.
function opcionesSentry(env = process.env) {
  const dsn = env.SENTRY_DSN;
  if (!dsn) return null;

  return {
    dsn,
    environment: env.NODE_ENV || 'development',
    // Solo errores: no medimos performance, así que no muestreamos trazas.
    tracesSampleRate: 0,
    // MoodMatch maneja datos sensibles (registros de ánimo, conversaciones del
    // chat de emociones). sendDefaultPii en false evita que Sentry adjunte
    // cuerpos de request, cookies, IP o la cabecera Authorization al evento:
    // viaja el stack trace, no lo que la persona escribió.
    sendDefaultPii: false,
    // Logs del propio Sentry (qué envía y qué responde el ingest). Sirve para
    // comprobar la instrumentación; apagado salvo que se pida explícitamente.
    debug: env.SENTRY_DEBUG === 'true',
  };
}

function iniciarSentry(env = process.env) {
  const opciones = opcionesSentry(env);
  if (!opciones) return false;

  Sentry.init(opciones);
  return true;
}

// El handler de errores de Express solo tiene sentido si el cliente existe;
// montarlo igual sería un middleware que no hace nada.
function montarManejadorDeErrores(app) {
  if (!Sentry.isInitialized()) return false;

  Sentry.setupExpressErrorHandler(app);
  return true;
}

module.exports = { opcionesSentry, iniciarSentry, montarManejadorDeErrores };
