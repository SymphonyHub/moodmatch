# MoodMatch — Fase 6: Wellness Hub Unificado + Merge de las 4 ramas actuales

Este documento va en la raíz de `MoodMatch` y define dos cosas: (A) el
protocolo para cerrar el ciclo actual (probar y mergear las 4 ramas ya
terminadas), y (B) la siguiente ronda de trabajo con los mismos 4 agentes.

Si en algún punto una tarea requiere más profundidad de la que un agente
puede manejar sin pisar a otro, se evalúa sumar un 5to agente — por ahora
se trabaja con los 4 existentes.

---

## PARTE A — Cerrar el ciclo actual (hacer esto primero, antes de la Fase 6)

### Estado de las 4 ramas (todas terminadas, pendientes de prueba visual)

| Rama | Qué trae | Pendiente |
|---|---|---|
| `feature/ajustes-personalizacion` | Paleta custom + WCAG, ThemeProvider extendido, tests | Probar en dispositivo |
| `feature/navbar-footer` | Navbar con píldora deslizante, header plano | Probar en dispositivo, falta commit final |
| `feature/emociones-chat` | Chat de ánimo por reglas (6 emociones, respuestas preestablecidas + texto libre), burbuja de crisis | Probar en dispositivo |
| `feature/amigos-rework` | Chat 1:1, invitación por link, badges | Probar en dispositivo |

### Checklist de prueba visual (usuario, no delegable)

Para cada rama, instalar/correr en dispositivo y verificar:
- Los 6 ánimos de punta a punta muestran tono correcto (nunca minimizar,
  siempre validar primero)
- Texto libre en el chat de ánimo llega como nota al registro
- Frase de crisis (ej. "no quiero seguir viviendo") activa la burbuja con
  teléfonos de ayuda, sin alarmismo, sin bloquear el flujo
- "Quiero otra idea" repetido no duplica el registro en la base de datos
- Salir de la pantalla a mitad de conversación no crea un registro a medias
- Los 5 temas + Personalizado se ven legibles (contraste) en cada pantalla
- Navbar: píldora desliza bien entre las 4 tabs, header queda coherente
- Amigos: chat 1:1 funciona en ambos sentidos, invitación por link
  funciona (recordar: el deep link `moodmatch://` solo funciona en build
  nativo, no en Expo Go)

### Orden de merge (uno a la vez, con test entre cada uno)

```
git checkout main
git merge feature/ajustes-personalizacion   && npm test
git merge feature/navbar-footer             && npm test
git merge feature/emociones-chat            && npm test
git merge feature/amigos-rework
```

**En el último merge (Amigos) va a aparecer el conflicto ya anticipado en
`home.jsx`**: la rama de Emociones reescribió ese archivo conservando el
modal de "cheers" (enviar ánimo) heredado del diseño anterior. Resolución
correcta: **eliminar ese modal** — quedó reemplazado por el flujo de chat
de emociones nuevo. Después de resolver el conflicto:
```
npm test
npx expo run:android
```
y volver a recorrer el checklist completo en dispositivo antes de dar por
cerrado el ciclo.

---

## PARTE B — Fase 6: Wellness Hub Unificado

### Contexto de lo que se pide

Tras probar la app ya mergeada, se detectaron 2 cosas a reestructurar:

**1. El botón "Invitar a un amigo" está mal ubicado.** Hoy vive en la
pantalla de lista de Amigos. Debe moverse a la pantalla **Mi QR**, junto al
QR — porque esa es conceptualmente la pantalla de "agregar amigos", no la
de lista de amigos ya agregados.

**2. Las sugerencias de actividad están fragmentadas y sin lógica de
desbloqueo.** Hoy existen dos fuentes de sugerencias separadas y sin
relación:
   - Las que aparecen dentro del chat de emociones (basadas en el ánimo
     registrado)
   - Las de "Para hacer con amigos" (estáticas, en la pantalla de Amigos)

Se unifican en una sola sección tipo **Wellness Hub**, con dos pestañas:
   - **"Para mí"**: sugerencias individuales, alimentadas por el ánimo que
     el usuario registró en el chat de emociones
   - **"Con amigos"**: sugerencias para hacer en compañía

La pestaña "Con amigos" debe estar **bloqueada si el usuario tiene 0
amigos** (mostrar un estado claro de "agrega un amigo para desbloquear
esto", con acceso directo a Mi QR) y **desbloquearse automáticamente** en
cuanto tenga 1 o más amigos agregados, con una transición animada al
desbloquear (no un cambio brusco).

---

### Matriz de asignación — Fase 6

| Agente | Rama nueva | Responsabilidad |
|---|---|---|
| **A (Navbar/Layout)** | `feature/wellness-hub-layout` | Estructura base del Wellness Hub: contenedor con las 2 pestañas ("Para mí" / "Con amigos"), navegación entre ellas, y el patrón visual de bloqueo/desbloqueo |
| **B (Emociones)** | `feature/wellness-hub-individual` | Migrar las sugerencias que hoy viven dentro del chat hacia la pestaña "Para mí" del Wellness Hub, conectadas al último ánimo registrado |
| **C (Amigos/QR)** | `feature/qr-invite-move` | Mover el botón "Invitar a un amigo" desde la lista de Amigos hacia la pantalla Mi QR (junto al QR). Migrar el contenido de "Para hacer con amigos" hacia la pestaña "Con amigos" del Wellness Hub, e implementar la lógica de bloqueo/desbloqueo según `friendsCount` |
| **D (Ajustes/Core)** | `feature/friendscount-hook` | Crear (si no existe ya) un hook/contexto global de `friendsCount` que A y C puedan consumir sin llamadas duplicadas al backend |

**Dependencia de orden:** D debe dejar el hook de `friendsCount` commiteado
primero (es rápido), porque A necesita el patrón de bloqueo y C necesita el
número real para decidir cuándo desbloquear. Una vez que D lo deja listo,
A, B y C pueden trabajar en paralelo sin bloquearse entre sí — B y C no
dependen uno del otro directamente, solo ambos alimentan contenido a la
estructura que arma A.

### Pulido general (aplica a todos, en cada fase)

- Mantener la regla de geometría de 8px y los 5 temas + Personalizado
  funcionando en toda pantalla nueva
- Transiciones con física de resortes consistentes con el resto de la app
- Cualquier mejora visual o de posicionamiento adicional que el agente
  detecte dentro de su dominio es bienvenida — proponerla en el plan mode
  antes de implementarla, no como sorpresa en el resultado final

---

## Protocolo (igual que las fases anteriores)

1. Cada agente trabaja en su propio worktree, nunca directo en `main`
2. Plan mode obligatorio antes de tocar código, esperar confirmación
3. D primero (hook de `friendsCount`), después A, B y C pueden ir en
   paralelo
4. Al terminar, cada agente solicita confirmación antes de que el usuario
   pruebe visualmente
5. Merge a `main` uno a la vez, con test entre cada uno — mismo patrón que
   la Parte A de este documento

---

## PARTE C — Fase 7: Historial de Ánimo con Mensaje de Progreso

**Se ejecuta después de que la Fase 6 esté mergeada y probada.**

Se descarta la idea del quiz de onboarding y el "perfil adaptativo" que
adivina cómo se siente el usuario — quedó decidido que es más complejidad
de la que se necesita. En su lugar: el inicio del chat de emociones se
mantiene exactamente como está ahora (pregunta "¿cómo estás hoy?", el
usuario elige una de las 6 opciones, empieza el chat). Lo único nuevo es
qué se hace con el **historial** de esos registros.

### Qué se pide

En la sección donde se pueda ver el historial de ánimos registrados
(agregar esta vista si no existe todavía), se genera un **mensaje de
resumen** según el patrón dominante de los registros recientes:

- Si el patrón reciente es mayormente positivo (FELIZ/CALMADO): mensaje de
  refuerzo tipo "Has tenido buena racha últimamente, sigue así"
- Si el patrón muestra TRISTE/ENOJADO/ANSIOSO de forma recurrente, o una
  mezcla marcada: un mensaje que **reconozca el patrón sin sonar a "anímate"
  forzado** — algo que valide lo que ha estado pasando y, si tiene sentido,
  invite suavemente a ver actividades o hablar de eso, sin presionar

### Guardrails no negociables (los mismos de siempre, aplican aquí también)

- El mensaje se basa **solo en el conteo/frecuencia de los ánimos ya
  registrados por el usuario** — es lógica de reglas simple (ej. "de los
  últimos 7 registros, 5 fueron TRISTE/ANSIOSO → mostrar mensaje B"), no
  requiere IA ni análisis de las conversaciones de chat. Sin costo
  variable por uso.
- No diagnosticar, no sugerir una condición de salud mental, no minimizar
  si el patrón es negativo
- Nunca ser forzadamente positivo frente a una racha de ánimos difíciles —
  el mensaje reconoce antes de sugerir cualquier cosa

### Asignación

| Agente | Rama nueva | Responsabilidad |
|---|---|---|
| **B (Emociones)** | `feature/historial-mensaje-resumen` | Vista de historial de ánimos (si no existe ya) + lógica de reglas para el mensaje de resumen según el patrón dominante + los textos de cada caso, revisados con las reglas de tono de siempre |

Al ser una tarea acotada y basada en datos que ya existen (los registros de
ánimo que el chat actual ya guarda), no necesita involucrar a D ni tocar
schema nuevo — se puede calcular sobre los datos existentes.

---

## PARTE D — Fase 8: Chat de emociones con IA real (Gemini API, gratis)

**Se ejecuta después de que la Fase 7 esté cerrada.** Reemplaza el sistema
de respuestas por plantillas del chat de emociones por conversación real
con un modelo de lenguaje, manteniendo las mismas reglas de tono que ya
rigen la app.

### Por qué Gemini y no otra opción

Se evaluaron DeepSeek, GPT y Gemini. Gemini (modelo Flash) es la única
opción con una capa gratuita **indefinida** (sin fecha de vencimiento, sin
tarjeta de crédito), con un límite de 1,500 solicitudes/día — muy por
encima de lo que un uso personal del chat de emociones va a necesitar.
DeepSeek solo da tokens gratis por 30 días y después cobra; OpenAI no tiene
capa gratuita permanente en su API.

**Trade-off a tener presente:** en la capa gratuita, Google puede usar los
mensajes enviados para mejorar sus modelos (esto no ocurre si en el futuro
se activa un plan de pago). Aceptable para uso personal; revisar de nuevo
si en algún momento otras personas usan la app y la privacidad de sus
conversaciones se vuelve más sensible.

### Implementación técnica

- Backend (Express): nueva ruta `/api/chat/emocional` que recibe el mensaje
  del usuario y llama a la API de Gemini
- La **API key de Gemini se configura como variable de entorno en el
  backend de Render** — nunca en el frontend ni en el repositorio
- El `system_prompt` enviado al modelo debe incluir, de forma explícita,
  las mismas reglas de tono que ya rigen el chat por plantillas:
  - Nunca minimizar lo que la persona siente
  - Nunca diagnosticar ni sugerir una condición de salud mental
  - Nunca ser forzadamente positivo frente a emociones difíciles
  - Siempre validar primero, sugerir después
  - Mantener las respuestas breves (2-4 intercambios antes de llegar a una
    sugerencia de actividad), no simular una sesión de terapia
  - Si detecta señales de crisis genuina, mostrar el mismo mecanismo de
    burbuja de ayuda con teléfonos que ya existe en la versión por reglas
    — no dejar que el modelo lo maneje de forma libre, mantener ese flujo
    como una verificación de palabras clave separada del modelo, por
    seguridad
- Mantener el sistema de detección de frases de crisis (verificación de
  palabras clave) **fuera** del modelo de lenguaje, como una capa de
  seguridad adicional que se ejecuta siempre, independiente de si el
  modelo lo detecta o no

### Asignación

| Agente | Rama nueva | Responsabilidad |
|---|---|---|
| **B (Emociones)** | `feature/chat-ia-gemini` | Integración con Gemini API, system prompt con las reglas de tono, manejo de errores/rate limit (fallback a respuesta por plantilla si la API falla o se acerca al límite diario), mantener la burbuja de crisis como capa de seguridad separada del modelo |

### Verificación antes de mergear

- Probar los 6 ánimos con el modelo real y confirmar que el tono se
  mantiene igual de cuidadoso que en la versión por reglas
- Probar que si la API de Gemini falla o se acerca al límite diario, la
  app no se rompe — cae de vuelta a las respuestas por plantilla en vez de
  mostrar un error
- Confirmar que la detección de crisis sigue funcionando igual de bien que
  antes (esto no puede degradarse con el cambio a IA real)
