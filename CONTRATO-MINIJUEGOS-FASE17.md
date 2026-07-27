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

## 2. Endpoint de finalizacion

El Agente A implementara:

```http
POST /api/mascota/:amistadId/minijuegos/:tipo/completar
Authorization: Bearer <token>
Content-Type: application/json
```

Body:

```json
{
  "puntuacion": 8
}
```

`puntuacion` debe ser un numero entero dentro del rango del tipo. No se
convierten strings, no se redondean decimales y no se hace clamp silencioso.
Una puntuacion `0` es una finalizacion valida: entrega la recompensa nominal
correspondiente y consume el cooldown.

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

| Codigo | Cuando | Body minimo |
| --- | --- | --- |
| `400` | `amistadId` invalido, tipo desconocido, body ausente o puntuacion no entera/fuera de rango | `{ "error": "..." }` |
| `401` | Token ausente o invalido | `{ "error": "Token requerido" }` o la respuesta vigente de `requireAuth` |
| `404` | La amistad no pertenece al usuario o la mascota no existe, no esta aceptada o no esta activa | `{ "error": "Mascota no encontrada" }` |
| `429` | El usuario completo ese mismo tipo durante las ultimas 24 horas | Ver abajo |

Respuesta `429`:

```json
{
  "error": "Este minijuego está tomando una pausa. Podrás volver a jugar más adelante.",
  "disponibleEn": "2026-07-28T15:30:00.000Z"
}
```

La copia puede ajustarse si conserva ese tono suave: informa disponibilidad,
no culpa, no habla de fallar una racha y no presiona para volver.

## 3. Detalle de mascota

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

## 4. Cooldown rodante

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

## 5. Marcador Cheer y atomicidad

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

## 6. Recompensas nominales

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

## 7. Modulo de dominio

`backend/lib/minijuegos.js` es CommonJS, no importa Prisma y exporta:

- `TIPOS_MINIJUEGO`
- `REGLAS_MINIJUEGO`
- `SEGMENTOS_MARCADOR`
- `COOLDOWN_MINIJUEGO_MS`
- `PREFIJO_MINIJUEGO`
- `validarTipoMinijuego(tipo)`
- `validarPuntuacionMinijuego(tipo, puntuacion)`
- `marcadorMinijuego(tipo, epoch)`
- `prefijoMarcadorMinijuego(tipo)`
- `estadoCooldownMinijuego(ultimaFinalizacionMs, ahora)`
- `recompensaMinijuego(tipo, puntuacion)`

Los validadores devuelven booleanos. `marcadorMinijuego` y
`recompensaMinijuego` lanzan ante datos invalidos para que un llamador no pueda
persistir silenciosamente un tipo abierto o una puntuacion corregida.

## 8. Invariantes de seguridad y tono

- Autenticacion y pertenencia a la amistad se verifican antes de exponer o
  modificar la mascota. La escritura vuelve a usar exclusivamente el
  `userId` autenticado; nunca un id recibido en el body.
- Una amistad ajena y una mascota inexistente/inactiva comparten `404` para no
  filtrar su existencia.
- El cliente reporta `puntuacion`; el backend valida tipo/rango y es autoridad
  de recompensa, epoch y disponibilidad. Este contrato limita abuso a una
  recompensa diaria, pero no pretende certificar la ejecucion del juego ante un
  cliente modificado. Si la economia futura lo requiere, se agrega una sesion de
  partida firmada en otro contrato.
- Los marcadores internos no aceptan texto del usuario, no disparan push y no
  deben aparecer en conversaciones.
- No hay tabla de posiciones, comparacion entre personas, castigo por no jugar,
  perdida de semillitas ni mensajes de urgencia.
- La UI celebra lo obtenido sin sugerir que una puntuacion baja decepciona a la
  mascota. El cooldown se presenta como descanso, no como sancion.

## 9. Coordinacion A/B

- El Agente B es propietario de este contrato, del modulo puro y de sus tests.
- El Agente A es propietario de rutas, Prisma, migraciones, consultas,
  transaccion/retry y del adaptador que calcula deltas efectivos.
- A consume las constantes y funciones de B; no duplica ni reinterpreta rangos,
  formulas o duracion del cooldown.
- B no modifica rutas ni Prisma. Cualquier cambio del shape acordado se coordina
  antes de integrar para mantener backend y frontend sobre el mismo contrato.
