# FASE 15 — Chat de emociones: conversación real + fix de Cloudinary

**Proyecto:** moodmatch
**Estado previo:** Fase 14 (mascota multi-especie + perfil de usuario) cerrada y validada en dispositivo. Esta fase no depende de nada de Fase 14 ni la toca.

---

## Índice

1. [Contexto y objetivo](#1-contexto-y-objetivo)
2. [Parte 1 — Rework del chat de emociones](#2-parte-1--rework-del-chat-de-emociones)
3. [Parte 2 — Fix de Cloudinary (foto de perfil)](#3-parte-2--fix-de-cloudinary-foto-de-perfil)
4. [Reparto de trabajo](#4-reparto-de-trabajo)
5. [Checklist de QA antes de mergear](#5-checklist-de-qa-antes-de-mergear)
6. [Fuera de alcance](#6-fuera-de-alcance)

---

## 1. Contexto y objetivo

El usuario probó el chat de emociones (Gemini) pidiéndole directamente sugerencias de mejora dentro de la propia conversación, y encontró varios problemas de fondo — no son bugs puntuales, son de diseño de la identidad del bot.

**Visión objetivo, en palabras del usuario:** el chat con IA es para cuando una persona no tiene a nadie más con quien hablar. Tiene que sentirse como un amigo real — capaz de escuchar, conversar, bromear, y sostener charla larga — siempre respetando a la persona y lo que quiere. No un asistente de bienestar que responde con plantilla y cierra con pregunta.

**Esto no reemplaza ni afloja ninguna regla de seguridad existente** — ver sección de reglas no negociables, que se mantienen exactamente como están.

De paso, se arrastra desde antes de Fase 14 un bug de subida de foto de perfil (Cloudinary) — ya diagnosticado, solo falta confirmarlo resuelto.

---

## 2. Parte 1 — Rework del chat de emociones

### Problemas detectados (probando el chat directamente)

- Repite insistentemente el recordatorio de la pestaña "Para mí" pese a que se le pidió explícitamente dejar de hacerlo
- Cierra casi todas sus respuestas con una pregunta — se siente repetitivo, como cuestionario
- Se niega rígidamente a contar historias o chistes aunque se le pida directamente, citando la regla de no forzar cambio de humor — **malinterpretación de esa regla**: no forzar un cambio de humor no es lo mismo que negarse a algo que la persona pidió explícitamente
- No tiene continuidad real entre sesiones — no puede ir "conociendo" a la persona, ganar confianza o usar jerga propia con el tiempo
- Dentro de una conversación, el bot "acepta" ajustar su tono/personalidad cuando se le sugiere, pero esto no persiste entre sesiones porque el system prompt es estático

### Comportamiento objetivo

- Puede contar historias, bromear y sostener charla larga **cuando el usuario lo pide explícitamente** — el bot no fuerza el cambio de humor por su cuenta, pero tampoco se niega rígidamente si se le pide
- Gana familiaridad y jerga propia con el tiempo (requiere memoria real entre sesiones, no solo dentro de una)
- Guía el razonamiento de la persona en vez de sonar solo cortante o validando de forma mecánica
- Deja de cerrar sistemáticamente con una pregunta
- Dentro de una conversación, un ajuste de tono que la persona pida debe poder persistir de verdad, no resetearse en la siguiente sesión

### Reglas no negociables (se mantienen intactas, sin excepción)

- Nunca minimizar lo que la persona siente
- Nunca diagnosticar ni sugerir una condición de salud mental
- Nunca sugerir medicación
- Nunca forzar positividad en emociones difíciles — siempre validar antes de sugerir
- Detección de crisis **siempre fuera del modelo de IA** (escudo regex local, doble capa: frontend antes de llamar + backend antes de llamar a Gemini) — esto no se toca ni se relaja en esta fase
- Ante mensajes de suicidio, autolesión, o intención de dañar a otros, el bot debe encaminar a la persona a un buen punto y dejar claro que esas no son soluciones — el guardrail de crisis se mantiene exactamente como está
- Mensajes o perfiles derivados del historial de ánimo solo pueden reflejar patrones que el usuario registró explícitamente — nunca inferir causas psicológicas no declaradas

### Cambios técnicos propuestos

1. **Memoria entre sesiones:** hoy el historial se trunca a las últimas 8 entradas de la conversación. Evaluar dos caminos (el agente que tome esta parte propone cuál, con su razonamiento, antes de implementar):
   - Subir el límite de truncado, o
   - Mantener un resumen persistente y acotado de "lo que el bot ya sabe de esta persona" (temas recurrentes, apodos, chistes internos que la persona mencionó), inyectado en el system prompt en cada sesión nueva — siempre respetando que solo se basa en lo que la persona compartió explícitamente, nunca inferencias
2. **Reescribir la identidad/system prompt del bot** en `CONTRATO-GEMINI.md`: menos plantilla de asistente de bienestar, más "amigo que escucha" — permitir humor y narrativa cuando se pide, sin scriptear un cierre de pregunta en cada respuesta
3. **Revisar la lógica del recordatorio de "Para mí":** debe dejar de insistir una vez que la persona pidió que parara
4. El escudo de crisis (`useCrisisShield` en frontend + detección equivalente en backend antes de llamar a Gemini) **no se toca** — cualquier cambio de identidad del bot se construye alrededor de ese guardrail, nunca reemplazándolo ni debilitándolo

### Puntos de partida técnicos conocidos

- `backend/routes/chat.js` — `POST /api/chat/respond`, requireAuth
- `CONTRATO-GEMINI.md` — contrato/system prompt actual del bot
- Doble escudo de crisis: frontend (`useCrisisShield`) antes de llamar, backend antes de llamar a Gemini; fallos nunca dan 5xx, responden por plantilla
- El chat de emociones ya usa Gemini real (free tier Flash, ~1500 req/día) desde Fase 8

---

## 3. Parte 2 — Fix de Cloudinary (foto de perfil)

### Estado

- Bug diagnosticado en Fase 14: al subir foto desde Ajustes/Perfil aparecía "Falta configurar Cloudinary para subir la imagen"
- Causa: 100% del lado cliente (`app/services/avatarUpload.js`) — faltaban `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` y `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` porque no existía `app/.env`
- Ya resuelto: se creó `app/.env` con los valores correctos, gitignoreado, y ya está mergeado en `main` desde el cierre de Fase 14
- Las variables `EXPO_PUBLIC_*` se hornean en el bundle al momento de compilar — un APK ya compilado antes del fix no las toma

### Qué falta

- Confirmar en un build nativo posterior al merge de Fase 14 que la foto de perfil sube correctamente. Si el build usado para la QA visual de Fase 14 ya es posterior al fix, puede que ya esté resuelto — solo falta la confirmación explícita probándolo en el dispositivo

---

## 4. Reparto de trabajo

A diferencia de Fase 14, esta fase **no requiere múltiples agentes en paralelo** — el rework del chat es una sola pieza cohesiva (system prompt + lógica de historial en un par de archivos relacionados), y el fix de Cloudinary ya está hecho, solo falta confirmarlo. Se recomienda un solo agente (o el propio usuario) llevando toda la Parte 1 de punta a punta, con la Parte 2 como una verificación rápida antes o después.

---

## 5. Checklist de QA antes de mergear

- [ ] `npm test` verde en backend y app
- [ ] El escudo de crisis sigue disparando igual que antes ante mensajes de riesgo (frontend y backend) — probar explícitamente, no asumir
- [ ] El bot ya no cierra sistemáticamente con pregunta
- [ ] El bot cuenta una historia/chiste si se le pide explícitamente, sin negarse rígidamente
- [ ] El bot deja de insistir con el recordatorio de "Para mí" tras pedírselo una vez
- [ ] Prueba de continuidad: en una sesión nueva, el bot demuestra recordar algo relevante de una sesión anterior (dentro de lo que la persona compartió explícitamente)
- [ ] Foto de perfil sube correctamente a Cloudinary en un build nativo posterior al fix
- [ ] Ninguna de las reglas no negociables de tono/seguridad quedó debilitada — revisar contra la sección 2 antes de dar por cerrada la fase

---

## 6. Fuera de alcance

- Cualquier relajación del escudo de crisis o de las reglas de no diagnosticar/no medicar — no negociable, ninguna fase futura debería tocarlo
- Navegación tipo Instagram (Perfil/Ajustes) y eliminar mascota — ver `FASE16-navegacion-mascota.md`, doc separado sin dependencias con esta fase
