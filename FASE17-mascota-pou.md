# FASE 17 — Rework visual y de mecánicas de la mascota (estilo Pou + Pocket Love)

**Proyecto:** moodmatch
**Estado previo:** Fase 14 (mascota multi-especie) cerrada y validada en dispositivo. Fase 15 (chat) y Fase 16 (navegación + eliminar mascota) en curso, sin relación con esta fase — no comparten archivos ni dependencias.

---

## Índice

1. [Contexto y objetivo](#1-contexto-y-objetivo)
2. [Guía de estilo visual](#2-guía-de-estilo-visual)
3. [Decisión técnica: se queda en SVG, no Skia](#3-decisión-técnica-se-queda-en-svg-no-skia)
4. [Proceso de trabajo: checkpoints iterativos obligatorios](#4-proceso-de-trabajo-checkpoints-iterativos-obligatorios)
5. [Bloque 1 — Pulido visual (primero, es la base de todo lo demás)](#5-bloque-1--pulido-visual-primero-es-la-base-de-todo-lo-demás)
6. [Bloque 2 — Segunda estadística: energía](#6-bloque-2--segunda-estadística-energía)
7. [Bloque 3 — Minijuegos](#7-bloque-3--minijuegos)
8. [Bloque 4 — Tienda y hábitat](#8-bloque-4--tienda-y-hábitat)
9. [Reparto de trabajo y orden de dependencias](#9-reparto-de-trabajo-y-orden-de-dependencias)
10. [Checklist de QA antes de cada merge](#10-checklist-de-qa-antes-de-cada-merge)
11. [Fuera de alcance — candidatos a fase futura](#11-fuera-de-alcance--candidatos-a-fase-futura)

---

## 1. Contexto y objetivo

Tras probar Fase 14 en dispositivo, el usuario concluyó que el sistema de mascota, aunque funcional, está muy lejos visualmente de lo que buscaba: quiere que se sienta como **Pou** en profundidad de mecánicas, con la **estética de Pocket Love** (HyperBeard) — pastel, suave, chibi, cálido.

**Principio rector de esta fase, explícito del usuario:** el pulido visual es la prioridad número uno, antes que cualquier mecánica nueva. Agregar minijuegos y tienda sobre una base que todavía se ve plana no resuelve el problema real — por eso el Bloque 1 (visual) va primero y es tratado como la base de la que dependen los demás, no como un detalle al final.

No se descarta nada de lo construido en Fase 14 (catálogo de 7 especies, rig de animación, sistema de accesorios) — esta fase lo profundiza y lo pule, no lo reemplaza.

---

## 2. Guía de estilo visual

Referencia elegida: **Pocket Love** (HyperBeard) — pastel colors, personajes chibi suaves, sombreado tipo "peluche", ritmo de animación gentil con rebote, calidez ambiental. El usuario debe complementar esta guía con capturas reales de la app pegadas directo a la sesión del agente antes de que arranque el Bloque 1 — la descripción en palabras no reemplaza la referencia visual.

### Paleta

- **No se toca la paleta de marca de la app** (índigo #4A5FC1 + coral #F0977A) — identidad ya establecida en 16 fases.
- Se deriva una **paleta pastel propia, solo para el mundo de la mascota** (silueta, hábitat, accesorios): versiones más claras y desaturadas de los mismos tonos de marca, mismo patrón que ya usan para derivar variantes por tema en `theme/tokens.js`.

### El personaje

- Mantener las proporciones chibi que ya existen (cabeza grande, cuerpo redondeado) — es la base correcta, no hay que rehacerla.
- **Sombreado suave**: gradiente radial sutil sobre la silueta en vez de relleno plano, para que se vea "inflado"/de peluche.
- **Detalles de personalidad obligatorios en las 7 especies:**
  - Chapitas de rubor (blush): óvalo rosa semitransparente sobre las mejillas
  - Brillo en los ojos: punto blanco superpuesto sobre la pupila

### Animación

- Ritmo **gentil, no frenético** — la mascota "respira"/"se infla" más que "rebota". Curvas de easing largas y suaves (`withSpring` con configuración blanda, no rígida).
- Squash & stretch presente pero suave, coherente con ese ritmo.
- Anticipación antes de cada acción (compresión antes de saltar, inclinación antes de comer).
- Follow-through/superposición: apéndices blandos (orejas, cola, mechones) siguen moviéndose un instante después de que el cuerpo se detiene.
- Parpadeo con timing variable, no cada X segundos exactos.

### El mundo (hábitat)

- Fondo con 2-3 capas de profundidad (no un color liso), con detalles ambientales cálidos (una manta, una plantita, luz suave) — ver Bloque 4 para el sistema completo de hábitat.

### Jugosidad ("juice") en cada interacción

- Cada acción necesita feedback visual desproporcionado a lo mínimo necesario: números flotantes con rebote al ganar cariño/energía, partículas o destello en cada interacción (no solo en evolución), botones con estado de presión (se achican al tocar), barras de progreso que animan su relleno con un brillo que las recorre.

### Consistencia

Fijar antes de pulir nada: mismo grosor de contorno en las 7 especies (si usan contorno), misma paleta pastel en todos lados, mismo radio de esquina en la UI de mascota, mismo peso de sombra en todos los elementos.

---

## 3. Decisión técnica: se queda en SVG, no Skia

Evaluado explícitamente y descartado por ahora. Razón: toda la lista de objetivos de estilo de la sección 2 es lograble con SVG-in-code + reanimated (el mismo pipeline de Fase 14) salvo un punto — blur/glow real, que SVG maneja mal en React Native. Ese punto se simula con capas semitransparentes superpuestas en vez de blur real.

Skia no extendería el pipeline actual (`especies.js`/`geometria.js`/`disenoEtapas.js`) — lo reemplazaría, ya que usa un modelo de dibujo por canvas en vez de formas declarativas. Es una dependencia nativa nueva (mismo tipo de costo que pagó reanimated en Fase 14: primer uso, requiere build para probar cualquier cosa).

**Si en algún punto de esta fase el brillo/resplandor se ve claramente falso comparado con la referencia de Pocket Love**, ese sería el único motivo real para reabrir esta decisión — como una fase aparte, no dentro de esta.

---

## 4. Proceso de trabajo: checkpoints iterativos obligatorios

A diferencia de las fases anteriores, el Bloque 1 **no se escribe de una pasada**. Un agente escribiendo coordenadas de un path SVG sin ver el resultado puede aplicar toda la técnica correctamente y aun así el resultado no sentirse tierno de verdad — eso depende de ajustes finos de proporción que son un juicio visual, no una regla escribible en un doc.

Proceso obligatorio para el Bloque 1 (y recomendado para cualquier ajuste visual de esta fase):

1. El agente genera 2-3 variantes y las presenta en un Artifact (SVG renderizado real, no código a ciegas) — mismo patrón que ya usaron en Fase 14 para elegir dirección de especie.
2. El usuario da feedback específico sobre lo que ve ("más redondo", "los ojos muy chicos", "bájale la saturación") — no solo aprueba o rechaza en bloque.
3. El agente ajusta y vuelve a mostrar. Se repite hasta que el usuario esté conforme.
4. Recién ahí se aplica esa dirección a las 7 especies y se integra al rig de animación.

**Ventaja de velocidad:** como reanimated ya está compilado en el build nativo actual desde Fase 14, ajustar timing/curvas de animación se prueba con `expo start` sobre el dev-client existente — no requiere build nuevo por cada ajuste, mientras no se agregue ninguna dependencia nativa nueva. Solo el silueta/forma en sí necesita las rondas de Artifact; las animaciones se iteran directo en el dispositivo.

---

## 5. Bloque 1 — Pulido visual (primero, es la base de todo lo demás)

Aplica la guía de estilo (sección 2) sobre las 7 especies existentes y su rig de animación, siguiendo el proceso de checkpoints (sección 4). Alcance:

- Sombreado suave (gradiente) en las 7 siluetas
- Blush y brillo de ojos en las 7 siluetas
- Squash & stretch reajustado a un ritmo gentil (no frenético) en los 5 estados de animación existentes (idle, toque, celebración, evolución, atención)
- Anticipación y follow-through agregados donde falten
- Parpadeo con timing variable
- Jugosidad: números flotantes con rebote, partículas/destello en interacciones cotidianas (no solo evolución), estado de presión en botones de acción, animación de relleno + brillo en barras de progreso
- Paleta pastel derivada, aplicada consistentemente

**No toca:** lógica de negocio, backend, esquema de datos. Es 100% frontend/visual.

---

## 6. Bloque 2 — Segunda estadística: energía

- Separar el botón actual "Alimentar y jugar" en dos acciones reales: **Alimentar** (sube cariño, como hoy) y **Jugar** (sube una estadística nueva, "energía")
- Estado "cansada/con sueño" cuando la energía está baja — **nunca** se ve enferma o triste, solo más calmada, con pose de siesta. Mismo principio de tono que "necesita atención": nunca culpabilizante
- Animación de "comer" real y distintiva (mordisco/masticada) en vez de un salto genérico de reacción
- Posible sexto estado de animación en el rig (a definir en el plan del agente)

**Backend:** campo nuevo aditivo en `MascotaAmistad` (algo como `energia Int @default(50)`), migración simple siguiendo el protocolo de siempre (`--create-only`, revisar SQL, confirmar antes de aplicar).

---

## 7. Bloque 3 — Minijuegos

Dos minijuegos simples, reutilizando la base de animación ya pulida en el Bloque 1:

- **"Atrápala"**: la mascota aparece brevemente en un punto al azar de la pantalla, se toca antes de que se esconda. Sube energía + moneda nueva (ver Bloque 4).
- **"Ritmo de cariño"**: una barra con un indicador que se mueve, se toca cuando cae en la zona marcada. Sube cariño + moneda.

Cada minijuego con su propia micro-animación de éxito (extendiendo el sistema de partículas de Fase 14 con variaciones de color/forma, no construyendo uno nuevo por juego).

**Cooldown suave**: una vez al día por persona por minijuego — coherente con el principio de "sin presión" de toda la app. A diferencia de Pou (pensado para juego repetitivo sin límite, porque vende moneda real), esta app no tiene monetización y no debería incentivar juego compulsivo.

**Backend:** tracking de cooldown puede resolverse igual que el límite semanal de regalos en Fase 14 (marcador en `Cheer`, sin necesidad de migración) — el agente confirma el enfoque en su plan antes de escribir código.

---

## 8. Bloque 4 — Tienda y hábitat

Depende de que exista la moneda del Bloque 3.

- Moneda nueva (nombre a definir con tono coherente al resto del proyecto — ej. "semillitas" o similar)
- Accesorios **comprables** con esa moneda, además de los que ya se desbloquean por nivel (Fase 14) — dos caminos de obtención en vez de uno
- Fondos/decoración del hábitat de la mascota (la calidez ambiental de la sección 2), mismo patrón SVG-in-code que ya usan para los sprites — categoría nueva dentro del sistema de accesorios existente

**Backend:** balance de moneda persistido (aditivo, compartido por la amistad igual que el cariño — es "los ahorros de su mascota juntos", no individual). El agente propone el campo/migración exacta en su plan.

---

## 9. Reparto de trabajo y orden de dependencias

A diferencia de Fase 14, esta fase tiene una dependencia real de orden — no todo puede ir en paralelo desde el día 1:

```
Bloque 1 (visual, con checkpoints) 
    │
    ├──► Bloque 2 (energía) ──┐
    │                          │
    └──► Bloque 3 (minijuegos)─┴──► Bloque 4 (tienda, depende de la moneda de B3)
```

- **Bloque 1 primero, en solitario** — es la base sobre la que se apoyan los demás (rig de animación pulido, sistema de partículas extendido). No tiene sentido paralelizarlo con nada más porque todo lo demás lo va a usar.
- **Bloques 2 y 3 en paralelo**, una vez cerrado el Bloque 1 — son independientes entre sí (energía no depende de minijuegos ni viceversa).
- **Bloque 4 al final** — necesita que la moneda del Bloque 3 ya exista.

Recomendado: el agente dueño histórico del visual de mascota (el que trabajó Parte C en Fase 14) toma el Bloque 1. Para Bloques 2/3, dos agentes en paralelo tiene sentido dado que no comparten archivos de lógica (energía es un campo/acción nueva; minijuegos son pantallas nuevas). Bloque 4 puede tomarlo cualquiera de los dos que termine primero.

---

## 10. Checklist de QA antes de cada merge

- [ ] `npm test` verde en backend y app
- [ ] Bloque 1: comparación lado a lado con la referencia de Pocket Love — el usuario confirma explícitamente que el resultado se siente en la dirección correcta, no solo que "no se ve mal"
- [ ] Las 7 especies mantienen consistencia de estilo entre sí tras el pulido (mismo grosor de contorno, misma paleta pastel, mismo peso de sombra)
- [ ] Ninguna animación se siente frenética — ritmo gentil confirmado en dispositivo, no solo en código
- [ ] Bloque 2: estado "cansada" nunca se lee como enferma/triste/culpabilizante
- [ ] Bloque 3: cooldown de minijuegos funciona, no se puede jugar de forma repetitiva sin límite
- [ ] Bloque 4: accesorios comprables no compiten ni contradicen los desbloqueados por nivel (ambos caminos conviven)
- [ ] Sin firmas de IA en ningún commit

---

## 11. Fuera de alcance — candidatos a fase futura

- **Skia** — ver sección 3, solo si el blur/glow real se vuelve un problema visible tras completar esta fase
- **Sonido** — mencionado como idea, no forma parte de esta fase
- **Más minijuegos o ítems de temporada** — la base de dos minijuegos es el punto de partida; ampliar el catálogo queda para cuando se vea cómo funcionan estos dos primero
