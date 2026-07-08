# MoodMatch — Visión sin límites (post-semestre)

## Contexto

MoodMatch ya fue entregado y aprobado (Nota 2, Ingeniería de Software). El semestre
terminó. A partir de ahora este documento reemplaza cualquier restricción de scope
académico anterior: el objetivo es convertir MoodMatch en una app de nivel profesional,
como si fuera a lanzarse de verdad a una tienda de apps.

**Stack actual (base a mantener, no reescribir desde cero salvo justificación clara):**
- Backend: Node.js / Express, Prisma ORM, PostgreSQL en Neon
- Frontend: Expo / React Native
- Deploy: Render (backend), EAS Build (APK)
- Tests: 22 tests unitarios con Jest (base a expandir, no descartar)

**Nada de lo anterior es un techo.** Las decisiones de scope pasadas (WebSockets
diferidos, alcance de amigos recortado, etc.) fueron correctas para una entrega
académica con tiempo limitado. Ahora no hay ese límite: se reevalúa todo desde cero
con el criterio de "¿qué haría que esta app sea genuinamente excelente?".

## Filosofía de esta fase

Trabajar como lo haría un equipo de producto + diseño + ingeniería senior construyendo
un producto real, no como un estudiante terminando una tarea. Eso significa:
- Explicar decisiones de diseño, no solo implementarlas
- Pensar en el usuario final, no solo en que "funcione"
- Cuidar el detalle: animaciones, microcopy, estados vacíos, casos borde
- Priorizar por impacto real en la experiencia, no por lo más fácil de implementar

---

## 1. Sistema de temas (Theming)

- Selector de tema accesible desde configuración, con preview en vivo antes de aplicar
- Mínimo 4-5 temas completos (no solo cambio de color primario): paleta, tipografía,
  iconografía y hasta el estilo de las ilustraciones/avatares deben sentirse coherentes
  por tema. Ejemplos de dirección: minimalista claro, oscuro/nocturno, pastel cálido,
  alto contraste (accesibilidad), y uno "playful"/colorido
- Persistencia del tema elegido (local y sincronizado con el perfil del usuario)
- Modo oscuro real (no solo invertir colores) con buen contraste y legibilidad
- Transición animada suave al cambiar de tema

## 2. Apartado de amigos — reconstruir a fondo

Ideas a evaluar e implementar según lo que tenga más sentido (no todo tiene que
entrar, pero hay que pensar en grande y justificar qué se prioriza):

- **Perfiles de amigos enriquecidos**: avatar, racha de días registrando ánimo,
  "ánimo predominante de la semana", última actividad compartida
- **Feed social liviano**: línea de tiempo de ánimos de amigos (con control de
  privacidad — el usuario decide qué comparte y con quién)
- **Grupos/círculos de amigos**, no solo lista plana — por ejemplo "familia",
  "amigos cercanos", "compañeros de curso"
- **Racha compartida**: si dos amigos registran ánimo el mismo día X veces
  seguidas, se desbloquea algo (gamificación liviana, sin exagerar)
- **Actividades colaborativas reales**: la sección "para hacer con amigos" pasa
  de ser una lista estática a poder proponerle una actividad a un amigo específico
  y que este la acepte/rechace, con notificación
- **Ánimo colectivo del círculo**: visualización agregada y anónima si se quiere
  ("tu grupo está mayormente CALMADO hoy")
- **Sistema de reacciones** además de los 6 mensajes predefinidos — algo más
  expresivo pero que mantenga el control de privacidad y no se convierta en
  otra red social ansiógena (cuidado de diseño ético aquí, es una app de bienestar)
- **Notificaciones push reales** (Expo Notifications) para invitaciones de
  amistad, actividades propuestas y ánimos recibidos
- **Búsqueda y sugerencia de amigos** más allá del QR (código alfanumérico
  para compartir a distancia, por ejemplo)

## 3. Emociones — pulido e innovación

- **Avatares emocionales que reaccionan y hablan**: cada uno de los 6 estados
  (FELIZ, TRISTE, ANSIOSO, CALMADO, ENOJADO, NEUTRO) tiene su propio personaje/avatar
  con animaciones y una "voz" (texto conversacional, no necesariamente audio real)
  que responde según el ánimo registrado. Ejemplo: si registras ANSIOSO, el avatar
  correspondiente muestra empatía y ofrece una actividad de respiración antes de
  la sugerencia estándar
- Definir personalidad y tono de cada avatar (consistente con las guías de
  wellbeing: nunca minimizar el malestar, nunca ser excesivamente positivo
  frente a emociones difíciles, siempre validar antes de sugerir)
- **Animaciones de transición** entre estados emocionales (Lottie o Reanimated)
- **Historial visual de ánimo**: gráfico de tendencia semanal/mensual, con
  posibilidad de detectar patrones simples ("llevas 3 días registrando ANSIOSO,
  ¿quieres ver actividades enfocadas en eso?") — sin diagnosticar ni psicoanalizar,
  solo reflejar el patrón que el propio usuario registró
  - **Importante (bienestar del usuario)**: esta función debe limitarse a mostrar
    lo que el usuario mismo registró, nunca inferir causas, nunca sugerir una
    condición de salud mental, y siempre dejar la puerta abierta a "hablar con
    alguien" sin ser alarmista
- **Journaling opcional**: nota corta de texto libre junto al registro de ánimo,
  privada por defecto
- **Sugerencias de actividad más inteligentes**: mantener el sistema determinista
  actual como base, pero permitir que evolucione con el historial del usuario
  (qué actividades ha marcado como "me ayudó" vs no), sin volverse una caja negra

## 4. Otras áreas a llevar a nivel profesional

- **Onboarding**: flujo de bienvenida que explique el propósito de la app y
  pida los permisos necesarios con contexto (por qué notificaciones, por qué cámara)
- **Accesibilidad real**: soporte de lector de pantalla, tamaños de fuente
  ajustables, contraste verificado en cada tema
- **Testing**: expandir mucho más allá de los 22 tests — integración, e2e de
  los flujos nuevos (amigos, temas, avatares), tests de los casos borde de
  privacidad en el feed social
- **Seguridad y privacidad**: dado que ahora hay más datos sociales/emocionales
  compartidos, reforzar controles de privacidad granular y auditar qué se expone
  en cada endpoint nuevo
- **Performance**: con feed social y más datos, revisar paginación, caching e
  índices en Neon desde el diseño, no como parche después
- **CI/CD**: pipeline que corra tests y linting en cada push
- **Documentación**: README y ADRs (Architecture Decision Records) para las
  decisiones grandes de esta fase, dado que ahora sí hay espacio para hacerlo bien

---

## Cómo debe trabajar Claude Code en esta fase

- Este es un proyecto grande: trabajar por **fases**, no intentar todo en una sola sesión maratónica
- Antes de cada fase grande (ej. "reconstruir amigos", "sistema de temas"), usar
  **plan mode**, mostrar el plan, y esperar confirmación antes de tocar código
- Mantener siempre la app en estado funcional: no dejar la mitad de una feature
  a medio construir sin poder correr la app
- Escribir tests junto con cada feature nueva, no al final
- Ser honesto sobre trade-offs y complejidad — si algo de la lista es demasiado
  para un proyecto de este tamaño, decirlo y proponer una versión más simple
  en vez de implementar algo a medias
- Cuidar especialmente el tono de los avatares emocionales y las funciones de
  historial/patrones: esta es una app de bienestar, no debe psicoanalizar al
  usuario ni hacer afirmaciones clínicas — solo reflejar y acompañar

## Configuración de la sesión (fuera de este archivo)

```
/model claude-fable-5
/effort max
```

O de forma persistente en `.claude/settings.json`:

```json
{
  "model": "claude-fable-5",
  "effortLevel": "max"
}
```

Recuerda que Fable a máximo esfuerzo es la configuración más cara y lenta —
tiene sentido para esta fase de reconstrucción profunda. Termina cada fase,
revisa el resultado, y decide si sigues con Fable/max o bajas a Sonnet 5/high
para iteraciones más chicas de ajuste.
