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
Estado: (por completar)

### Agente C — Amigos
Estado: (por completar)

### Agente D — Ajustes/Temas
Estado: (por completar)
