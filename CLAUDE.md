# MoodMatch — Reconstrucción completa (v3)

## Estado del proyecto

Este documento **reemplaza** cualquier `CLAUDE.md` anterior. La Fase 1 (sistema de
temas base) ya está construida y funcionando. Antes de arrancar con lo nuevo,
hay 2 bugs pendientes de esa fase que se arreglan primero (ver sección 0).

A partir de acá, MoodMatch deja de ser un proyecto académico: es una reconstrucción
a fondo, con el objetivo de un producto pulido, original y competitivo con apps
de bienestar reales del mercado actual.

**Stack (se mantiene, no reescribir desde cero):**
- Backend: Node.js / Express, Prisma ORM, PostgreSQL en Neon
- Frontend: Expo / React Native
- Deploy: Render (backend), build nativo Android (EAS o local)

---

## 0. Bugs a corregir primero (antes de cualquier feature nueva)

1. **Error de React en pantalla Amigos**: toast rojo "An effect function must
   not return anything besides a cleanup function". Encontrar el `useEffect`
   que retorna algo indebido y corregirlo.
2. **Header/barra superior no sigue el tema**: queda verde fijo en todas las
   pantallas pese a que el resto de la UI sí quedó tokenizada. Revisar por qué
   no se migró y corregir.

Verificar ambos arreglos visualmente (o con test si aplica) antes de seguir.

---

## 1. Identidad visual — dirección nueva

Los colores institucionales de la universidad **ya no aplican**. MoodMatch necesita
identidad propia, original, que no se sienta genérica ni parecida a un tutorial de
React Native.

- Definir una paleta de marca original (no verde-genérico-wellness tipo Headspace/Calm
  clonado) — buscar algo distintivo que igual comunique calma y bienestar
- Tipografía: elegir 1-2 familias con personalidad (no la fuente default del sistema),
  jerarquía clara entre títulos, cuerpo y detalles
- Definir un lenguaje de **efectos y microinteracciones** consistente: transiciones
  entre pantallas, feedback táctil en botones/tarjetas, animaciones de entrada de
  contenido (no efectos porque sí — cada uno debe reforzar la sensación de calma
  y pulido, no sobrecargar)
- Esto se vuelve la base sobre la que se construyen los 5 temas existentes +
  personalización de usuario (sección 4)

## 2. Sección de emociones — de botones a conversación

Reemplazar la grilla de 6 botones de emoción por un **flujo conversacional de entrada**:

- Al abrir la sección, un mensaje tipo chat pregunta "¿Cómo estás hoy?" y muestra
  las 6 opciones de ánimo como respuestas rápidas dentro del chat (no como grilla
  aparte) — mantener las 6 categorías existentes (FELIZ, TRISTE, ANSIOSO, CALMADO,
  ENOJADO, NEUTRO) como base semántica, ya que el backend y las sugerencias de
  actividad dependen de ellas
- Al elegir una, se inicia una conversación breve sobre esa emoción: 2-4 intercambios
  como máximo antes de llegar a la sugerencia de actividad — no es terapia ni
  debe simular serlo, es acompañamiento breve
- **Reglas de tono no negociables** (esto es una app de bienestar, no un producto
  cualquiera):
  - Nunca minimizar lo que la persona siente ("tranquilo, no es para tanto" está prohibido)
  - Nunca diagnosticar ni sugerir una condición de salud mental
  - Nunca ser forzadamente positivo frente a emociones difíciles (TRISTE, ANSIOSO, ENOJADO)
  - Siempre validar primero, sugerir después
  - Si en algún punto detecta señales de crisis genuina (no solo "estoy triste"),
    el flujo debe poder mostrar un mensaje claro sugiriendo hablar con alguien de
    confianza o una línea de ayuda — sin ser alarmista para el uso normal del día a día
- El chatbot puede ser tan simple como respuestas basadas en reglas/plantillas por
  emoción (barato, predecible, fácil de mantener el tono) o usar la API de Claude
  si se decide invertir en algo más dinámico — **evaluar esto en plan mode antes de
  implementar**, no asumir la opción más compleja por defecto
- Al terminar la conversación, se llega a la sugerencia de actividad existente
  (mantener el sistema determinista de 15 actividades por emoción como base,
  no reemplazarlo)

## 3. Sección de amigos — reconstrucción completa

- **Mensajería directa**: poder enviarle un mensaje de texto libre a un amigo
  (no solo los 6 mensajes predefinidos de "ánimo") — definir si es chat 1 a 1
  persistente o mensajes puntuales tipo nota, según lo que sea razonable para
  el alcance del proyecto
- **Mantener el sistema de QR** tal cual está — funciona bien, no tocar esa parte
- **Agregar invitación por link/código compartible**: generar un link o código
  único por usuario que se pueda compartir por WhatsApp u otras apps (usando el
  share sheet nativo de Android/Expo, no una integración directa con la API de
  WhatsApp) — quien lo recibe y lo abre, llega a una pantalla de "agregar amigo"
  dentro de la app
- Revisar de nuevo las ideas de la fase anterior (perfiles enriquecidos, grupos,
  actividades colaborativas) y priorizar cuáles entran ahora vs. cuáles quedan
  para después — no es necesario meter todo de una vez

## 4. Ajustes — pulido + personalización real

- Mantener los 5 temas base ya construidos (Sereno, Nocturno, Amanecer, Alto
  Contraste, Fiesta) — no se descartan
- **Agregar un 6to modo: "Personalizado"** — el usuario elige sus propios colores
  (color picker para color primario, de acento y de fondo como mínimo) y su
  fuente preferida entre las opciones definidas en la sección 1
  - Validar automáticamente contraste WCAG AA igual que se hizo con los temas
    base — si la combinación elegida no pasa el mínimo, avisar al usuario antes
    de aplicar (no bloquear, pero sí advertir)
  - Guardar la paleta personalizada en el perfil del usuario (mismo mecanismo
    que ya existe para `themePreference`)
- Pulir el resto de la pantalla de Ajustes: agrupación visual más clara,
  mejor jerarquía entre secciones (Apariencia, Cuenta, Notificaciones si aplica)

## 5. Navbar y footer — actualización estética

- Rediseñar la barra de navegación inferior con un lenguaje visual más actual
  (2026): iconografía consistente, indicador de sección activa más elegante
  que un simple cambio de color, posible efecto de transición al cambiar de tab
- Revisar que la barra superior (header) sea coherente con el resto del rediseño
  una vez corregido el bug de la sección 0
- Todo esto debe respetar el sistema de temas — incluyendo el modo personalizado

---

## Cómo debe trabajar Claude Code

- Corregir los bugs de la sección 0 primero, verificar, y recién después seguir
- Trabajar por fases — sugerido: (0) bugs → (1) identidad visual base → (2) navbar/footer
  → (3) emociones/chat → (4) amigos → (5) ajustes/personalización — pero proponer
  el orden que tenga más sentido técnico si hay dependencias entre partes
- Antes de cada fase, **plan mode obligatorio**, mostrar el plan y esperar confirmación
- No avanzar a la siguiente fase sin confirmación explícita del usuario, sobre todo
  después de que él pruebe visualmente en su dispositivo
- Para la decisión de chatbot con IA real vs. basado en reglas (sección 2): presentar
  ambas opciones con sus trade-offs (costo, complejidad, calidez de la conversación)
  antes de implementar cualquiera
- Mantener siempre la app en estado funcional al final de cada fase — nunca dejar
  una pantalla rota o a medio construir
- Escribir/actualizar tests junto con cada feature, no al final
- Cuidar el tono de las conversaciones de emociones según las reglas de la sección 2
  en cada iteración — esto no es negociable ni se sacrifica por velocidad

