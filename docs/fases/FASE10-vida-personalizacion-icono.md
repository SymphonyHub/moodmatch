# MoodMatch — Fase 10: Vida, Personalización e Identidad Final

Va en la raíz de `MoodMatch`. Se ejecuta con los mismos 4 agentes, worktrees
nuevos desde `main` (que ya tiene toda la Fase 9 integrada).

---

## PRIORIDAD 0 — Fix de teclado: diagnóstico completo, causa real encontrada

**Diagnóstico ya realizado.** Resultado: existen 3 builds distintos, solo
el más reciente (`72e1875e`, preview, con el rebrand de ícono de Fase 9)
incluye el fix de teclado. La configuración nativa (`adjustResize`) está
bien en ambos caminos posibles; el proyecto corre edge-to-edge (Expo SDK
54 / RN 0.81.5), donde el sistema ya no redimensiona la ventana aunque se
declare `adjustResize` — por eso el fix actual depende 100% de que la API
`keyboardDidShow` de React Native dispare correctamente. En dispositivos
MIUI/Xiaomi, esa API tiene fallos documentados (altura mal medida,
eventos que no disparan) — es la causa más probable si el bug persiste
incluso con el build correcto instalado.

### Camino A — si el usuario ve el ícono viejo (hoja verde)

No hay bug de código. Solo hace falta instalar el build correcto
(`72e1875e`) y volver a probar. Cero cambios de código.

### Camino B — si el usuario ve el ícono nuevo (burbuja índigo) y el bug persiste

Confirma que es el problema de MIUI documentado. Solución: migrar
`useKeyboardOffset.js` de `keyboardDidShow` (API clásica de RN) a
`react-native-keyboard-controller`, que usa las APIs de WindowInsets con
animación nativa — inmune a los eventos rotos de MIUI, y es la
recomendación oficial de la guía de Expo para apps edge-to-edge.

**Nota importante:** esto es un módulo nativo, así que deja de funcionar
en el dev-client precompilado viejo (de antes de la Fase 8) — pero los
builds `preview`/`production` de EAS ya compilan nativo cada vez, así que
no cambia el flujo de instalación, solo obliga a regenerar el dev-client
local si se sigue usando para pruebas rápidas de JS.

Se descarta la opción de `softwareKeyboardLayoutMode: "pan"` (parchea sin
módulo nativo, pero satura toda la pantalla al escribir — peor UX,
solo válida como último recurso de emergencia).

### Asignación (una vez confirmado el camino con el usuario)

| Agente | Rama | Responsabilidad |
|---|---|---|
| Cualquiera, en `main` | `feature/keyboard-controller-migration` (solo si aplica Camino B) | Migrar useKeyboardOffset.js a react-native-keyboard-controller, verificar en dispositivo MIUI que el fix ahora sea confiable |

---

## PRIORIDAD 1 — Identidad visual final: ícono v2 (reemplaza el de Fase 9)

### Contexto

El ícono actual (burbuja de diálogo "Hora Azul", de la Fase 9) se
reemplaza por un concepto nuevo, inspirado en referencias visuales que el
usuario compartió — estilo más ilustrado/orgánico que la burbuja
minimalista anterior, con mayor originalidad.

### Dirección de diseño

Referencias que gustaron al usuario: un ícono de **bucle/anillo de
conexión entrelazado** (representa vínculo, comunidad) y uno de **luna
creciente con calidez interior** (representa calma, cierre del día —
coherente con el nombre "Hora Azul" del proyecto). El agente tiene
libertad creativa para fusionar o reinterpretar estos conceptos en la
paleta ya establecida (índigo #4A5FC1, acento coral #F0977A), priorizando
originalidad por sobre iconografía genérica de wellness.

**No usar ilustración fotorrealista ni assets externos** — igual que en
la Fase 9, construir como SVG vectorial en código
(`tools/iconos/generar.js` ya existe, extenderlo o crear una v2), para
mantener el ícono regenerable y consistente con el resto del proyecto.

### Asignación

| Agente | Rama | Responsabilidad |
|---|---|---|
| **D** | `feature/icono-v2-conexion-calma` | Explorar 2-3 variantes fusionando los conceptos de bucle/conexión y luna/calma, presentarlas al usuario antes de generar los assets finales (icon.png, adaptive-icon-foreground/background, splash-icon.png) |

---

## PRIORIDAD 2 — Personalización ampliada en Ajustes

### El problema

El selector de color actual son swatches fijos (colores predefinidos) y
solo 3 fuentes con poca diferencia entre sí — no permite que el usuario
realmente exprese su personalidad.

### Qué se pide

1. **Selector de color real**, no solo swatches: un control de matiz
   (hue) continuo — puede ser una rueda o barra de color deslizable —
   además de mantener algunos swatches curados como atajos rápidos para
   quien no quiera ajustar manualmente
2. **Ampliar de 3 a 6-8 fuentes**, con personalidades visualmente
   distintas entre sí (una más juguetona/redondeada, una más seria/
   editorial, una más geométrica, etc.) — no variaciones sutiles del
   mismo estilo
3. **Guardar más de una combinación personalizada**, no solo 1 activa —
   el usuario podría querer una paleta para el día y otra para la noche,
   o simplemente variar según el ánimo

### Guardrail que se mantiene

Cualquier combinación que el usuario arme debe seguir pasando la
validación de contraste WCAG AA ya existente — si no cumple, se avisa sin
bloquear, como ya funciona hoy.

### Asignación

| Agente | Rama | Responsabilidad |
|---|---|---|
| **D** | `feature/ajustes-personalizacion-v2` | Control de color continuo (hue), 6-8 fuentes nuevas, sistema de múltiples paletas guardadas, manteniendo la validación WCAG AA existente |

**Orden interno de D:** ícono primero (rápido, independiente), después
esta ampliación de Ajustes.

---

## PRIORIDAD 3 — Rework completo de "Actividades" (Para mí + Con amigos)

### El problema

Ambas pestañas son estáticas: tarjetas de texto sin interacción real más
allá de "quiero otra idea". Se siente sin vida para una app que se
presenta como una red de apoyo emocional.

### "Para mí" — qué se pide

- Reemplazar la tarjeta estática por algo con más interacción: al menos
  un widget interactivo real (ej. el de respiración guiada que ya estaba
  contemplado en fases anteriores, con animación de expansión/contracción)
- Marcar una actividad como completada con una pequeña animación de
  recompensa (sutil, no exagerada — coherente con el tono de calma de la
  app, no gamificación agresiva)
- Mostrar racha de días registrando ánimo como refuerzo positivo,
  conectado con el mensaje de resumen que ya existe de la Fase 7

### "Con amigos" — qué se pide

- **"Salida con amigos"**: el botón abre un selector real de amigo y
  envía una invitación a través del chat ya existente — el amigo puede
  aceptar o rechazar, con notificación
- **"Escribe a alguien que aprecias"**: abre directo el chat con el amigo
  elegido, con el mensaje sugerido precargado en el campo de texto (no
  que el usuario tenga que copiarlo manualmente)
- **"Comparte tu energía positiva"**: en vez de ser genérico, sugerir un
  amigo específico basado en datos que la app ya muestra públicamente en
  la lista de amigos (el chip de ánimo más reciente, ya visible hoy) —
  no se expone ningún dato nuevo o privado, solo se usa lo que ya es
  visible para sugerir a quién contactar

### Guardrail de privacidad (importante, no negociable)

La sugerencia de "a quién contactar" en Con amigos **solo puede usar
información que ya es visible hoy en la lista de amigos** (el estado de
ánimo más reciente que cada amigo ya comparte con este usuario). No se
debe inferir ni mostrar nada que el amigo no haya elegido compartir ya —
esto no es una feature nueva de exposición de datos, es una forma más
útil de presentar datos que ya existían.

### Asignación

| Agente | Rama | Responsabilidad |
|---|---|---|
| **A** | `feature/actividades-hub-vida` | Estructura visual renovada de ambas pestañas: animaciones de recompensa, layout de la racha, integración del widget interactivo en "Para mí" |
| **B** | `feature/actividades-widget-respiracion` | El widget interactivo de "Para mí" (ej. respiración guiada), conectado al ánimo registrado más reciente |
| **C** | `feature/actividades-con-amigos-interactivas` | Las 3 acciones de "Con amigos" (invitación real, chat precargado, sugerencia basada en dato ya visible), respetando el guardrail de privacidad |

**Orden:** A construye la estructura primero (rápido), B y C pueden ir en
paralelo después, ambos alimentando contenido a la estructura de A —
mismo patrón usado en el Wellness Hub de la Fase 6.

---

## Protocolo (igual que fases anteriores)

1. **Prioridad 0 primero, sola, bloqueante** — nada más arranca hasta que
   el teclado esté confirmado como resuelto en dispositivo
2. Cada agente en su propio worktree desde ahí en adelante, nunca directo
   en `main`
3. Plan mode obligatorio, esperar confirmación antes de implementar
4. D trabaja icono → ajustes, en secuencia propia
5. A primero en Prioridad 3, después B y C en paralelo
6. Prueba visual del usuario en dispositivo antes de cada merge
7. Merge a `main` uno a la vez, con test entre cada uno
