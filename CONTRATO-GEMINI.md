# CONTRATO-GEMINI.md — chat de emociones con IA

Documento **autoritativo** del contrato de integración entre el backend
(endpoint de IA), el frontend (pantalla de chat) y el Escudo de Crisis.
Escrito por el Agente D (Guardrails); A, B y C construyen contra esto.

> **Nota de nombre:** este contrato fija `POST /api/chat/respond` y reemplaza
> al nombre provisional `/api/chat/emocional` que aparecía en
> docs/fases/FASE6-wellness-hub.md (Parte D). Implementar `/respond`.

> **Fase 15 — identidad y memoria.** Las secciones 5 y 6 son nuevas: reescriben
> quién es el bot y le dan memoria entre sesiones. La **sección 2 (guardrails)
> no cambió ni una palabra**: la identidad nueva se construye alrededor del
> escudo de crisis, nunca a costa de él. Si alguna vez las dos partes de este
> documento parecen chocar, manda la sección 2.

---

## 1. Endpoint: `POST /api/chat/respond`

- Router nuevo `backend/routes/chat.js`, montado en `backend/index.js` como
  `app.use('/api/chat', require('./routes/chat'))`.
- Protegido con `requireAuth` (`Authorization: Bearer <token>`), igual que el
  resto de la API.
- La clave de Gemini se lee de `process.env.GEMINI_API_KEY` (ver
  `backend/.env.example`). **Nunca** va en el frontend ni en el repositorio;
  en producción se configura en el dashboard de Render.

### Request

```json
{
  "mood": "TRISTE",
  "mensaje": "texto libre del usuario",
  "historial": [
    { "autor": "usuario", "texto": "..." },
    { "autor": "bot", "texto": "..." }
  ],
  "continuar": false
}
```

| Campo | Tipo | Reglas |
|---|---|---|
| `mood` | string | **Obligatorio.** Uno de los 6 `MOOD_KEYS`: `FELIZ`, `TRISTE`, `ANSIOSO`, `CALMADO`, `ENOJADO`, `NEUTRO` (misma lista que `theme/tokens.js` y `VALID_MOODS` del backend). |
| `mensaje` | string | **Obligatorio, no vacío** (tras trim). |
| `historial` | array | Opcional. Turnos previos en orden cronológico, cada uno `{ autor: "usuario"\|"bot", texto: string }`. Máximo **40 mensajes** (Fase 15; eran 8); si llega más largo, el backend **trunca conservando los últimos 40**. El tope subió porque la charla extendida de Fase 9 pasa fácil de 20 turnos y con la ventana corta el bot perdía el hilo de lo que la persona le había contado antes. El cliente aplica el mismo tope en `historialParaIA` (`MAX_HISTORIAL_IA`). |
| `continuar` | boolean | Opcional (Fase 9, conversación extendida). `true` cuando la sesión **ya registró su MoodEntry** y el usuario sigue charlando: el backend **nunca fuerza `terminar`** ni pide cierre a Gemini (`esUltimo: false`). Los guardrails (doble escudo de crisis, system prompt de tono, validador post-respuesta) corren **igual en cada turno**. Solo el booleano `true` activa el modo; cualquier otro valor se ignora. |

### Response `200` — siempre que la petición sea válida

```json
{
  "respuesta": "texto del bot",
  "fuente": "gemini",
  "terminar": false
}
```

| Campo | Tipo | Semántica |
|---|---|---|
| `respuesta` | string | Texto que el frontend muestra como mensaje del bot. |
| `fuente` | `"gemini"` \| `"plantilla"` | De dónde salió la respuesta. **El fallo del modelo NUNCA es un 5xx**: si Gemini falla, hay rate-limit (la capa gratuita da ~1.500 req/día) o la respuesta viola tono, el backend responde por plantilla y lo declara aquí. |
| `terminar` | boolean | `true` cuando el backend decide cerrar la conversación (alcanzado `MAX_INTERCAMBIOS = 4`, el mismo del reducer `conversacion.js`). El frontend pasa entonces al registro del MoodEntry, como hoy. Con `continuar: true` en el request es **siempre `false`**: la conversación extendida no tiene cierre por conteo. |

### Errores

| Código | Cuándo | Body |
|---|---|---|
| `400` | `mood` fuera de la lista o `mensaje` vacío | `{ "error": "..." }` |
| `401` | Sin token / token inválido (lo maneja `requireAuth`) | `{ "error": "Token requerido" }` |

Nada más. Todo problema con el modelo es **fallback transparente**, no error.

---

## 2. Guardrails obligatorios del endpoint (implementador: Agente B)

1. **Doble escudo de crisis.**
   - Primera capa (frontend): `useCrisisShield()` corre ANTES de llamar a
     este endpoint. Si `omitirIA === true`, la llamada **no se hace** — un
     mensaje con señales de crisis no debe salir del dispositivo hacia
     Gemini (capa gratuita: Google puede usar los datos enviados).
   - Segunda capa (backend): el endpoint corre la MISMA detección (los
     patrones de `app/features/emociones/crisis.js`, replicados o importados
     según convenga al build del backend) sobre `mensaje` **antes** de llamar
     a Gemini. Si da positivo: responde por plantilla con
     `fuente: "plantilla"` y **no llama a Gemini**. Esta capa existe por si
     el frontend viejo no trae el escudo.
2. **System prompt con las reglas de tono de siempre** (CLAUDE.md sección 2):
   nunca minimizar, nunca diagnosticar, nunca positividad forzada en
   TRISTE/ANSIOSO/ENOJADO, validar primero y sugerir después, respuestas
   breves (2-4 intercambios), no simular terapia.
3. **Validador post-respuesta:** antes de devolver texto de Gemini, se
   normaliza (equivalente a `normalizar()` de `crisis.js`) y se verifica
   contra las listas de `app/features/emociones/tono.js`:
   - `LISTA_NEGRA_UNIVERSAL` — siempre.
   - `LISTA_NEGRA_POSITIVIDAD` — si `mood` ∈ `MOODS_DIFICILES`
     (`TRISTE`, `ANSIOSO`, `ENOJADO`).
   Si alguna frase aparece → descartar la respuesta del modelo y responder
   por plantilla (`fuente: "plantilla"`). La respuesta del modelo tampoco
   debe contener teléfonos ni recursos de crisis propios: esa pieza es
   exclusiva de `MENSAJE_CRISIS` (capa de reglas, no del modelo).
4. **Este endpoint NO crea MoodEntries.** El registro sigue siendo
   `POST /api/mood-entries` al cerrar la conversación, como hoy.

### Tope de largo (único parámetro que Fase 15 movió)

`validarTono(texto, mood, { largoMaximo })` acepta un tope opcional. El default
sigue siendo **600 caracteres** y no cambió. El route pasa
`LARGO_MAXIMO_RELATO` (1100) **solo** cuando el mensaje del usuario pide de
forma explícita una historia o un chiste, detectado con la regex determinista
`pideRelato()` — nunca a criterio del modelo.

Es una garantía de **brevedad**, no de seguridad: con el tope extendido, la
detección de crisis, las dos listas negras y el filtro de recursos de crisis
corren exactamente igual sobre el texto más largo. Sin esto, el bot no puede
cumplir un pedido explícito de historia: el validador la descartaría por larga
y saldría plantilla, que es justo el comportamiento que Fase 15 vino a corregir.

---

## 3. Qué espera el frontend (integrador: pantalla de chat)

- Cliente nuevo en `app/services/api.js` (patrón `authHeaders()` existente):

  ```js
  export const apiChatRespond = async (mood, mensaje, historial = []) => { ... }
  ```

- Mapear `respuesta` a un mensaje del shape que ya maneja el reducer:
  `{ id, autor: 'bot', tipo: 'texto', texto: respuesta }`.
- `fuente` no se muestra al usuario (es telemetría/debug).
- Con `terminar: true`, disparar el flujo de cierre existente (fase
  `creandoEntrada` → `POST /api/mood-entries`).
- **Fase 9 — conversación extendida:** tras crear el MoodEntry la conversación
  sigue en fase `charla` (reducer `conversacion.js`): el frontend manda
  `continuar: true` en cada turno posterior y **sigue pasando cada texto por el
  escudo** (`useCrisisShield`) antes de llamar. La charla extendida no crea
  MoodEntries nuevos; "Registrar otra emoción" (REINICIAR) inicia otra sesión.
- **Antes de CADA llamada**, pasar el texto por el escudo:

  ```js
  const { evaluar, reset } = useCrisisShield(); // reset() en REINICIAR
  const { omitirIA, mensajeCrisis } = evaluar(texto);
  if (omitirIA) {
    // 1) si mensajeCrisis !== null → agregar burbuja tipo 'crisis'
    //    (ChatBubble ya la renderiza con los teléfonos en negrita)
    // 2) responder este turno por plantilla local — NO llamar a la API
  }
  ```

- Si la red falla (fetch rechazado), el frontend cae a la respuesta por
  plantilla local del guion — la app nunca muestra un error del modelo.

## 4. Identidad del bot (Fase 15)

Construida en `systemPrompt()` de `backend/lib/gemini.js`. Las **7 reglas no
negociables** de la sección 2 se emiten literales en cada llamada, sin importar
qué señales o memoria traiga el turno — hay un test que las verifica para los 6
moods con memoria, humor y relato activos a la vez.

**Qué cambió.** El bot pasó de "acompañante de una app de bienestar" a un
compañero de conversación. Mucha gente abre este chat justamente porque no
tiene con quién más hablar: la respuesta correcta es conversar de igual a
igual, no despachar consejos.

**Las tres correcciones concretas**, cada una con su causa:

1. **Negativa rígida.** El bot se negaba a contar historias o chistes citando
   la regla de no forzar el cambio de humor. Era una malinterpretación: el
   prompt ahora dice explícitamente que *cumplir lo que la persona pidió no es
   forzarle un cambio de ánimo — lo prohibido es que el bot intente cambiárselo
   por su cuenta*, y que negarse citando las reglas es un error. La regla 4
   sigue intacta.
2. **Pregunta de cierre automática.** El prompt decía "máximo UNA pregunta", que
   se leía como licencia. Ahora pide no preguntar por costumbre y nunca en dos
   respuestas seguidas. Además se refuerza mecánicamente: `senalesDeHistorial()`
   revisa si los **dos últimos turnos del bot terminan en `?`** y, si es así,
   inyecta una orden explícita de no preguntar en este turno.
3. **Insistencia con "Para mí".** `HUB_POR_MOOD` se inyectaba en **cada** turno
   diciendo "menciónalo una sola vez" — y el modelo lo cumplía cada vez, porque
   no tiene memoria de haberlo hecho. Ahora la sugerencia del Hub se inyecta
   solo si (a) ningún turno de bot del historial ya la mencionó
   (`hubMencionado`), y (b) la memoria no trae `preferencias.sugerirHub: false`.

El patrón de fondo: **lo que el modelo no puede recordar, se lee del historial y
se apaga en origen.** No se le pide al prompt que se acuerde de nada.

---

## 5. Memoria entre sesiones (Fase 15)

Vive en `User.memoriaChat` (columna `JSONB` nullable, migración
`fase15_memoria_chat`) y toda su lógica está en `backend/lib/memoriaChat.js`.
Es **100% backend**: `requireAuth` ya entrega `req.user.userId`, así que **el
contrato de request/response de la sección 1 no cambió** y el frontend no
necesita saber que existe.

> Subir el límite de truncado del historial **no** resuelve esto: el historial
> lo arma el reducer, que nace de cero en cada montaje y en cada `REINICIAR`.
> Nada cruzaba la sesión. Los 40 turnos son otra mejora, la de coherencia
> dentro de una conversación larga.

### Shape

```json
{
  "version": 1,
  "actualizada": "2026-07-22T21:00:00.000Z",
  "apodo": "Fran",
  "preferencias": { "sugerirHub": true, "humor": "neutro" },
  "notas": [{ "t": "Tiene un gato que se llama Suco.", "d": "2026-07-20" }]
}
```

Máximo **10 notas** de **140 caracteres**. `sanearMemoria()` aplica una
whitelist estricta al leer: cualquier clave fuera del esquema se descarta, y un
JSON corrupto degrada a memoria vacía en vez de propagar basura al prompt.

### Capa 1 — Directivas (reglas, sin modelo)

Lo que la persona **pide** sobre cómo hablarle. Se detecta con regex sobre su
mensaje, no con el modelo: que el bot deje de insistir tiene que ser una
garantía mecánica y testeable, no una esperanza sobre el prompt.

| Directiva | Ejemplo | Efecto |
|---|---|---|
| Dejar de sugerir el Hub | "deja de recordarme lo de Para mí" | `sugerirHub: false`, permanente |
| Apodo | "llámame Fran" | `apodo` |
| Humor | "me gustan los chistes" / "no me hagas bromas" | `humor: prefiere\|evita` |

Se aplica **en el mismo turno** (no hay que esperar a la sesión siguiente) y se
persiste al vuelo. Apagar el Hub exige que en el mismo mensaje haya un pedido de
parar **y** una referencia al Hub, para que un "no me recuerdes a mi ex" no lo
apague por error.

### Capa 2 — Notas destiladas (extractor validado)

Lo que la persona **contó**. `extraerMemoria()` corre *fire-and-forget después
de responder*, así que su latencia no la paga el turno del usuario, y con
throttle: al cerrar la conversación siempre, y en charla extendida como mucho
una vez cada 10 minutos (~1 request extra por conversación sobre los ~1.500/día
del free tier).

**Nada de lo que devuelve el extractor se guarda sin pasar `notaAceptable()`**,
que encadena, en este orden:

1. `detectarCrisis()` — los mismos patrones de siempre.
2. `PATRONES_RIESGO_NOTA` — filtro de tema **exclusivo de la memoria**. Existe
   porque los patrones de crisis están escritos en primera persona ("me quiero
   morir") y una nota es un resumen en tercera ("quiere desaparecer"), así que
   se les escapaba. En vez de estirar los patrones compartidos —que no se
   tocan— la memoria suma los suyos, deliberadamente amplios: un falso positivo
   solo cuesta una nota que no se guarda, y ese es el lado correcto en el que
   equivocarse.
3. `validarTono(nota, 'TRISTE')` — el filtro más estricto (universal +
   positividad forzada). Cubre "depresion", "trastorno", "diagnos".
4. `MARCADORES_INFERENCIA` — "parece que", "probablemente", "padece", "la causa
   de"… Implementa la regla de Fase 15: *solo patrones que el usuario registró
   explícitamente, nunca inferir causas psicológicas no declaradas*.

El mismo filtro corre **también en lectura**: si algo entró por una versión
vieja del extractor, no llega al system prompt.

### Relación con el escudo de crisis

**El escudo corta antes que todo.** Si `detectarCrisis(mensaje)` da positivo, el
endpoint responde `MENSAJE_CRISIS` y retorna: no lee memoria, no escribe
memoria, no llama a Gemini y no despierta al extractor. La memoria no replica,
no reemplaza y no participa del escudo — y una directiva de tono en el mismo
mensaje no sirve de vehículo para saltárselo (hay test).

---

## 6. Escudo de Crisis — referencia

- Hook: `app/features/emociones/useCrisisShield.js` (`useCrisisShield`,
  núcleo puro `evaluarEscudo`). Contrato completo en su docblock.
- Patrones: única fuente en `app/features/emociones/crisis.js` (11 originales
  + 3 de Fase 8). La burbuja se muestra máx. 1 vez por conversación, no
  alarma y **nunca bloquea el flujo** — pero `omitirIA` sigue `true` en cada
  mensaje de crisis posterior.
- Tests: `crisis.test.js` (patrones y guardas), `crisisShield.test.js`
  (semántica del escudo), `guiones.test.js` (tono, importa `tono.js`).
