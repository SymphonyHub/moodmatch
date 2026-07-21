# MoodMatch — Fase 9: Pulido de UX Crítico + Identidad Visual Final

Este documento va en la raíz de `MoodMatch`. Se ejecuta con los mismos 4
agentes, en worktrees nuevos desde `main` (que ya tiene toda la Fase 8
integrada y probada).

---

## Prioridad 1 — Bug de teclado tapando el input (crítico, afecta 2 pantallas)

### El problema

En el chat de Amigos y en el chat de Emociones, al escribir un mensaje, el
teclado tapa la barra de envío — obligando a cerrar el teclado para poder
enviar. En apps de referencia (WhatsApp, cualquier chat moderno), la barra
de escritura sube junto con el teclado, siempre visible.

### Solución

Construir **un componente compartido** de input de chat con manejo
correcto de teclado (`KeyboardAvoidingView` con `behavior` correcto para
Android, o `react-native-keyboard-controller` si el comportamiento nativo
de RN no es suficientemente confiable), para que ambas pantallas de chat
lo reutilicen — evita resolver el mismo bug dos veces con comportamiento
inconsistente entre ambas.

### Asignación

| Agente | Rama | Responsabilidad |
|---|---|---|
| **A** | `feature/chat-input-keyboard-fix` | Construir `<ChatInputBar />` compartido con manejo de teclado correcto, auto-crecimiento del campo de texto con mensajes largos, botón de enviar siempre visible |
| **B** | (usa el componente de A) | Integrar `<ChatInputBar />` en el chat de Emociones |
| **C** | (usa el componente de A) | Integrar `<ChatInputBar />` en el chat de Amigos |

**Orden:** A primero (el componente es rápido de construir y es la base),
B y C después, en paralelo, cada uno integrándolo en su pantalla.

---

## Prioridad 2 — Continuidad real en el chat de emociones

### El problema

Hoy, para seguir conversando, el flujo fuerza a volver a seleccionar una
emoción — corta la sensación de conversación continua.

### Solución

La emoción se registra **una vez al inicio** de la sesión de chat (como ya
funciona). A partir de ahí, el usuario debe poder seguir escribiendo
libremente, sin que se le vuelva a pedir seleccionar una emoción, hasta
que decida explícitamente iniciar un registro nuevo (por ejemplo, con un
botón de "Registrar otra emoción" — que ya existe según lo visto en fases
anteriores, revisar que siga disponible pero no sea obligatorio).

### Guardrails a mantener (no se pierden con este cambio)

- El escudo de crisis (`useCrisisShield`) sigue evaluando **cada mensaje**
  de la conversación continua, no solo el primero
- Las reglas de tono del System Prompt (nunca minimizar, nunca
  diagnosticar, validar primero) siguen aplicando durante toda la
  conversación extendida, no solo al inicio
- El historial de ánimos para la Fase 7 (mensaje de resumen por patrón)
  sigue registrando el ánimo inicial de cada sesión, sin que la
  continuidad de la conversación lo afecte

### Asignación

| Agente | Rama | Responsabilidad |
|---|---|---|
| **B** | `feature/chat-continuo` | Permitir continuar la conversación sin forzar reselección de emoción, manteniendo activos el escudo de crisis y las reglas de tono en cada turno |

---

## Prioridad 3 — Identidad visual final: ícono y splash

### El problema

El ícono de la app y el splash siguen siendo el diseño original de hoja
verde, pese a que toda la identidad visual cambió a índigo/coral desde la
Fase 1 ("Hora Azul"). Quedó pendiente sin resolver hasta ahora.

### Dirección de diseño (a confirmar con el usuario antes de generar)

### Concepto elegido: burbuja de diálogo minimalista

Se eligió por sobre luna/onda, pulso, y formas orgánicas porque representa
lo que la app hace hoy (conversar sobre cómo te sientes, no solo registrar
un emoji) — no es un ícono genérico de "wellness", tiene identidad propia.

Especificación del diseño:
- Silueta de burbuja de chat simple, 1-2 formas máximo (sin detalle
  innecesario que se pierda a tamaño pequeño)
- Dentro de la burbuja, un trazo curvo tipo "onda de calma" (no los 3
  puntitos típicos de "escribiendo") — conecta lo conversacional con la
  sensación de calma
- Índigo (#4A5FC1) como color dominante de la burbuja
- Coral (el acento ya usado en la identidad "Hora Azul") como detalle
  pequeño en el trazo interior — mantiene la jerarquía de colores ya
  establecida

Construir como SVG vectorial en código — coherente con cómo se construyó
el resto de la identidad — y convertirlo a los formatos que Expo necesita.

### Asignación

| Agente | Rama | Responsabilidad |
|---|---|---|
| **D** | `feature/icono-splash-rebrand` | Generar `icon.png` (1024x1024), `adaptive-icon-foreground.png`, `adaptive-icon-background.png`, `splash-icon.png` según el concepto de burbuja de diálogo minimalista, en la paleta índigo/coral |

---

## Backlog futuro (NO entra en esta fase — mencionado para no perderlo)

### Minijuegos

Idea con potencial (algo tipo respiración guiada interactiva, o un
minijuego simple ligado al ánimo registrado), pero se deja fuera de esta
ronda a propósito: primero se cierra el pulido de UX crítico (que es lo
que más impacta la sensación de "app profesional" en el día a día), y los
minijuegos se abordan después como una fase acotada — empezando con **uno
solo**, bien definido, no un catálogo completo de una vez. Se retoma en
una Fase 10 si el usuario confirma que quiere avanzar con esto.

### Otras ideas de pulido a considerar más adelante

- Agrupación visual de mensajes por fecha en los chats (separadores tipo
  "Hoy", "Ayer")
- Indicador de "escribiendo..." también en el chat de Amigos (no solo en
  el de IA) — requeriría infraestructura de tiempo real (websockets), que
  no existe todavía; evaluar costo/beneficio antes de comprometerse
- Revisión de accesibilidad general (tamaños de fuente ajustables,
  soporte de lector de pantalla) en las pantallas nuevas de la Fase 8/9

---

## Protocolo (igual que fases anteriores)

1. Cada agente en su propio worktree, nunca directo en `main`
2. Plan mode obligatorio, esperar confirmación antes de implementar
3. Orden: A primero (Prioridad 1), después B y C en paralelo. D puede ir
   en paralelo con cualquiera de los anteriores (es independiente,
   trabaja solo en assets visuales)
4. Prueba visual del usuario en dispositivo antes de cada merge
5. Merge a `main` uno a la vez, con test entre cada uno
