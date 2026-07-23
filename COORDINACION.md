# COORDINACION.md — Trabajo con agentes en paralelo

Este archivo existe para que cada agente sepa qué NO debe tocar cuando hay
varios trabajando en ramas/worktrees paralelos sobre el mismo repo base.

## Regla de oro

Cada agente trabaja SOLO dentro de su dominio. Si detectas que necesitas
modificar un archivo compartido (sistema de tokens de tema en `theme/`, el
layout raíz de navegación, `prisma/schema.prisma`), DETENTE y avísale al
usuario en vez de modificarlo directamente — el usuario coordinará ese cambio
con el agente dueño de esa área en la fase vigente.

## Reglas de commits

- Los commits NUNCA deben incluir líneas de atribución a IA, co-autoría ni
  firmas (`Generated with [herramienta]`, `Co-Authored-By: Claude`,
  `Co-Authored-By: GPT` o similares), sin importar qué modelo o herramienta se
  haya usado. El proyecto se presenta como escrito íntegramente por el
  desarrollador humano dueño del repo.
- Los mensajes de commit describen el cambio en primera persona neutra o de
  forma impersonal, como si los hubiera escrito directamente el desarrollador.

## Archivos compartidos (no tocar sin avisar)

Estos archivos afectan a todos los agentes; coordinar con el usuario y el dueño
de esa área en la fase vigente antes de tocarlos:

- `theme/` (tokens de tema)
- Layout raíz de navegación (`app/app/_layout.jsx` / `app/app/(tabs)/_layout.jsx`)
  y la lista de destinos de la barra (`app/components/tabsConfig.js`)
- `prisma/schema.prisma` (un cambio de schema afecta a todos los que usan Prisma)
- `package.json` (dependencias nuevas: avisar antes de agregar, para no instalar
  versiones distintas de la misma librería en ramas distintas)

## Si tu tarea depende de algo que otro agente está construyendo

No inventes la interfaz a ciegas. En este proyecto no hay un agente de backend
separado: cada agente de feature es full-stack dentro de su dominio, así que si
necesitas un endpoint que no existe aún, créalo tú mismo dentro de tu propia rama.

## Estado actual

> **AVISO (Fase 15, 2026-07-22) — `schema.prisma` tocado de forma aditiva:** se
> agrega a `User` el campo `memoriaChat Json?` (nullable) para la memoria del
> chat de emociones entre sesiones. Migración `fase15_memoria_chat`, generada
> con `--create-only` y aplicada tras autorización explícita del usuario. Es
> una sola columna nullable: no afecta a ningún otro agente ni a los datos
> existentes, pero avisar antes de volver a tocar `User`.

Fase activa: **Fase 16** (navegación tipo Instagram + eliminar mascota),
planificada en `FASE16-navegacion-mascota.md`. Alcance chico, dos partes que se
trabajan en paralelo sin solapamiento de archivos:

- **Parte 1 — navegación** (`feature/perfil-navegacion`): Perfil pasa a ser tab
  y Ajustes cuelga de él como pantalla push. **Toma la definición de tabs**
  (`app/app/(tabs)/_layout.jsx`, `app/app/_layout.jsx` y el nuevo
  `app/components/tabsConfig.js`): nadie más los toca mientras dure la parte.
- **Parte 2 — eliminar mascota** (`feature/eliminar-mascota`): archivar la
  mascota compartida. No toca navegación raíz.

> **Nota de rutas (Parte 1, 2026-07-22):** Ajustes dejó de ser tab. Vive en
> `app/app/ajustes/index.jsx` — la ruta pública sigue siendo `/ajustes` y
> `/ajustes/notificaciones` sigue colgando de ella. El Perfil se movió a
> `app/app/(tabs)/perfil.jsx`; `/perfil` no cambió.

Fase 14 cerrada (mascota independiente + perfil de usuario), planificada en
`FASE14-mascota-perfil.md`.

> **AVISO (Agente A, 2026-07-21) — `schema.prisma` reabierto de forma aditiva
> (Fase 0-bis):** se agregan a `MascotaAmistad` los campos `especie String?` y
> `especiePropuestaPor Int?` para la selección conjunta de especie al invitar
> (multi-especie). Migración `fase14-especie-mascota`, ejecutada por A en su
> rama. Cambio nullable de bajo riesgo; el resto de agentes no necesita esos
> campos, pero avisar antes de volver a tocar el modelo.

**Fase 13 en curso** (refactor de contexto): reducir el peso de docs y código
que se le pasa a los agentes por sesión. Acciones 1 y 2 (adelgazar `CLAUDE.md`
y `COORDINACION.md`, archivar fases cerradas) hechas; acciones 3-5 pendientes de
decisión.

Fases 0-12 cerradas — docs archivados en `docs/fases/`.
