// Config dinámica de Expo. `app.json` sigue siendo la fuente de todo lo demás:
// acá solo se resuelve lo que no puede vivir en un JSON estático.
//
// El caso es `google-services.json`. El archivo NO se versiona —lleva la
// configuración del proyecto Firebase y la decisión del repo es mantenerlo
// fuera de git— pero el builder de EAS lo necesita para que las notificaciones
// push funcionen. Al no estar en el repositorio, EAS avisaba al subir:
//
//   File specified via "android.googleServicesFile" field in your app.json is
//   not checked in to your repository and won't be uploaded to the builder.
//
// El `!google-services.json` de `.easignore` no alcanza para revertir eso. La
// vía que sí funciona es una variable de entorno de tipo `file` en EAS
// (`eas env:create --type file --visibility secret`): EAS escribe el archivo en
// el worker y deja su ruta en `process.env.GOOGLE_SERVICES_JSON`, inyectada
// ANTES de evaluar este archivo. Un `app.json` estático no serviría: no hay
// sustitución de variables en JSON.
//
// El `??` es lo que lo vuelve a prueba de contextos: en la nube gana la ruta
// que puso EAS, y en local —prebuild, `expo run:android`, `expo export`— cae al
// archivo que está en esta carpeta. El mismo config funciona en los dos lados
// sin condicionales por entorno.
//
// Si algún día el archivo falta en ambos lados, se pasa `undefined` en vez de
// una ruta inválida: Expo omite el plugin de Google Services y el build sale
// sin push, en lugar de romper con un error de archivo inexistente.
const { expo } = require('./app.json');

module.exports = () => ({
  ...expo,
  android: {
    ...expo.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? expo.android.googleServicesFile ?? undefined,
  },
});
