# CONTRATO-GEMINI.md — Fase 8: chat de emociones con IA

Documento **autoritativo** del contrato de integración entre el backend
(endpoint de IA), el frontend (pantalla de chat) y el Escudo de Crisis.
Escrito por el Agente D (Guardrails); A, B y C construyen contra esto.

> **Nota de nombre:** este contrato fija `POST /api/chat/respond` y reemplaza
> al nombre provisional `/api/chat/emocional` que aparecía en
> FASE6-wellness-hub.md (Parte D). Implementar `/respond`.

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
  ]
}
```

| Campo | Tipo | Reglas |
|---|---|---|
| `mood` | string | **Obligatorio.** Uno de los 6 `MOOD_KEYS`: `FELIZ`, `TRISTE`, `ANSIOSO`, `CALMADO`, `ENOJADO`, `NEUTRO` (misma lista que `theme/tokens.js` y `VALID_MOODS` del backend). |
| `mensaje` | string | **Obligatorio, no vacío** (tras trim). |
| `historial` | array | Opcional. Turnos previos en orden cronológico, cada uno `{ autor: "usuario"\|"bot", texto: string }`. Máximo **8 mensajes**; si llega más largo, el backend **trunca conservando los últimos 8** (regla de brevedad: 2-4 intercambios). |

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
| `terminar` | boolean | `true` cuando el backend decide cerrar la conversación (alcanzado `MAX_INTERCAMBIOS = 4`, el mismo del reducer `conversacion.js`). El frontend pasa entonces al registro del MoodEntry, como hoy. |

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

## 4. Escudo de Crisis — referencia

- Hook: `app/features/emociones/useCrisisShield.js` (`useCrisisShield`,
  núcleo puro `evaluarEscudo`). Contrato completo en su docblock.
- Patrones: única fuente en `app/features/emociones/crisis.js` (11 originales
  + 3 de Fase 8). La burbuja se muestra máx. 1 vez por conversación, no
  alarma y **nunca bloquea el flujo** — pero `omitirIA` sigue `true` en cada
  mensaje de crisis posterior.
- Tests: `crisis.test.js` (patrones y guardas), `crisisShield.test.js`
  (semántica del escudo), `guiones.test.js` (tono, importa `tono.js`).
