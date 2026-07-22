// Este archivo debe cargarse ANTES que express y que cualquier ruta: Sentry
// instrumenta http y express parcheando sus módulos, y solo alcanza a hacerlo
// si se inicializa primero. Por eso vive aparte y es el require inicial de
// index.js, en vez de estar suelto en el entrypoint.
require('dotenv').config();

require('./lib/sentry').iniciarSentry();
