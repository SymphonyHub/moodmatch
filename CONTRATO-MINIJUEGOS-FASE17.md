# CONTRATO-MINIJUEGOS-FASE17.md - Bloque 3

Documento autoritativo para integrar los minijuegos de la mascota entre la
logica de dominio del Agente B y la persistencia/ruta del Agente A. Este bloque
no abre un catalogo configurable: solo existen los dos tipos definidos aqui.

## 1. Catalogo y nombres

Los unicos tipos validos son:

- `ATRAPALA`
- `RITMO_CARINO`

Los identificadores son sensibles a mayusculas y no se normalizan. Cualquier
otro valor se rechaza con `400`.

La moneda se llama **semillitas** en todo texto visible. Su nombre tecnico en
API y persistencia es `monedas`.

## 2. Endpoint de apertura de partida

El cliente no aporta tiempo. Para que exista una duracion minima verificable,
la partida se abre contra el backend y este sella el instante de inicio dentro
de un ticket firmado:

```http
POST /api/mascota/:amistadId/minijuegos/:tipo/iniciar
Authorization: Bearer <token>
```

Sin body. Exito `201`:

```json
{
  "sesion": "v1.eyJ2IjoidjEiLCJ1Ijo0...:.4f3a...",
  "expiraEn": "2026-07-27T16:00:00.000Z",
  "duracionMinimaMs": 3000
}
```

El ticket es opaco para el cliente: no lo abre, no lo interpreta y no deriva
tiempo de el. Solo lo guarda en memoria y lo devuelve al completar. Abandonar
la partida lo descarta.

`iniciar` valida token, tipo y pertenencia igual que `completar`, y responde
`429` si el tipo ya esta en descanso — no tiene sentido abrir una partida cuya
recompensa se sabe de antemano que sera rechazada. **No escribe nada**: no crea
marcador, no consume cooldown y no toca la mascota. Pedir tickets repetidos no
tiene efecto de dominio.

## 3. Endpoint de finalizacion

El Agente A implementara:

```http
POST /api/mascota/:amistadId/minijuegos/:tipo/completar
Authorization: Bearer <token>
Content-Type: application/json
```

Body:

```json
{
  "puntuacion": 8,
  "sesion": "v1.eyJ2IjoidjEiLCJ1Ijo0...:.4f3a..."
}
```

`puntuacion` debe ser un numero entero dentro del rango del tipo. No se
convierten strings, no se redondean decimales y no se hace clamp silencioso.
Una puntuacion `0` es una finalizacion valida: entrega la recompensa nominal
correspondiente y consume el cooldown.

`sesion` es el ticket devuelto por `iniciar`. Es obligatorio. Ambos campos se
validan con `validarPayloadCompletar(body, tipo)`, que devuelve
`{ ok: true, valor }` o `{ ok: false, motivo }` y no corrige nada.

### Exito `201`

```json
{
  "mascota": {
    "id": "pet-1",
    "amistadId": 7,
    "energia": 100,
    "monedas": 3,
    "minijuegos": {
      "ATRAPALA": {
        "puedeJugar": false,
        "disponibleEn": "2026-07-28T15:30:00.000Z"
      },
      "RITMO_CARINO": {
        "puedeJugar": true,
        "disponibleEn": null
      }
    }
  },
  "minijuego": {
    "tipo": "ATRAPALA",
    "puntuacion": 8,
    "completadoEn": "2026-07-27T15:30:00.000Z",
    "disponibleEn": "2026-07-28T15:30:00.000Z"
  },
  "recompensa": {
    "energia": 5,
    "carino": 0,
    "monedas": 3
  }
}
```

`mascota` usa el presentador normal del detalle y refleja el estado ya
persistido. `recompensa` contiene los deltas **efectivamente aplicados**, no
necesariamente los nominales: si `ATRAPALA` otorga 16 de energia pero solo
faltaban 5 para el tope, el endpoint devuelve `energia: 5`. `carino` es el delta
aplicado a `nivelCarino`; cariño y monedas no tienen tope de producto, por lo
que hoy coinciden con su valor nominal.

### Errores de dominio

Los dos endpoints responden con la misma forma. `errorMinijuego(motivo)`
devuelve `{ status, codigo, mensaje }` y es la unica fuente de esa tabla: la
ruta no redacta texto propio ni inventa status.

```json
{
  "error": "<mensaje>",
  "codigo": "<codigo>"
}
```

| Status | Codigo | Cuando |
| --- | --- | --- |
| `400` | `TIPO_DESCONOCIDO` | El tipo no es `ATRAPALA` ni `RITMO_CARINO` |
| `400` | `AMISTAD_INVALIDA` | `amistadId` no es un entero positivo |
| `400` | `PAYLOAD_INVALIDO` | Body ausente/no objeto, o puntuacion no entera o fuera de rango |
| `400` | `SESION_INVALIDA` | Ticket ausente, mal formado, mal firmado, de otro vinculo o de una partida demasiado corta |
| `400` | `SESION_EXPIRADA` | El ticket supero su TTL |
| `401` | — | Token ausente o invalido; responde `requireAuth` con su forma vigente |
| `404` | `MASCOTA_NO_ENCONTRADA` | La amistad no pertenece al usuario, o la mascota no existe, no esta aceptada o no esta activa |
| `429` | `EN_DESCANSO` | El usuario completo ese mismo tipo durante las ultimas 24 horas |

Respuesta `429`, unico caso que agrega un campo:

```json
{
  "error": "Este minijuego está tomando una pausa. Podrás volver a jugar más adelante.",
  "codigo": "EN_DESCANSO",
  "disponibleEn": "2026-07-28T15:30:00.000Z"
}
```

La copia puede ajustarse si conserva ese tono suave: informa disponibilidad,
no culpa, no habla de fallar una racha y no presiona para volver. Un test
mecanico verifica que ningun mensaje acuse de hacer trampa ni apure.

`codigo` es aditivo: un cliente viejo que solo mira `status` sigue funcionando.
El cliente nunca muestra `error` en crudo — traduce `codigo` a su propia copia.

## 4. Detalle de mascota

`GET /api/mascota/:amistadId` conserva su envoltorio `{ mascota }` y agrega al
objeto `mascota`:

```json
{
  "energia": 72,
  "monedas": 4,
  "minijuegos": {
    "ATRAPALA": {
      "puedeJugar": true,
      "disponibleEn": null
    },
    "RITMO_CARINO": {
      "puedeJugar": false,
      "disponibleEn": "2026-07-28T12:00:00.000Z"
    }
  }
}
```

Siempre aparecen ambos tipos. `disponibleEn` es ISO 8601 UTC y vale `null`
cuando el tipo ya se puede jugar.

## 5. Cooldown rodante

- Duracion exacta: `24 * 60 * 60 * 1000` ms desde la finalizacion aceptada; no
  es "una vez por dia calendario".
- La fuente de tiempo es el backend. No se acepta hora, fecha ni zona horaria
  enviada por el cliente.
- La clave logica es `(usuario autenticado, tipo)`. Es global entre todas las
  mascotas de ese usuario, no por `amistadId`.
- Cada tipo tiene cooldown independiente.
- El cooldown es personal. Que una persona juegue no bloquea a la otra persona
  de la amistad.
- Solo se consume al completar con una puntuacion valida y confirmar la
  transaccion. Abrir o abandonar una partida antes de completarla no lo
  consume.
- Validaciones fallidas, `404`, `429` y transacciones revertidas no crean
  cooldown ni recompensa.
- En el instante exacto `ultimaFinalizacion + 24h` vuelve a estar disponible.

`estadoCooldownMinijuego(ultimaFinalizacionMs, ahora)` recibe el epoch en
milisegundos de la ultima finalizacion o `null`, y una `Date` del servidor.
Devuelve `{ puedeJugar, disponibleEn }`.

## 6. Sesion de partida y limites anti-abuso

### Ticket firmado

`crearSesionMinijuego({ usuarioId, amistadId, tipo, ahora, secreto })` emite
`v1.<cuerpo>.<firma>`, donde `cuerpo` es el JSON del vinculo mas el epoch de
inicio en base64url, y `firma` es un HMAC-SHA256 sobre `v1.<cuerpo>`.

La clave se **deriva** del secreto de sesion, no es el secreto de sesion:
`HMAC(secreto, "moodmatch.minijuegos.sesion.v1")`. Filtrar una no permite
firmar la otra. La ruta inyecta `JWT_SECRET` como `secreto`; el modulo puro no
lo lee del entorno ni conoce el middleware.

El estado viaja firmado dentro del ticket, asi que **no hay tabla, ni columna,
ni migracion**. `verificarSesionMinijuego(sesion, contexto)` comprueba en este
orden y devuelve `{ valida: false, motivo }` sin lanzar:

| Motivo | Cuando |
| --- | --- |
| `SESION_AUSENTE` | No llego ticket o no es texto |
| `SESION_FORMATO` | No son tres partes, otra version o cuerpo vacio |
| `SESION_FIRMA` | El HMAC no coincide — cubre cualquier manipulacion del cuerpo |
| `SESION_VINCULO` | Firma valida pero `(usuario, amistad, tipo)` no es este |
| `SESION_EXPIRADA` | `ahora - inicio` supera el TTL |
| `SESION_DEMASIADO_RAPIDA` | `ahora - inicio` es menor que la duracion minima del tipo |

La firma se verifica **antes** de decodificar el cuerpo: nada de lo que se
interpreta despues proviene de un ticket que este backend no emitio. Los
motivos son precisos para el log, pero la respuesta agrupa casi todos bajo
`SESION_INVALIDA` para no ir narrandole a un cliente modificado que
comprobacion fallo.

Un contexto de servidor invalido (tipo desconocido, secreto vacio, `ahora` que
no es `Date`, ids no positivos) **lanza `TypeError`**: es un error de
programacion de la ruta, no una entrada rechazable del cliente.

### Duracion minima y TTL

- `SESION_MINIJUEGO_TTL_MS` = 30 min. Acota una partida olvidada abierta sin
  obligar a terminar con prisa. En el instante exacto del TTL aun es valida.
- `REGLAS_MINIJUEGO[tipo].duracionMinimaMs` = 3000 ms en ambos tipos. **No es
  un tiempo de reaccion humano**: es el piso que imponen los propios timers del
  juego. `ATRAPALA` encadena 8 rondas con 450 ms de pausa y `RITMO_CARINO` 5
  rondas con 720 ms de feedback, o sea 3600 ms reales en los dos casos. El
  margen de 600 ms existe para jitter de timers, no para dejar pasar nada.
- Una duracion negativa (reloj que retrocede, ticket fabricado) cae en
  `SESION_DEMASIADO_RAPIDA`. Nunca se acepta.
- Si se agregan tipos o se cambia el ritmo de un juego, hay que rederivar este
  piso desde sus constantes reales. Un piso por encima del real rechazaria
  partidas legitimas, que es peor que dejar pasar una.

### Lo que esto cubre y lo que no

Cubre: reportar una puntuacion sin haber abierto el juego, reutilizar un ticket
de otra mascota/tipo/persona, y retrasar el epoch para fingir una partida larga
(rompe la firma).

No cubre: un cliente modificado que abra la partida, espere de verdad 3 segundos
y reporte la puntuacion maxima. Certificar la ejecucion real del juego exigiria
validar la traza de eventos, y no se justifica para una economia acotada a una
recompensa diaria. **Ese sigue siendo el limite real: el cooldown, no el ticket.**

Un ticket **puede reenviarse**: no es de un solo uso, porque eso pediria estado
persistido. No hace falta — el segundo envio recibe `429` del cooldown, que ya
garantiza "a lo sumo una recompensa por ventana".

## 7. Marcador Cheer y atomicidad

Cada finalizacion se registra como un `Cheer` interno autocontenido. El prefijo
evita `_` y `%` para conservar semantica literal con un filtro Prisma
`startsWith`:

```text
MASCOTA.MINIJUEGO:<SEGMENTO>:<epoch>
```

Ejemplo:

```text
MASCOTA.MINIJUEGO:ATRAPALA:1785166200000
```

Los segmentos persistidos son `ATRAPALA` y `RITMO-CARINO`. El segundo no usa
el identificador API `RITMO_CARINO` literalmente para evitar que `_` actue como
comodin de `LIKE`. `prefijoMarcadorMinijuego(tipo)` es la unica forma de
construir el prefijo de consulta.

El marcador se dirige del usuario a si mismo:

```js
{
  fromUserId: userId,
  toUserId: userId,
  message: marcadorMinijuego(tipo, ahora.getTime()),
  seen: true,
  createdAt: ahora,
}
```

Esto permite consultar el ultimo marcador por `fromUserId`, `toUserId` y
`message: { startsWith: prefijoMarcadorMinijuego(tipo) }` sin mezclar mascotas
ni tipos.
No se envia notificacion y el marcador no se presenta como mensaje visible.

La fuente temporal canonica del cooldown es `Cheer.createdAt`, fijado con la
misma `Date ahora` capturada para la peticion. El epoch del texto es diagnostico
y no se parsea para decidir disponibilidad. Ausencia se representa con `null`;
un `createdAt` invalido es error interno, nunca permiso para volver a premiar.

El Agente A debe ejecutar como una sola operacion atomica:

0. Antes de abrir la transaccion: validar tipo y `amistadId`, correr
   `validarPayloadCompletar` y `verificarSesionMinijuego`. Todo lo que falle
   aqui responde su `errorMinijuego(motivo)` sin tocar la base.
1. Releer dentro de la transaccion la amistad y la mascota, y comprobar que el
   usuario pertenece al vinculo y que la mascota sigue aceptada y activa.
2. Comprobar el ultimo marcador global del usuario y tipo.
3. Si sigue en cooldown, terminar sin ninguna escritura y responder `429`.
4. Crear el marcador con `createdAt: ahora`.
5. Aplicar cariño, energia y monedas con `update`, nunca `upsert`.
6. Leer/construir el estado final necesario para devolver deltas efectivos.

Los pasos se ejecutan en una transaccion Prisma con aislamiento
`Serializable`. Los conflictos serializables `P2034` se reintentan con un
limite finito, usando la misma hora capturada para la peticion. Esto evita que
dos finalizaciones concurrentes, incluso contra mascotas distintas, entreguen
dos recompensas para el mismo `(usuario, tipo)`.

La migracion aditiva de energia/monedas debe agregar tambien un indice de apoyo
para el tracking, como `@@index([fromUserId, toUserId, createdAt])` en `Cheer`.
Se genera con `--create-only`, se revisa y no se aplica a Neon sin autorizacion
explicita del usuario.

Marcador y recompensa se confirman o revierten juntos. Un fallo despues de
crear el marcador no puede dejar una recompensa perdida, y un fallo despues de
actualizar la mascota no puede dejar una recompensa sin cooldown.

No hay idempotency key en el request. La garantia es de efecto "a lo sumo una
recompensa por ventana": un reintento posterior a un commit no vuelve a sumar y
recibe `429`; un reintento de una transaccion abortada puede completar una vez.
Si el cliente pierde la respuesta `201`, puede refrescar el detalle para ver el
estado confirmado, pero no se promete reproducir la respuesta original.

## 8. Recompensas nominales

`recompensaMinijuego(tipo, puntuacion)` calcula estas recompensas puras:

| Tipo | Puntuacion valida | Energia | Carino | Monedas |
| --- | --- | --- | --- | --- |
| `ATRAPALA` | entero `0..8` | `2 * puntuacion` | `0` | `min(3, 1 + floor(puntuacion / 3))` |
| `RITMO_CARINO` | entero `0..10` | `0` | `puntuacion` | `min(3, 1 + floor(puntuacion / 4))` |

La funcion rechaza tipo o puntuacion invalidos; nunca corrige la entrada. El
adaptador de persistencia calcula el delta efectivo al aplicar topes y ese es
el valor que expone la API.

### Balances persistidos que consume el contrato

- `MascotaAmistad.energia`: entero compartido, `@default(50)`, rango de producto
  `0..100`. `ATRAPALA` aplica `min(100, energia + deltaNominal)`.
- `MascotaAmistad.monedas`: entero compartido, `@default(0)`, minimo `0` y sin
  maximo de producto. El nombre visible sigue siendo "semillitas".
- `MascotaAmistad.nivelCarino`: campo existente; `recompensa.carino` se suma a
  este campo. Mantiene su minimo actual y no gana un tope nuevo.

Los campos nuevos y el indice pertenecen a la migracion aditiva del Agente A.
Este contrato no autoriza por si solo aplicarla en Neon.

## 9. Modulos del contrato

### Backend — `backend/lib/minijuegos.js`

CommonJS, no importa Prisma, no lee `process.env` y solo usa `crypto` (builtin,
sin dependencias nuevas). Exporta:

- `TIPOS_MINIJUEGO`, `REGLAS_MINIJUEGO`, `SEGMENTOS_MARCADOR`
- `COOLDOWN_MINIJUEGO_MS`, `PREFIJO_MINIJUEGO`, `SESION_MINIJUEGO_TTL_MS`
- `ERRORES_MINIJUEGO`
- `validarTipoMinijuego(tipo)`
- `validarPuntuacionMinijuego(tipo, puntuacion)`
- `validarPayloadCompletar(body, tipo)`
- `marcadorMinijuego(tipo, epoch)`
- `prefijoMarcadorMinijuego(tipo)`
- `estadoCooldownMinijuego(ultimaFinalizacionMs, ahora)`
- `crearSesionMinijuego({ usuarioId, amistadId, tipo, ahora, secreto, nonce })`
- `verificarSesionMinijuego(sesion, { usuarioId, amistadId, tipo, ahora, secreto })`
- `errorMinijuego(motivo)`
- `recompensaMinijuego(tipo, puntuacion)`

Los validadores devuelven booleanos o `{ ok, motivo }`. `marcadorMinijuego`,
`recompensaMinijuego`, `crearSesionMinijuego` y `errorMinijuego` lanzan ante
datos invalidos para que un llamador no pueda persistir silenciosamente un tipo
abierto, una puntuacion corregida o devolver un error que no existe.

`nonce` es opcional y solo se pasa en tests, para que el ticket sea
reproducible. En produccion se genera aleatorio.

### Cliente — `app/mascota/minijuegos/contrato.js`

ES modules. Es lo unico del cliente que conoce el shape de la API; `logica.js`
queda para la mecanica de cada juego. Exporta:

- `RECOMPENSAS`, `TIPOS_RECOMPENSA`, `ENERGIA_MAXIMA`, `CODIGO_DESCANSO`
- `esEstadoCooldown(valor)` y `normalizarEstadosMinijuego(valor)` — el detalle
  trae los dos tipos o se considera no disponible; una seccion no ofrece un
  juego que el backend todavia no sabe resolver.
- `recompensasVisibles(recompensa)` — unica tabla de icono y etiqueta por tipo
  de recompensa. "semillitas" se escribe aqui y en ningun otro lado.
- `validarRespuestaIniciar(data)` y `validarRespuestaCompletar(data, ctx)` —
  lanzan `Respuesta inválida del minijuego` en vez de pintar datos incoherentes.
  Un `201` que devuelva el juego recien jugado como disponible se rechaza.
- `interpretarErrorMinijuego(error)` — traduce `codigo`/`status` a
  `{ codigo, titulo, mensaje, disponibleEn, reintentable, requiereNuevaPartida }`.
  `reintentable` distingue el corte de red (el resultado local sobrevive y el
  mismo POST puede prosperar) del ticket rechazado (repetirlo no cambia nada:
  el camino es volver a jugar).

## 10. Invariantes de seguridad y tono

- Autenticacion y pertenencia a la amistad se verifican antes de exponer o
  modificar la mascota. La escritura vuelve a usar exclusivamente el
  `userId` autenticado; nunca un id recibido en el body.
- Una amistad ajena y una mascota inexistente/inactiva comparten `404` para no
  filtrar su existencia.
- El cliente reporta `puntuacion` y devuelve el ticket; el backend valida
  tipo, rango y duracion minima, y es autoridad de recompensa, epoch y
  disponibilidad. Ningun instante lo aporta el cliente: el inicio viaja firmado
  por el propio servidor y el fin es la hora de la peticion.
- Este contrato limita el abuso a una recompensa diaria y descarta los reportes
  que nunca abrieron el juego, pero no certifica la ejecucion real de la partida
  ante un cliente modificado. Ver la seccion 6 para el alcance exacto.
- Los marcadores internos no aceptan texto del usuario, no disparan push y no
  deben aparecer en conversaciones.
- No hay tabla de posiciones, comparacion entre personas, castigo por no jugar,
  perdida de semillitas ni mensajes de urgencia.
- La UI celebra lo obtenido sin sugerir que una puntuacion baja decepciona a la
  mascota. El cooldown se presenta como descanso, no como sancion.

## 11. Coordinacion A/B

- El Agente B es propietario de este contrato, del modulo puro de backend, del
  modulo de contrato del cliente y de sus tests.
- El Agente A es propietario de rutas, Prisma, migraciones, consultas,
  transaccion/retry y del adaptador que calcula deltas efectivos.
- A consume las constantes y funciones de B; no duplica ni reinterpreta rangos,
  formulas, duracion del cooldown, duracion minima ni copia de errores.
- B no modifica rutas ni Prisma. Cualquier cambio del shape acordado se coordina
  antes de integrar para mantener backend y frontend sobre el mismo contrato.

### Cambio pendiente de implementar por A (2026-07-28)

La revision de contratos agrego el endpoint `iniciar`, el campo `sesion` en
`completar`, el campo `codigo` en los errores y la validacion de duracion
minima. El cliente ya lo consume; **falta la ruta**, que sigue sin existir en
`backend/routes/mascota.js`. Para A esto significa:

1. Montar `POST .../iniciar`: `requireAuth`, validar tipo y `amistadId`,
   comprobar pertenencia y estado de la mascota, comprobar cooldown y devolver
   `crearSesionMinijuego({ ..., secreto: JWT_SECRET })`. Sin escrituras.
2. En `completar`, antes de la transaccion: `validarPayloadCompletar` y
   `verificarSesionMinijuego` con el mismo `JWT_SECRET` y la misma `Date ahora`
   de la peticion.
3. Devolver los errores exclusivamente via `errorMinijuego(motivo)`, agregando
   `disponibleEn` solo en el `429`.

Nada de esto necesita columnas nuevas: el ticket es autocontenido. La migracion
aditiva de energia/monedas y el indice de `Cheer` siguen siendo los mismos de
antes y siguen requiriendo autorizacion explicita del usuario para aplicarse.
