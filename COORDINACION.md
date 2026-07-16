# COORDINACION.md — Trabajo con 4 agentes en paralelo

Este archivo existe para que cada agente sepa qué NO debe tocar, porque
hay 3 agentes más trabajando en ramas paralelas sobre el mismo repo base.

## Ramas activas ahora mismo

- feature/navbar-footer     → Agente A: navegación inferior/superior
- feature/emociones-chat    → Agente B: flujo conversacional de ánimo
- feature/amigos-rework     → Agente C: mensajería y sistema de amigos
- feature/ajustes-personalizacion → Agente D: temas + color picker custom

## Regla de oro

Cada agente trabaja SOLO dentro de su dominio. Si detectas que necesitas
modificar un archivo compartido (ej. el sistema de tokens de tema en
`theme/`, el layout raíz de navegación, `schema.prisma`), DETENTE y
avísale al usuario en vez de modificarlo directamente — el usuario
coordinará ese cambio con el agente dueño de esa área.

## Dueños de archivos compartidos (no tocar sin avisar)

- `theme/tokens.js` (o equivalente) → dueño: Agente D (Ajustes/Temas)
- Layout raíz de navegación (`app/_layout.jsx` o similar) → dueño: Agente A
- `prisma/schema.prisma` → cualquiera que necesite tocarlo debe avisar
  primero, porque un cambio de schema afecta a todos los que usan Prisma
- `package.json` (dependencias nuevas) → avisar antes de agregar paquetes,
  para evitar instalar versiones distintas de la misma librería en ramas
  distintas

## Si tu tarea depende de algo que otro agente está construyendo

No inventes la interfaz a ciegas. Si Agente C (Amigos) necesita un
endpoint nuevo que no existe aún, créalo tú mismo dentro de tu propia
rama (no esperes a que "backend" te lo dé — en este proyecto no hay
agente de backend separado, cada agente de feature es full-stack dentro
de su dominio).

## Estado (cada agente actualiza su sección al terminar una sesión)

### Agente A — Navbar/Footer
Estado: (por completar)

### Agente B — Emociones/Chat
Estado: **Fase 6 terminada** en `feature/wellness-hub-individual` (pendiente
prueba visual y merge). La sugerencia de actividad salió del chat y vive en
la pestaña "Para mí"; el chat cierra con puente + chips ("Ver mi sugerencia"
/ "Registrar otra emoción").

**Contrato de entrega al Agente A (Wellness Hub):**
- Componente: `app/components/wellness/ParaMiTab.jsx` — autosuficiente, sin
  props obligatorias: hace su propio fetch al enfocar, maneja cargando /
  vacío / error / contenido y usa el tema. Montarlo tal cual dentro de la
  pestaña "Para mí" del contenedor del Hub (en una `View flex:1`).
- Al integrar: (1) borrar `app/app/wellness.jsx` (pantalla PROVISIONAL mía,
  conflicto esperado y trivial); (2) repuntar `RUTA_WELLNESS` en
  `app/features/wellness/paraMi.js` a la ruta real del Hub — es el único
  punto que consume el chip del chat.
- No incluido a propósito: la pestaña "Con amigos" (dominio del Agente C) y
  el patrón de bloqueo/desbloqueo por `friendsCount` (dominio A/C/D).

**Backend nuevo disponible para todos:** `GET /api/mood-entries/latest`
(requireAuth) → `{ moodEntry|null, actividad|null }` (último registro del
usuario + su sugerencia más reciente aplanada).

### Agente C — Amigos
Estado: (por completar)

### Agente D — Ajustes/Temas
Estado: (por completar)
