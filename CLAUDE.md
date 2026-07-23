# MoodMatch

App de bienestar emocional. Este documento define el stack, las reglas
invariantes del producto y cómo se trabaja. Para el detalle de la fase en
curso, ver el `FASE*.md` activo en la raíz — cuál es la fase vigente lo dice
`COORDINACION.md`. Las fases cerradas viven en `docs/fases/`.

## Stack

- Backend: Node.js / Express, Prisma ORM, PostgreSQL (Neon)
- Frontend: Expo / React Native (expo-router, ruteo por archivos)
- Deploy: Render (backend), build nativo Android (EAS o local)

## Reglas de tono del chat de emociones (NO NEGOCIABLE)

Aplica a todo texto que muestre el bot (plantillas o IA):

- Nunca minimizar lo que la persona siente ("no es para tanto" prohibido)
- Nunca diagnosticar ni sugerir una condición de salud mental
- Nunca ser forzadamente positivo frente a emociones difíciles (TRISTE, ANSIOSO, ENOJADO)
- Siempre validar primero, sugerir después
- Ante señales de crisis genuina (no solo "estoy triste"), mostrar un mensaje
  claro que sugiera hablar con alguien de confianza o una línea de ayuda — sin
  ser alarmista para el uso normal del día a día

Estas reglas están verificadas mecánicamente (`guiones.test.js`, `tono.js`) y son
la referencia normativa del validador post-respuesta de Gemini (`CONTRATO-GEMINI.md`).

## Arquitectura y convenciones

- 6 categorías de ánimo base (FELIZ, TRISTE, ANSIOSO, CALMADO, ENOJADO, NEUTRO):
  el backend y las sugerencias deterministas dependen de ellas, no renombrar.
- Sugerencia de actividad: sistema determinista, 15 actividades por emoción — no
  reemplazarlo.
- Chat de emociones: IA (Gemini) con fallback a plantillas; contrato en
  `CONTRATO-GEMINI.md` (`POST /api/chat/respond`).
- Estilado: `makeThemedStyles`/`useStyles` de `theme/ThemeContext` (no `StyleSheet`
  suelto). Primitivos compartidos: `Tappable`, `Entrance`. Tokens de tema en `theme/`.
- 6 temas (Sereno, Nocturno, Amanecer, Alto Contraste, Fiesta, Personalizado);
  todo color custom valida contraste WCAG AA antes de aplicar (avisa, no bloquea).
- Backend: rutas en `routes/`, lógica en `lib/`. Sin módulos nativos nuevos
  (el dev-client es un APK precompilado).
- Migraciones a Neon SOLO con autorización explícita del usuario.

## Cómo se trabaja

- Plan mode obligatorio antes de cada fase; mostrar el plan y esperar confirmación.
- No avanzar a la siguiente fase sin confirmación explícita del usuario, sobre todo
  después de que pruebe visualmente en su dispositivo.
- La app queda funcional al final de cada fase — nunca una pantalla rota o a medio construir.
- Tests junto al feature, no al final.
- El tono de las conversaciones de emociones no se sacrifica por velocidad, en cada iteración.
- Trabajo multi-agente sobre git worktrees: ver `COORDINACION.md`.

## Atribución (NO NEGOCIABLE)

El proyecto se presenta como escrito íntegramente por el desarrollador humano.
Nunca acreditar a IA en mensajes de commit, comentarios de código, docs ni como
autor/co-autor/"generado con IA"/"Co-Authored-By" ni ninguna variante.
