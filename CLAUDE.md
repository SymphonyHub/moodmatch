# MoodMatch — Contexto del proyecto

## Qué es
App de bienestar personal (NO es red social). El usuario registra su estado
de ánimo y la app le sugiere una actividad acorde. Los amigos se agregan vía
un código QR único por usuario — no hay búsqueda pública ni descubrimiento
social.

## Contexto académico
- Curso: Ingeniería de Software, Universidad Santo Tomás (Chile)
- Evaluación: Nota 2, presentación **miércoles 24 de junio de 2026, 14:00 hrs**
- La rúbrica exige software funcional **real**, con base de datos conectada y
  sin errores — no basta con documentación en papel (eso cambió respecto a
  Nota 1)

## Alcance mínimo decidido — NO AMPLIAR sin pedir confirmación
Por el tiempo disponible, el alcance para la demo es deliberadamente acotado.
No agregues funcionalidades extra (notificaciones, chat, matching avanzado,
diseño muy pulido, etc.) sin que el usuario lo pida explícitamente:

1. Registro / login básico
2. Ingresar estado de ánimo → mostrar 1 actividad sugerida
3. Generar el propio código QR + escanear uno para agregar un amigo (simple,
   sin lista de amigos elaborada ni chat)

## Stack tecnológico
- **Backend**: Node.js + Express, carpeta `backend/`
- **Base de datos**: PostgreSQL en Neon (cloud, free tier). NO Docker, NO
  Postgres instalado localmente — decisión tomada por incompatibilidad de
  Docker Desktop con el Windows 10 LTSC del usuario
- **Conexión**: connection string vive en `backend/.env` como `DATABASE_URL`.
  Nunca debe aparecer en código, commits, ni en este archivo
- **ORM**: Prisma — úsalo para el esquema y las migraciones, no SQL a mano
- **Frontend móvil**: Expo (React Native), carpeta `app/`

## Estructura de carpetas
```
moodmatch/
├── backend/      ← API Node + Express + Prisma
├── app/          ← App móvil Expo
├── CLAUDE.md
└── README.md
```

## Estado actual
- [x] Cuenta Neon creada, conexión probada (`backend/test-db.js`)
- [ ] Esquema Prisma con las 6 tablas (basado en el ERD ya hecho para Nota 1)
- [ ] Endpoints CRUD básicos (usuarios, estados de ánimo, actividades, amigos)
- [ ] App Expo inicializada y conectada al backend
- [ ] Flujo de QR (generar/escanear)
- [ ] Tests unitarios reales (Jest) — recién tiene sentido una vez que el
      backend exista
- [ ] Documentación del modelo iterativo (4 documentos) — pendiente, es
      trabajo de escritorio fuera del código, no es tarea de Claude Code

## Convenciones
- Comunícate en español informal de Chile, directo, sin vueltas
- Simplicidad ante todo: es un proyecto de un solo desarrollador con plazo de
  días, no arquitectura "enterprise"
- Si una funcionalidad no está en el alcance mínimo de arriba, pregunta antes
  de construirla
