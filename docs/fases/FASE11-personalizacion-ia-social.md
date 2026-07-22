# FASE 11 — Personalización, IA Social, Onboarding y Mascota

**Proyecto:** Hora Azul (ex MoodMatch)
**Fecha:** Julio 2026
**Herramienta de ejecución:** 4 agentes en paralelo (A, B, C, D) sobre Git Worktrees + 1 pasada final de responsividad
**Estado previo:** Fase 10 cerrada y mergeada en `main` (Hub de Actividades, respiración guiada 4-4-4-4, acciones sociales, ícono v2, personalización de Ajustes)

---

## Índice
1. [Contexto y estado del proyecto](#1-contexto-y-estado-del-proyecto)
2. [Objetivo general](#2-objetivo-general)
3. [Resumen ejecutivo del alcance](#3-resumen-ejecutivo-del-alcance)
4. [Fase 0 — Migración base compartida](#4-fase-0--migración-base-compartida-bloqueante)
5. [Configuración de Git Worktrees](#5-configuración-de-git-worktrees)
6. [Reparto de agentes](#6-reparto-de-agentes)
7. [Pasada final — Auditoría de responsividad](#7-pasada-final--auditoría-de-responsividad)
8. [Coordinación y archivos compartidos](#8-coordinación-y-archivos-compartidos)
9. [Orden de trabajo y estrategia de merge](#9-orden-de-trabajo-y-estrategia-de-merge)
10. [Checklist de QA antes de cada merge](#10-checklist-de-qa-antes-de-cada-merge)
11. [Riesgos y consideraciones](#11-riesgos-y-consideraciones)

---

## 1. Contexto y estado del proyecto

La app venía trabajándose en 4 agentes paralelos sobre worktrees independientes, cada uno dueño de una porción del código, con merges secuenciales a `main` validados con `npm test` y push diferido en batch. Esta fase mantiene exactamente la misma disciplina de trabajo: un agente por worktree, una rama por feature, un merge a la vez.

Las capturas de referencia muestran el estado actual de "Amigos" (vacío, invitación por QR), el login (funcional pero visualmente plano), y "Actividades" en sus dos pestañas ("Para mí" con inconsistencias de estilo entre tarjetas, "Con amigos" con solo 3 acciones fijas y sin botón de "hecho").

## 2. Objetivo general

Elevar el pulido visual y la personalización de la app, corregir deuda de UX en el Hub de Actividades, y sumar dos capacidades nuevas de retención social: sugerencias asistidas por IA en "Con amigos" y una mascota compartida por amistad. Todo esto sin romper el trabajo ya cerrado en Fase 10 (paletas, fuentes, respiración guiada, hardening de `JWT_SECRET`).

## 3. Resumen ejecutivo del alcance

| # | Feature | Agente dueño | Toca schema | Prioridad |
|---|---|---|---|---|
| 1 | Rework visual del login/registro | A | No | Alta |
| 2 | Animación de entrada + cuestionario de personalidad post-registro | A | Sí (Fase 0) | Alta |
| 3 | Corrección de inconsistencias en "Para mí" | B | No | Alta |
| 4 | Sugerencias IA + botón "La hice" en "Con amigos" | B | No | Alta |
| 5 | Fuentes góticas/exóticas en Ajustes → Personalizado | C | No | Media |
| 6 | Foto de perfil | C | Sí (Fase 0) | Media |
| 7 | Mascota social compartida por amistad | D | Sí (Fase 0) | Media |
| 8 | Auditoría general de responsividad | Pasada final (sola, post-merge) | No | Alta |

---

## 4. Fase 0 — Migración base compartida (bloqueante)

**Por qué existe esta fase:** tres de los cuatro agentes (A, C, D) necesitan agregar campos a la base de datos. Si cada uno migra por su cuenta, sobre la misma base Neon compartida, el riesgo de choque de migraciones es alto. Se resuelve con **una sola migración, hecha por un solo agente, antes de que se abran los 4 worktrees de esta fase**.

**Cambios a `prisma/schema.prisma`:**

```prisma
model User {
  // ...campos existentes...
  avatarUrl           String?
  perfilPersonalidad  Json?
}

model MascotaAmistad {
  id           String   @id @default(cuid())
  amistadId    String   @unique
  amistad      Amistad  @relation(fields: [amistadId], references: [id])
  nombre       String
  nivelCarino  Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

*(Ajustar nombres exactos de modelos/relaciones al schema real — `Amistad` es un placeholder del modelo de amistad que ya exista en el proyecto.)*

**Procedimiento:**

```bash
# En el worktree principal, con main al día
npx prisma migrate dev --create-only --name fase11-avatar-personalidad-mascota

# Revisar el SQL generado en prisma/migrations/ antes de aplicar —
# es una base compartida (Neon), no hay margen para migraciones a ciegas
npx prisma migrate dev

# Commit directo a main
git add prisma/
git commit -m "fase11: migración base (avatar, perfil personalidad, mascota)"
```

Solo después de este commit en `main` se pasa a la sección 5.

---

## 5. Configuración de Git Worktrees

**Punto de partida:** parado en el repo principal, con `main` ya conteniendo el commit de Fase 0.

```bash
cd ~/ruta/a/MoodMatch
git checkout main
git status              # confirmar que está limpio y al día con el commit de Fase 0

git worktree add ../MoodMatch-agenteA -b feature/onboarding-login
git worktree add ../MoodMatch-agenteB -b feature/actividades-ia-social
git worktree add ../MoodMatch-agenteC -b feature/personalizacion-avatar
git worktree add ../MoodMatch-agenteD -b feature/mascota-social

git worktree list       # verificar las 4 rutas y ramas
```

**Tres detalles que se pisan fácil y conviene tener claros:**

1. **`node_modules` no se comparte entre worktrees.** Cada carpeta nueva es un checkout independiente del código versionado, pero `node_modules` no está en git. Hay que correr `npm install` dentro de cada una de las 4 carpetas antes de arrancar al agente correspondiente.
2. **`.env` tampoco se comparte** (no está versionado). Copiar el `.env` del worktree principal a cada carpeta nueva antes de levantar el backend/app ahí.
3. **El schema de Prisma ya está aplicado en la base (Neon) desde la Fase 0**, así que los 4 worktrees ven las tablas nuevas apenas apuntan al mismo `DATABASE_URL`. Lo que sí hay que regenerar en cada worktree es el cliente de Prisma: `npx prisma generate` (porque `node_modules/@prisma/client` es local a cada carpeta).

**Al cerrar cada agente (después de mergear su rama a `main`):**

```bash
git worktree remove ../MoodMatch-agenteA
git branch -d feature/onboarding-login
```

Esto libera la carpeta y la rama una vez que su trabajo ya vive en `main`. No borrar antes de confirmar el merge.

---

## 6. Reparto de agentes

### Agente A — Onboarding, Login y Cuestionario de personalidad

**Objetivo:** que el primer contacto con la app (login/registro + los segundos después de registrarse) se sienta pulido y arranque la personalización del resto de la app.

**Alcance:**
- Rework visual completo del login/registro. Mantiene los campos actuales (Email, Contraseña, botones Ingresar/Registrarse), pero con jerarquía tipográfica clara y terminado profesional, usando la identidad índigo/coral ya definida en `theme/tokens.js` — no se crea paleta nueva.
- Animación de entrada corta (2–3s, saltable con un tap) inmediatamente después de un registro exitoso, antes de aterrizar en Inicio.
- Cuestionario de gustos/personalidad (5–8 preguntas de selección rápida), una sola vez, inmediatamente después de la animación. Preguntas **fijas (hardcoded)** para esta v1 — no depender de IA en un flujo crítico de onboarding. El resultado se guarda en `User.perfilPersonalidad`.

**Fuera de alcance:** no toca `ConAmigosPanel` ni la lógica de sugerencias (eso es del Agente B, que sí *consume* el resultado de este cuestionario).

**Archivos:** pantallas de auth existentes, `app/onboarding/bienvenida.jsx` (nuevo), `app/onboarding/cuestionario.jsx` (nuevo), extensión de `PATCH /api/users/me`.

**Depende de:** Fase 0 (columna `perfilPersonalidad`).

**Criterios de aceptación:**
- Login/registro visualmente coherente con el resto de la app, sin regresión funcional.
- Animación no bloquea el flujo si el usuario la salta.
- Cuestionario se completa una sola vez; no vuelve a aparecer en logins posteriores.
- `perfilPersonalidad` queda persistido y es legible por otros endpoints.

---

### Agente B — Actividades: "Para mí" + "Con amigos" con IA

**Objetivo:** unificar la calidad visual de "Para mí" y llevar "Con amigos" al mismo nivel de dinamismo, con IA y con la posibilidad de marcar actividades como hechas.

**Alcance:**
- Auditar "Para mí" y unificar inconsistencias: padding/spacing distinto entre tarjetas, iconografía sin estandarizar entre la tarjeta de sugerencia (película/entretenimiento) y la de respiración.
- "Con amigos" pasa de 3 acciones fijas (Salida, Aprecias, Energía positiva) a incluir sugerencias **generadas por IA**, reusando el mismo contrato Gemini + doble escudo de crisis + fallback a plantilla que ya existe para el chat de emociones.
- Agregar botón **"La hice"** a cada sugerencia de "Con amigos" (hoy solo tienen flecha `>`), con el mismo patrón visual que ya existe en "Para mí".
- Cuando exista `perfilPersonalidad` (Agente A), las sugerencias de "Con amigos" lo usan para ser más relevantes; si el usuario todavía no completó el cuestionario, cae a la lógica genérica actual — no debe romper para usuarios sin perfil.

**Fuera de alcance:** no toca el login ni el onboarding; no diseña el cuestionario (solo consume su resultado).

**Archivos:** `ParaMiPanel.jsx`, `ConAmigosPanel.jsx`, `app/features/wellness/*`, nuevo endpoint `POST /api/activities/suggest-social` (o extensión de `chat.js`).

**Depende de:** Fase 0. Coordina con Agente A el shape exacto del JSON de `perfilPersonalidad` — puede arrancar con el fallback genérico y enchufar la personalización cuando A publique el shape.

**Criterios de aceptación:**
- "Para mí" con estilo de tarjeta unificado (mismo padding, misma iconografía, mismos estados de botón).
- "Con amigos" muestra sugerencias generadas por IA además de (o en reemplazo de) las 3 fijas, con fallback funcional si Gemini falla.
- Botón "La hice" funcional y persistente, igual que en "Para mí".
- El guardrail de privacidad ya documentado se respeta: las sugerencias solo usan datos de ánimo ya visibles en la lista de amigos, nada nuevo/privado.

---

### Agente C — Personalización visual: fuentes y foto de perfil

**Objetivo:** ampliar la personalización visual de la app (fuentes, foto de perfil).

**Alcance:**
- Sumar al selector de fuentes de Ajustes → Personalizado (Fase 10 ya tiene 7) una fuente gótica/display y una decorativa/exótica, respetando el guardrail WCAG AA ya implementado (el aviso de bajo contraste debe seguir bloqueando "Aplicar" también con las fuentes nuevas).
- Foto de perfil: subir o seleccionar imagen (galería o cámara), mostrarla en Inicio/Ajustes/tarjeta de amigo. Requiere `avatarUrl` (Fase 0) y un destino de almacenamiento — **recomendación:** servicio externo gratuito tipo Cloudinary, en vez de guardar la imagen en la base de datos.

**Fuera de alcance:** no diseña features nuevas de contenido, solo pulido visual/estructural. La auditoría general de responsividad **ya no es parte de este agente** — se mueve a una pasada final después de que A/B/C/D estén mergeados (ver sección 7), porque auditar pantallas que A y B todavía están creando en paralelo no tiene sentido y genera choques de merge innecesarios.

**Archivos:** `theme/tokens.js` (fuentes — dueño en esta fase), `app/ajustes/personalizacion.jsx`, nuevo `AvatarPicker.jsx`, extensión de `PATCH /api/users/me` (`avatarUrl`).

**Depende de:** Fase 0 (columna `avatarUrl`).

**Criterios de aceptación:**
- Fuentes nuevas seleccionables y persistentes, con el guardrail WCAG AA intacto.
- Foto de perfil visible en los 3 puntos mencionados, con subida funcional en dispositivo real.

---

### Agente D — Mascota social compartida

**Objetivo:** sumar un elemento de retención social ligero, sin depender de IA, ligado al vínculo de amistad.

**Alcance:**
- Una mascota por vínculo de amistad (no una mascota global compartida entre todos los amigos), con un estado simple (nivel de cariño) que evoluciona con interacciones entre los amigos (mensajes enviados, actividades "Con amigos" marcadas como hechas). Lógica basada en reglas simples para esta v1, sin IA.
- UI: widget dentro del chat de amigo o dentro de "Amigos" que muestra la mascota y su estado actual.

**Fuera de alcance:** no incluye evolución visual compleja (distintos sprites por nivel) en esta v1 — dejar el gancho para una iteración futura si se quiere.

**Archivos:** tabla `MascotaAmistad` (Fase 0), nuevo endpoint `/api/mascota/:amistadId`, nuevo componente `app/mascota/MascotaWidget.jsx`.

**Depende de:** Fase 0 (tabla nueva).

**Criterios de aceptación:**
- Cada amistad tiene su propia mascota, creada automáticamente al aceptar la solicitud de amistad (o al primer acceso al widget).
- El nivel de cariño sube con interacciones reales entre los dos amigos, no con acciones de un solo lado.
- Widget visible y funcional en dispositivo real.

---

## 7. Pasada final — Auditoría de responsividad

**Por qué es una pasada aparte y no un agente en paralelo:** auditar responsividad significa revisar pantallas terminadas. A mitad de la fase paralela, las pantallas de A (onboarding, login rework) y B (Actividades) todavía están en construcción — auditarlas en simultáneo generaría choques de merge con los propios dueños de esos archivos y trabajo desperdiciado sobre versiones que van a cambiar. Por eso esta auditoría se hace **una sola vez, sola, después de que A, B, C y D ya estén mergeados en `main`**.

**Cuándo se lanza:** apenas el último de los 4 agentes (A/B/C/D) esté mergeado a `main`. No requiere un worktree nuevo — se corre directo sobre `main`, reusando cualquiera de las 4 pestañas que ya haya terminado su trabajo.

**Alcance:**
- Revisar todas las pantallas de la app (las de Fase 10 y las nuevas de esta fase) en al menos dos tamaños de pantalla distintos al dispositivo de prueba habitual del usuario.
- Corregir overflow de texto, usar `useWindowDimensions` donde falte, verificar tamaños mínimos táctiles.
- No es una tarea de diseño nuevo — solo ajustes de layout sobre lo que ya existe.

**Archivos:** transversal, sin dueño fijo — toca lo que haga falta en cada pantalla afectada.

**Depende de:** que A, B, C y D ya estén mergeados.

**Criterios de aceptación:**
- Sin overflow de texto ni elementos cortados en al menos dos tamaños de pantalla distintos al de prueba habitual, en todas las pantallas de la app (viejas y nuevas).
- `npm test` verde después del merge.

---

## 8. Coordinación y archivos compartidos

- `prisma/schema.prisma`: cerrado en Fase 0. Ningún agente de A/B/C/D debería necesitar tocarlo de nuevo. Si surge una necesidad imprevista, avisar antes de modificar.
- `theme/tokens.js`: dueño Agente C en esta fase (fuentes). Si otro agente necesita un token nuevo, coordinar antes de tocar el archivo.
- `PATCH /api/users/me`: lo tocan tanto A (`perfilPersonalidad`) como C (`avatarUrl`). Ambos deben mergear contra la versión más reciente de `main` antes de tocar este endpoint para evitar pisarse el body del request.
- Merges a `main` uno a la vez, con `npm test` corrido después de cada merge (no solo antes). Push a `origin` diferido en batch al cerrar la fase, salvo que se pida lo contrario.

## 9. Orden de trabajo y estrategia de merge

1. **Fase 0** (migración) — bloqueante, se hace antes de abrir los 4 worktrees. Un solo lanzamiento, sola.
2. **A, C y D en paralelo** apenas `main` tenga el commit de Fase 0.
3. **B en paralelo también**, arrancando con el fallback genérico de sugerencias; integra `perfilPersonalidad` cuando A publique el shape del JSON (no necesita esperar a que A mergee, solo a que el formato esté acordado).
4. **Orden de merge sugerido:** A → C → D → B — ajustable según quién termine primero, pero siempre un merge a la vez, con test corrido entre cada uno.
5. **Pasada final de responsividad** — sola, sobre `main`, recién cuando A/B/C/D ya estén mergeados.

En total son 6 lanzamientos (Fase 0, A, B, C, D, responsividad), pero nunca más de 4 corriendo al mismo tiempo.

## 10. Checklist de QA antes de cada merge

- [ ] `npm test` verde en la rama (backend + app) antes de proponer el merge.
- [ ] `npm test` verde en `main` después del merge.
- [ ] Prueba visual en dispositivo real de lo que tocó ese agente:
  - **A:** cuestionario de onboarding completo + animación de entrada.
  - **B:** sugerencia IA visible en "Con amigos" + botón "La hice" funcionando.
  - **C:** fuentes nuevas aplicadas + subida de foto de perfil.
  - **D:** widget de mascota visible y su estado cambia con interacción real.
  - **Pasada final:** sin overflow ni elementos cortados en al menos 2 tamaños de pantalla distintos, en toda la app.
- [ ] Sin regresiones visibles en las pantallas de Fase 10 (Hub, respiración, ícono, Ajustes).

## 11. Riesgos y consideraciones

- **Migración única en Fase 0:** si se detecta que faltó un campo durante el desarrollo de A/B/C/D, no migrar por separado — pausar, agregar el campo a la migración de Fase 0 (o crear una Fase 0.1 igual de centralizada) y recién ahí seguir.
- **Fallback de IA en "Con amigos":** si Gemini no responde, el usuario no debe quedarse sin sugerencias — el fallback a plantilla es un requisito, no un nice-to-have.
- **Cuestionario de personalidad fijo en v1:** dejar explícitamente documentado en el código que es un candidato a volverse dinámico (IA) en una fase futura, para no tener que rediseñar el flujo desde cero.
- **Almacenamiento de foto de perfil:** definir el servicio externo (Cloudinary u otro) antes de que el Agente C empiece, para no migrar de local/base64 a un servicio externo a mitad de camino.
