import * as Sentry from '@sentry/react-native';

// Reporte de errores de la app. El DSN viene de EXPO_PUBLIC_SENTRY_DSN: las
// variables EXPO_PUBLIC_* quedan incrustadas en el bundle, así que acá va el
// DSN del proyecto de la app y NUNCA el del backend.
//
// Sin la variable definida Sentry no se inicializa: en desarrollo los errores
// se ven en la consola de Metro y no se manda nada a un servicio externo.

// Separada de la inicialización para poder testearla sin levantar el SDK.
export function opcionesSentry(env = process.env, dev = __DEV__) {
  const dsn = env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return null;

  return {
    dsn,
    environment: dev ? 'development' : 'production',
    // Solo errores: no medimos performance.
    tracesSampleRate: 0,
    // Nada de datos personales adjuntos al evento (ver el mismo criterio en
    // backend/lib/sentry.js): viaja el stack trace, no lo que la persona vive
    // en la app.
    sendDefaultPii: false,
    // Los console.* de la app pueden arrastrar texto del chat de emociones o
    // registros de ánimo. Se descartan como migas: un breadcrumb no vale
    // filtrar lo que alguien escribió en un momento difícil.
    beforeBreadcrumb: (breadcrumb) => (breadcrumb.category === 'console' ? null : breadcrumb),
  };
}

export function iniciarSentry(env = process.env, dev = __DEV__) {
  const opciones = opcionesSentry(env, dev);
  if (!opciones) return false;

  Sentry.init(opciones);
  return true;
}
