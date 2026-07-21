# FASE 12 — Mascota Avanzada, Notificaciones, Pulido Visual y Chat

**Proyecto:** Hora Azul (ex MoodMatch)
**Fecha:** Julio 2026
**Herramienta de ejecución:** 4 agentes en paralelo (A, B, C, D) sobre Git Worktrees, más el Agente E como integrador
**Estado previo:** Fase 11 cerrada, mergeada y pusheada (onboarding + cuestionario, actividades con IA social, fuentes + avatar, mascota social básica)

---

## Índice
1. [Contexto y estado del proyecto](#1-contexto-y-estado-del-proyecto)
2. [Objetivo general](#2-objetivo-general)
3. [Resumen ejecutivo del alcance](#3-resumen-ejecutivo-del-alcance)
4. [Fase 0 — Migración base compartida](#4-fase-0--migración-base-compartida-bloqueante)
5. [Reparto de agentes](#5-reparto-de-agentes)
6. [Coordinación y archivos compartidos](#6-coordinación-y-archivos-compartidos)
7. [Orden de trabajo y estrategia de merge](#7-orden-de-trabajo-y-estrategia-de-merge)
8. [Checklist de QA antes de cada merge](#8-checklist-de-qa-antes-de-cada-merge)
9. [Riesgos y consideraciones](#9-riesgos-y-consideraciones)
10. [Fuera de alcance — candidato a Fase 13](#10-fuera-de-alcance--candidato-a-fase-13)

---

## 1. Contexto y estado del proyecto

La Fase 11 dejó la mascota social en su versión básica (una por amistad, nivel de cariño simple por mensajes recíprocos), el sistema de notificaciones sin construir todavía, y quedó pendiente de Fase 10 un jank menor de animación de teclado. Esta fase profundiza la mascota como mini-juego social, construye la infraestructura de notificaciones push desde cero, pule varios puntos visuales, y suma mejoras al chat.

Se mantiene la misma disciplina de worktrees, un agente integrador (Agente E) para los merges, y push diferido en batch al cerrar la fase.

## 2. Objetivo general

Convertir la mascota en un mini-juego con enganche real (cuidado diario, retos cooperativos, evolución visual), notificar a los usuarios de forma útil y no invasiva, pulir puntos visuales pendientes, y sumar funciones esperables de una app de mensajería (reacciones, búsqueda) más soporte offline en el registro de ánimo.

## 3. Resumen ejecutivo del alcance

| # | Feature | Agente dueño | Toca schema | Prioridad |
|---|---|---|---|---|
| 1 | Cuidado diario de mascota (cooldown 24h) | A | Sí (Fase 0) | Alta |
| 2 | Mini-reto cooperativo de mascota | A | Sí (Fase 0) | Alta |
| 3 | Evolución visual (3-4 sprites por nivel) | A | No | Media |
| 4 | Personalidad de mascota según ánimo agregado de la amistad | A | No | Media |
| 5 | Nombre editable con negociación | A | Sí (Fase 0) | Baja |
| 6 | Recuerdos/hitos de la mascota | A | Sí (Fase 0) | Baja |
| 7 | Infraestructura de push (token, permiso, servicio de envío) | B | Sí (Fase 0) | Alta |
| 8 | Notificación de mensaje nuevo | B | No | Alta |
| 9 | Notificación de mascota necesita atención | B | No | Media |
| 10 | Notificación de actividad "Con amigos" completada | B | No | Media |
| 11 | Recordatorio suave de registro de ánimo | B | No | Media |
| 12 | Notificación de amigo aceptó invitación | B | No | Baja |
| 13 | Panel de preferencias de notificaciones + modo no molestar | B | Sí (Fase 0) | Alta |
| 14 | Micro-animaciones de transición en tab bar | C | No | Baja |
| 15 | Estados vacíos ilustrados (ej. pantalla Amigos) | C | No | Media |
| 16 | Confetti variado según tipo de actividad | C | No | Baja |
| 17 | Avatar con borde de racha | C | No | Media |
| 18 | Modo texto grande (accesibilidad) | C | No | Media |
| 19 | Cierre del jank de animación de teclado (deuda de Fase 10) | C | No | Alta |
| 20 | Reacciones rápidas en el chat | D | Sí (Fase 0) | Alta |
| 21 | Búsqueda dentro del chat | D | No | Media |
| 22 | Soporte offline mejorado para registro de ánimo | D | No | Alta |

---

## 4. Fase 0 — Migración base compartida (bloqueante)

**Por qué existe esta fase:** A, B y D necesitan agregar campos nuevos al schema. Igual que en Fase 11, se resuelve con una sola migración, un solo agente, antes de abrir los 4 worktrees.

**Cambios a `prisma/schema.prisma` (ajustar nombres de modelos/relaciones al schema real):**

```prisma
model User {
  // ...campos existentes...
  expoPushToken            String?
  notificationPreferences  Json?    // { mensajes: true, mascota: true, actividades: true, recordatorio: true, amistad: true, noMolestar: null | { desde: "22:00", hasta: "08:00" } }
}

model MascotaAmistad {
  // ...campos existentes de Fase 11...
  ultimoCuidadoUsuario1  DateTime?
  ultimoCuidadoUsuario2  DateTime?
  retoCooperativo        Json?    // { tipo, iniciadoEn, expiraEn, progresoUsuario1, progresoUsuario2, completado }
  nombrePropuesto        String?
  historialHitos         Json?    // [{ hito: "nivel_2", fecha }]
}

model Message {
  // ...campos existentes...
  reacciones  Json?    // { "❤️": [userId1], "😂": [userId2] } — ajustar al modelo real de mensajes
}
```

**Procedimiento (igual que en Fase 11):**

```bash
npx prisma migrate dev --create-only --name fase12-mascota-notificaciones-chat
# revisar el SQL generado antes de aplicar
npx prisma migrate dev
git add prisma/
git commit -m "fase12: migración base (mascota avanzada, push, reacciones)"

git worktree add ../MoodMatch-agenteA -b feature/mascota-mecanicas
git worktree add ../MoodMatch-agenteB -b feature/notificaciones
git worktree add ../MoodMatch-agenteC -b feature/graficas-pulido
git worktree add ../MoodMatch-agenteD -b feature/chat-offline
```

Setup de cada worktree (npm install en app/ y backend/, copiar .env, prisma generate, npm test) sigue el mismo procedimiento ya usado en Fase 11 — no se repite aquí en detalle.

---

## 5. Reparto de agentes

### Agente A — Mascota: mecánicas y evolución

**Objetivo:** convertir la mascota de un elemento decorativo a un mini-juego con enganche diario real.

**Alcance:**
- Cuidado diario: botón "alimentar"/"jugar" con cooldown de 24h **por usuario** (cada amigo de la amistad tiene su propio cooldown independiente), sube el cariño más rápido que solo con mensajes recíprocos.
- Mini-reto cooperativo: desafío corto con ventana de tiempo (ej. "ambos registren su ánimo hoy", "manden 3 mensajes cada uno esta semana") que, al cumplirse, sube de nivel/etapa la mascota.
- Evolución visual: 3-4 sprites distintos según nivel/etapa (bebé → joven → adulta), reemplazando el diseño único actual.
- Personalidad de la mascota según el ánimo agregado y reciente de la amistad — un estado difuso ("más animada", "más tranquila"), **nunca expone el ánimo individual de ningún usuario**, respeta el guardrail de privacidad ya documentado desde Fase 10.
- Nombre editable con negociación simple: el primero que lo propone, el otro confirma o propone uno distinto.
- Recuerdos: mini historial de hitos con fecha (ej. "llegó a nivel 2 el 15 de agosto").

**Fuera de alcance:** no toca notificaciones (eso dispara desde B una vez que A defina los eventos relevantes), no toca el panel "Con amigos" de Actividades.

**Archivos:** `backend/routes/mascota.js`, `app/mascota/MascotaWidget.jsx`, nuevos assets de sprites.

**Depende de:** Fase 0.

**Criterios de aceptación:**
- Cooldown de 24h respetado y verificable (no se puede alimentar/jugar dos veces antes de tiempo).
- Mini-reto con ventana de tiempo que expira correctamente si no se cumple.
- Los 3-4 sprites se muestran según el nivel real de la mascota.
- Ningún endpoint ni componente de mascota expone el ánimo individual de un usuario a su amigo.

---

### Agente B — Notificaciones: infraestructura, consumidores y preferencias

**Objetivo:** que la app notifique de forma útil y sin ser invasiva.

**Alcance:**
- Infraestructura: `expo-notifications`, registro y persistencia del token de push (`User.expoPushToken`), solicitud de permiso, y un servicio reusable en el backend (ej. `backend/lib/pushService.js`) que llama a la Expo Push API.
- Consumidores (cada uno dispara el push desde el backend justo después de que el evento ya ocurrió, sin necesitar coordinación en tiempo real con otros agentes):
  - Mensaje nuevo de un amigo.
  - Mascota necesita atención (define un umbral razonable, ej. más de 48h sin cuidado).
  - Amigo completó una actividad "Con amigos" contigo.
  - Recordatorio suave si pasan varios días sin registrar ánimo (reutiliza la lógica ya existente de `historial.js`).
  - Amigo aceptó tu invitación.
- Panel de preferencias en Ajustes (toggle por tipo de notificación) + modo "no molestar" (silenciar todas, o un rango horario simple).

**Fuera de alcance:** no implementa la lógica de mascota ni de chat, solo dispara notificaciones cuando el backend detecta que ya ocurrieron (verificar nombres reales de función/evento una vez A y D los tengan, mismo patrón de "shape acordado" que se usó entre A y B en Fase 11).

**Archivos:** `backend/lib/pushService.js`, hooks de push en las rutas de mensajes/mascota/actividades/amistad, `app/ajustes/notificaciones.jsx`, servicio de registro de token en la app.

**Depende de:** Fase 0 (`expoPushToken`, `notificationPreferences`).

**Criterios de aceptación:**
- Push funcional en dispositivo real para al menos el caso de mensaje nuevo.
- Cada tipo de notificación respeta el toggle correspondiente en preferencias.
- El modo "no molestar" silencia efectivamente todas las notificaciones mientras está activo.
- Si el usuario no dio permiso de notificaciones, la app no falla ni insiste de forma invasiva.

---

### Agente C — Gráficas y pulido de UI

**Objetivo:** cerrar deuda visual pendiente y sumar pulido que no depende de lógica de negocio nueva.

**Alcance:**
- Micro-animaciones de transición entre pantallas del tab bar, usando los motion tokens ya existentes desde Fase 1.
- Estados vacíos con ilustración propia acorde a la identidad Hora Azul (empezando por la pantalla de Amigos vacía).
- Confetti/celebración variado según el tipo de actividad completada, en vez de una sola animación genérica.
- Avatar con borde/anillo de color según racha activa del usuario.
- Modo de texto grande (accesibilidad) en Ajustes.
- Cierre del jank de animación de teclado que quedó pendiente explícitamente de Fase 10 — esto es deuda técnica, no una feature nueva.

**Fuera de alcance:** no toca notificaciones, mascota ni chat.

**Archivos:** motion tokens, componente de estado vacío de Amigos, lógica de confetti en el Hub de Actividades, componente de Avatar (borde de racha), Ajustes (accesibilidad), configuración de `react-native-keyboard-controller`.

**Depende de:** Fase 0 solo indirectamente (no toca schema, puede arrancar apenas exista el worktree).

**Criterios de aceptación:**
- Transiciones de tab bar visiblemente más suaves, sin regresión de performance.
- Estado vacío de Amigos con ilustración, no solo ícono genérico.
- Al menos 2-3 variantes de confetti según tipo de actividad.
- Jank de teclado confirmado como resuelto en dispositivo real (Xiaomi/MIUI).

---

### Agente D — Chat: reacciones, búsqueda y soporte offline

**Objetivo:** acercar el chat a los estándares esperados de una app de mensajería, y hacer más resiliente el registro de ánimo.

**Alcance:**
- Reacciones rápidas a mensajes (like/emoji) sin necesidad de escribir texto.
- Búsqueda dentro del chat con un amigo.
- Soporte offline mejorado: el registro de ánimo se guarda localmente si no hay conexión, y se sincroniza automáticamente cuando vuelve — en vez de fallar directamente.

**Fuera de alcance:** no toca notificaciones ni mascota.

**Archivos:** componentes de chat (`app/friends` o donde viva la UI de mensajes), `backend` modelo de mensajes (reacciones), lógica de registro de ánimo con cola local (`app/features/wellness`).

**Depende de:** Fase 0 (campo `reacciones` en mensajes).

**Criterios de aceptación:**
- Reacciones visibles y persistentes para ambos usuarios del chat.
- Búsqueda encuentra mensajes por texto dentro de una conversación.
- Un registro de ánimo hecho sin conexión se sincroniza correctamente al recuperar la conexión, sin duplicarse ni perderse.

---

## 6. Coordinación y archivos compartidos

- `prisma/schema.prisma`: cerrado en Fase 0. Avisar antes de tocarlo de nuevo.
- El modelo de mensajes lo tocan tanto B (para saber cuándo notificar) como D (para reacciones) — D es dueño del archivo, B solo lee el evento ya disparado, no debería necesitar editar el mismo componente.
- A y B comparten el dominio de "mascota necesita atención": A define qué significa el estado de la mascota, B solo consume ese dato para decidir si notifica. Acordar el nombre del campo/función antes de que B lo integre, mismo patrón de Fase 11.

## 7. Orden de trabajo y estrategia de merge

1. **Fase 0** (migración) — bloqueante, sola.
2. **A, B, C y D en paralelo** apenas `main` tenga el commit de Fase 0.
3. **Orden de merge sugerido:** C → A → D → B (C no depende de nada y es el más simple de validar primero; B va último porque consume eventos definidos por A y D).
4. Merge uno a la vez, con `npm test` entre cada uno, a cargo del Agente E integrador.

## 8. Checklist de QA antes de cada merge

- [ ] `npm test` verde en la rama (backend + app).
- [ ] `npm test` verde en `main` después del merge.
- [ ] Prueba visual/funcional en dispositivo real de lo que tocó ese agente:
  - **A:** cooldown de cuidado, mini-reto, sprites por nivel, nombre editable.
  - **B:** push real de mensaje nuevo, toggle de preferencias, modo no molestar.
  - **C:** transiciones, estado vacío, confetti, borde de racha, texto grande, teclado sin jank.
  - **D:** reacciones, búsqueda, registro de ánimo offline y su sincronización.
- [ ] Sin regresiones visibles en las pantallas de Fase 11.

## 9. Riesgos y consideraciones

- **Push notifications requieren build nativo** para probarse de verdad (no alcanza con Expo Go en muchos casos) — planificar un `eas build` hacia el final de la fase, no asumir que todo se prueba por OTA.
- **El campo `notificationPreferences` debe tener un default sensato** (todo activado, o todo desactivado hasta que el usuario decida) — definir esto explícitamente con B antes de mergear, para no sorprender a usuarios existentes.
- **Reacciones en mensajes**: decidir si viven como campo `Json` en el mensaje o como tabla aparte antes de la Fase 0 — un `Json` es más simple pero más difícil de consultar/agregar después; para el volumen de este proyecto, `Json` alcanza.
- **Offline sync**: cuidado con duplicados si el usuario registra el mismo ánimo dos veces (una vez local, una vez al reconectar) — D debe definir una estrategia de idempotencia (ej. un ID generado localmente que el backend deduplica).

---

## 10. Fuera de alcance — candidato a Fase 13

- **Widget de Android/pantalla de inicio** con registro rápido de ánimo sin abrir la app. Se deja fuera de esta fase porque requiere código nativo (Kotlin/Java o un plugin de configuración de Expo), es técnicamente más riesgoso que el resto del alcance, y probablemente necesite iteración con builds nativos repetidos — mejor como una fase dedicada, sin competir por atención con las otras 4 tareas paralelas de esta fase.
