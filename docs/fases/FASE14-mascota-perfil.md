# FASE 14 — Sección de Mascota Independiente + Perfil de Usuario

**Proyecto:** moodmatch
**Herramienta de ejecución:** agentes A/B/C/D en paralelo sobre Git Worktrees, Agente E como integrador
**Estado previo:** Fase 12 cerrada y con QA de push notifications resuelta (crash de Ajustes y bug de permisos de notificaciones ambos arreglados y en main). Fase 13 (refactor de tokens) corriendo en paralelo — no comparte archivos con esta fase, sin dependencias.

---

## Índice

1. [Contexto y objetivo](#1-contexto-y-objetivo)
2. [Fase 0 — Migración base compartida](#2-fase-0--migración-base-compartida-bloqueante)
3. [Fase 0-bis — Migración de selección de especie](#2b-fase-0-bis--migración-de-selección-de-especie-bloqueante-para-parte-a)
4. [Parte A — Sección de Mascota](#3-parte-a--sección-de-mascota)
5. [Parte B — Sistema visual y evolución](#4-parte-b--sistema-visual-y-evolución)
6. [Parte C — Interacciones sociales entre mascotas](#5-parte-c--interacciones-sociales-entre-mascotas)
7. [Parte D — Perfil de usuario](#6-parte-d--perfil-de-usuario)
8. [Reparto de agentes](#7-reparto-de-agentes)
9. [Coordinación y archivos compartidos](#8-coordinación-y-archivos-compartidos)
10. [Checklist de QA antes de cada merge](#9-checklist-de-qa-antes-de-cada-merge)
11. [Fuera de alcance — candidatos a fase futura](#10-fuera-de-alcance--candidatos-a-fase-futura)

---

## 1. Contexto y objetivo

Hoy la mascota vive metida dentro del chat de cada amigo (card fija arriba de los mensajes) y se activa automáticamente al agregar un amigo — no es opcional. El usuario quiere que sea **opt-in**, con su propia sección en la navegación principal, y que se convierta en el mini-juego central de la app: mascotas visualmente pulidas, con evolución por niveles, animaciones reales y mecánicas sociales entre amigos que la cuidan juntos.

En paralelo, el perfil de usuario hoy es solo una sub-sección dentro de Ajustes (nombre, avatar, cerrar sesión) — se separa en una pantalla propia, con identidad real dentro de la app.

**Principio de diseño no negociable:** ninguna feature de esta fase debe sentirse como gamificación agresiva o presión social. Mismo tono de calma y bienestar que rige el resto de la app — el objetivo es compañía y constancia, no competencia ni ansiedad por no "perder" progreso.

**Actualización de alcance (post-arranque):** la mascota ya no tiene una única identidad visual fija para toda la app. Es un catálogo cerrado de 7 especies, y la especie de cada mascota se elige **en conjunto entre los dos amigos** al invitarse — como elegir un inicial de Pokémon. Ver Parte A (flujo de invitación) y Parte B (catálogo de especies) actualizadas más abajo.

---

## 2. Fase 0 — Migración base compartida (bloqueante)

Antes de abrir los 4 worktrees, un solo agente resuelve en una rama `fase14-migracion-base`:

**Cambios a `prisma/schema.prisma`** (ajustar nombres reales al schema existente):

```prisma
model MascotaAmistad {
  // ...campos existentes de Fase 12...
  etapa              Int      @default(1)   // 1 = base, 2 = primera evolución, 3 = final
  accesorioCabeza    String?                // id del accesorio equipado, null = ninguno
  accesorioColor     String?                // id de variante de color/patrón equipado
  accesoriosDesbloqueados Json?             // ["acc_gorro_1", "acc_patron_estrellas", ...]
  activa             Boolean  @default(true) // false = amistad eliminada, mascota archivada
  invitacionEstado   String   @default("pendiente") // "pendiente" | "aceptada" | "rechazada"
  invitadaPor        Int?     // userId de quien envió la invitación
}

model User {
  // ...campos existentes...
  racha              Int      @default(0)   // racha de días registrando ánimo (ya calculada en historial.js, se persiste para mostrar en perfil)
}
```

**Nota importante:** la mascota deja de crearse automáticamente al agregar un amigo. Ahora se crea con `invitacionEstado: "pendiente"` solo cuando un usuario envía una invitación explícita desde "Con amigos" en Actividades (ver Parte A, sección de flujo de invitación).

```bash
npx prisma migrate dev --create-only --name fase14-mascota-perfil-base
# revisar el SQL generado antes de aplicar
npx prisma migrate dev
git add prisma/
git commit -m "fase14: migración base (etapas, accesorios, invitación de mascota, racha)"

git worktree add ../MoodMatch-agenteA -b feature/mascota-navegacion
git worktree add ../MoodMatch-agenteB -b feature/mascota-interacciones-sociales
git worktree add ../MoodMatch-agenteC -b feature/mascota-visual-evolucion
git worktree add ../MoodMatch-agenteD -b feature/perfil-usuario
```

---

## 2b. Fase 0-bis — Migración de selección de especie (bloqueante para Parte A)

Alcance agregado después del arranque de Fase 14: la mascota es multi-especie (ver Parte B actualizada) y la especie se elige en conjunto entre los dos amigos al invitarse, no queda fija por una sola dirección de diseño. Esto requiere una migración adicional pequeña y aditiva sobre el schema ya cerrado en Fase 0:

```prisma
model MascotaAmistad {
  // ...campos de Fase 0 sin cambios...
  especie              String?  // id de la especie propuesta/elegida (ver catálogo en Parte B), null hasta que se acepta una propuesta
  especiePropuestaPor  Int?     // userId de quien hizo la última propuesta de especie
}
```

Una vez `invitacionEstado: "aceptada"`, `especie` queda **inmutable** — ni frontend ni backend deben permitir cambiarla después.

**Responsable:** Agente A, dentro de su propia rama (es quien la necesita directamente para el flujo de invitación). Mismo protocolo que Fase 0:

```bash
npx prisma migrate dev --create-only --name fase14-especie-mascota
# revisar el SQL generado antes de aplicar
npx prisma migrate dev
```

Avisar en `COORDINACION.md` antes de tocar `schema.prisma`, aunque sea aditivo y de bajo riesgo.

---

## 3. Parte A — Sección de Mascota

### Navegación

Nueva tab principal "Mascota" en la barra inferior (icono de huella o silueta de criatura), entre "Actividades" y "Amigos" o al final — a definir según cómo quede el espaciado visual con 6 tabs en vez de 5.

### Flujo de invitación y selección de especie (reemplaza la activación automática)

1. Desde "Con amigos" en Actividades (o desde el perfil de un amigo específico), botón **"Invitar a cuidar una mascota juntos"**
2. Se elige un amigo **y se propone una especie** del catálogo cerrado de 7 (carrusel — ver catálogo en Parte B; solo se necesita id/nombre/ícono chico de cada una, no el sprite final pulido)
3. Se crea `MascotaAmistad` con `invitacionEstado: "pendiente"`, `invitadaPor: <userId>`, `especie: <propuesta>`, `especiePropuestaPor: <userId>`
4. El amigo recibe una notificación push (reutilizar infraestructura de Fase 12: tipo de evento `invitacion_mascota`, el texto ahora incluye qué especie se propuso)
5. El amigo ve la invitación con tres acciones posibles:
   - **Aceptar** → `invitacionEstado: "aceptada"`, `especie` queda fija e inmutable, la mascota queda activa para ambos
   - **Proponer otra especie** → cambia `especie` y `especiePropuestaPor` a él, `invitacionEstado` se mantiene `"pendiente"`, se notifica de vuelta al proponente original (ida y vuelta tipo "rotación" hasta que alguien acepte)
   - **Rechazar** → `invitacionEstado: "rechazada"`, no se vuelve a mostrar automáticamente (el que invitó puede reintentar manualmente más adelante con una nueva propuesta)

Ningún lado puede imponer una especie unilateralmente — siempre requiere el "Aceptar" explícito del otro. Funciona igual para cualquiera de tus amigos; cada amistad negocia su propia especie de forma independiente.

### Pantalla raíz (lista)

| Caso | Comportamiento |
|---|---|
| 0 amigos | Estado vacío: explica que la mascota se activa invitando a un amigo, CTA a Mi QR |
| 1 amistad con mascota activa, sin invitaciones pendientes | Salta directo al detalle de esa mascota |
| 2+ amistades con mascota activa | Lista de cards: sprite miniatura (según su especie), nombre, etapa, badge rojo si "necesita atención" (>48h sin cuidado, mismo umbral que ya usa Fase 12 para notificaciones) |
| Invitaciones pendientes (enviadas o recibidas) | Sección separada arriba de la lista: "Invitaciones", mostrando la especie propuesta, con botones de aceptar/proponer otra/rechazar para las recibidas y estado "Esperando respuesta" para las enviadas |
| Amigos sin invitación de mascota | Sección "Invita a tu mascota" con botón directo por cada amigo elegible |

### Pantalla de detalle de una mascota

1. **Header hero:** sprite grande (según especie elegida) con animación idle (ver Parte B), nombre, etapa como texto ("Cachorro" / "Joven" / "Adulta")
2. **Barra/anillo de progreso:** reemplaza la línea delgada actual — anillo circular alrededor del sprite o barra gruesa, color de acento según etapa
3. **Acciones de cuidado:** "Alimentar y jugar" (cooldown 24h, ya implementado en Fase 12) con feedback visual reforzado al usarlo
4. **Reto cooperativo activo:** card con progreso de ambos usuarios y fecha límite (ya implementado, mantener)
5. **Historial de hitos:** timeline vertical (el campo `historialHitos` ya existe en el schema desde Fase 12 pero no se renderiza en ningún lado — esta pantalla lo expone por primera vez)
6. **Accesorios:** grid de accesorios desbloqueados, con opción de equipar/desequipar (ver Parte B)
7. **Configuración:** cambiar nombre (flujo de negociación ya existente)

---

## 4. Parte B — Sistema visual y evolución

### Catálogo de especies (multi-especie, no una sola dirección)

La mascota es un catálogo cerrado de 7 especies, elegida en conjunto por cada pareja de amigos al invitarse (ver Parte A). Todas se pulen y animan completo — ninguna queda como placeholder de fase futura:

| Especie | Descripción |
|---|---|
| Polluelo | Ave redonda con cresta y pico suave — la más juguetona y expresiva |
| Nutria lunar | Mamífero cálido y redondo, cabezón y acogedor |
| Espíritu de calma | Etéreo, flotante, sin patas — la dirección más bienestar/meditación |
| Pingüino | Compacto y erguido, contraste tipo esmoquin con pico y patas coral — gana casquete oscuro y un detalle dorado al evolucionar |
| Perro | Cachorro de orejas caídas, con hocico y nariz coral; la cola se levanta y las orejas se acortan a medida que evoluciona |
| Dinosaurio | Regordete con cola y cabeza chica adelantada; las placas dorsales crecen de 3 a 5 con cada etapa |
| Huevo | Especie propia con sus 3 etapas — se queda huevo, gana detalle/decoración en cada evolución (no revela ni se convierte en otra especie, estilo Pou) |

**Arquitectura:** la especie es un parámetro, no una bifurcación de código. `disenoEtapas.js` y `accesorios.js` reciben `especie` además de `etapa`/`personalidad` — cada especie define su propia silueta por etapa en un catálogo nuevo (`especies.js`), pero el rig de animación reanimated (idle, toque, celebración, evolución, atención) es **único y compartido entre las 7**, no se reimplementa por especie.

**Entrega temprana a Parte A:** la lista de ids/nombres de las 7 especies (no los sprites pulidos) debe pasarse a Agente A lo antes posible — es lo único que necesita para construir el carrusel de propuesta del flujo de invitación; no bloquea el resto del pulido visual.

### Etapas de evolución (estilo Pokémon)

| Etapa | Nivel requerido | Nombre visual | Cambios de diseño |
|---|---|---|---|
| Base | 1 | "Cachorro" | Proporciones redondeadas, cabeza grande, diseño simple |
| Evolución 1 | 16 | "Joven" | Proporciones más balanceadas, primer accesorio desbloqueable disponible |
| Evolución final | 36 | "Adulta" | Diseño final, con un detalle visual distintivo si acumula muchos hitos (ej. un brillo o marca especial) |

Esta tabla aplica igual a las 7 especies — lo que cambia entre especies es la silueta y personalidad visual, no los umbrales de nivel.

La transición entre etapas debe dispararse con una animación de evolución dedicada (ver abajo), no un cambio instantáneo de sprite.

### Pipeline de producción de assets

**Decisión de alcance:** todo el diseño y animación de la mascota se hace 100% delegado a los agentes — sin herramientas de diseño manual (Figma, Rive) operadas por el usuario. El objetivo es maximizar el pulido visual dentro de esa restricción, no simplemente "lo mínimo que funcione".

- Construir como SVG-in-code, siguiendo el mismo patrón que `tools/iconos/generar.js` (Fase 9/10) — colores referenciando theme tokens, regenerable, sin depender de archivos de imagen estáticos por tema
- Animaciones con `react-native-reanimated` — sin Rive, ya que requiere edición manual en su editor visual, fuera del alcance decidido
- Para maximizar el nivel de pulido lograble puramente en código, el agente dueño de esta parte debe aplicar explícitamente estas técnicas (no quedarse en formas planas básicas):
  - **Squash & stretch** en las transiciones de animación (compresión/estiramiento sutil al saltar o reaccionar) — es la técnica de animación más efectiva para dar sensación de vida sin necesitar más frames
  - **Capas de sombra y luz simuladas** dentro del propio SVG (un gradiente radial sutil o una forma de sombra semitransparente debajo del sprite) para dar sensación de volumen en vez de verse plano
  - **Easing curves** con física de resortes (`withSpring` de reanimated) en vez de curvas lineales — coherente con el lenguaje de motion tokens que ya usa el resto de la app
  - **Micro-detalles animados independientes** (parpadeo del ojo cada X segundos, orejas o cola con leve movimiento constante) en vez de un sprite completamente congelado en idle
  - **Partículas simples para celebración/evolución** (formas pequeñas con `reanimated` moviéndose y desvaneciéndose) reutilizando/extendiendo el sistema de confetti ya construido en Fase 12
- Antes de generar el diseño final de cada etapa, el agente presenta las direcciones visuales de las 7 especies (silueta base por etapa) para aprobación conjunta antes de pulir — ya no es "elegir una entre tres", las 7 se pulen y animan completo tras la aprobación

### Estados de animación requeridos

| Estado | Trigger | Descripción |
|---|---|---|
| Idle | Por defecto | Sutil — respiración o parpadeo, nunca estático del todo |
| Reacción al toque | Usuario toca el sprite | Breve y satisfactoria — salto, giro, o similar |
| Celebración | Sube de nivel o completa un reto | Más elaborada, reutilizar el sistema de confetti de Fase 12 |
| Evolución | Cruza nivel 16 o 36 | Animación dedicada de transformación, la más elaborada de todas |
| Necesita atención | >48h sin cuidado | Sutil, sin ser culpabilizante — coherente con las reglas de tono de nunca forzar emociones negativas |

### Personalidad visual

Mapear los 3-4 arquetipos ya calculados en Fase 12 (según ánimo agregado de la amistad: juguetona / tranquila / curiosa / cariñosa) a variaciones sutiles de la pose idle por defecto — no requiere sprites completamente distintos, solo variación de animación base. Se aplica igual dentro de cada especie.

### Sistema de accesorios cosméticos

- Dos categorías simples: **cabeza** (gorro, corona, orejas) y **color/patrón** — evita construir un sistema de vestuario completo e inmantenible
- Se desbloquean por nivel alcanzado o por hitos específicos del historial — **nunca comprables**, coherente con que la app no tiene mecánicas de monetización
- Visibles para ambos usuarios de la amistad
- Los accesorios de cabeza deben diseñarse de forma que encajen razonablemente en las 7 siluetas (o definir variantes por especie si una silueta no lo permite — ej. Espíritu de calma sin cabeza definida)

---

## 5. Parte C — Interacciones sociales entre mascotas

### Mecánicas existentes (Fase 12, mantener)

- Cuidado diario individual con cooldown 24h por usuario
- Reto cooperativo con ventana de tiempo

### Mecánicas nuevas

| Mecánica | Funcionamiento | Límites |
|---|---|---|
| Regalos entre amigos | Envía un boost de cariño o desbloquea antes un accesorio para el otro | Máximo 1 por semana por amistad |
| Racha compartida | Cuenta días consecutivos en que *alguno de los dos* cuidó a la mascota (no competitivo — se celebra la constancia conjunta, no quién hizo más) | Se rompe solo si ninguno de los dos cuidó ese día |
| Notificación social suave | "Tu amigo cuidó a Lumi hoy" | Frecuencia baja — no una notificación por cada acción individual |
| Retos cooperativos variados | Ampliar de 1 tipo a un catálogo cerrado de 3-4: cuidado simultáneo, racha de mensajes, registrar ánimo ambos el mismo día, [uno más a definir por el agente dueño] | Lista cerrada, no un sistema abierto/configurable |

Ninguna de estas mecánicas depende de qué especie sea la mascota — funcionan igual para las 7.

### Casos borde a resolver explícitamente

- **Amistad eliminada:** la mascota se marca `activa: false` (archivada, no borrada) — el historial de hitos se conserva por si la amistad se restaura, pero deja de ser interactiva
- **Invitación nunca aceptada:** queda en estado `pendiente` indefinidamente, sin recordatorios insistentes — el usuario que invitó puede ver el estado pero no se le presiona a que su amigo responda
- **Múltiples mascotas por usuario:** cada amistad tiene su propia `MascotaAmistad` independiente — confirmar que la pantalla de lista (Parte A) soporta esto sin degradar el rendimiento con muchos amigos

---

## 6. Parte D — Perfil de usuario

### Objetivo

Separar identidad (perfil) de configuración (Ajustes). Hoy "Cuenta" dentro de Ajustes solo tiene nombre, avatar y cerrar sesión — se traslada y se expande.

### Contenido de la pantalla de Perfil

1. **Header:** avatar grande, nombre, opción de editar foto (Galería/Cámara — funcionalidad ya existente, se traslada)
2. **Racha actual:** días consecutivos registrando ánimo (dato ya calculado en `historial.js`, se persiste en el nuevo campo `User.racha` para no recalcularlo cada vez)
3. **Resumen social:** cantidad de amigos, con link directo a la pantalla de Amigos
4. **Mascotas destacadas:** mini preview de cada mascota activa (sprite pequeño según su especie + nombre + etapa), con link directo a su detalle en la nueva sección de Mascota — reutiliza el mismo componente de sprite que Parte B, sin lógica propia de renderizado
5. **Hitos/insignias:** si se decide construir un sistema de insignias transversal (no solo de mascota) — **explícitamente opcional para esta fase**, se puede dejar el espacio preparado en el diseño pero no implementar la lógica todavía si el alcance ya es grande

### Qué NO vive en el perfil (se queda en Ajustes)

- Tema, accesibilidad, notificaciones, preferencias de no molestar
- Cerrar sesión

### Acceso

- Tocar el propio avatar en la pantalla de Inicio (o donde ya aparezca en la navegación) abre el Perfil directamente
- Ajustes conserva un link corto "Ver mi perfil" para quien entre por ahí primero

---

## 7. Reparto de agentes

| Agente | Rama | Responsabilidad | Depende de |
|---|---|---|---|
| **A** | `feature/mascota-navegacion` | Nueva tab de Mascota, pantalla raíz (lista + estados + invitaciones), pantalla de detalle (estructura, sin animaciones todavía), flujo de invitación con **selección conjunta de especie** (propuesta/contrapropuesta/aceptación) | Fase 0, Fase 0-bis (migración de especie, la ejecuta él mismo), lista de ids de especies de C (parcial — no bloquea el resto) |
| **B** | `feature/mascota-interacciones-sociales` | Regalos entre amigos, racha compartida, notificación social suave, catálogo ampliado de retos cooperativos, manejo de los casos borde (amistad eliminada, invitación no aceptada) | Fase 0, coordina con A sobre el shape de la pantalla de detalle |
| **C** | `feature/mascota-visual-evolucion` | **Catálogo de 7 especies** (Polluelo, Nutria lunar, Espíritu de calma, Pingüino, Perro, Dinosaurio, Huevo), evolución por etapas (niveles 16/36) para cada una, pipeline de sprites SVG-in-code, estados de animación (idle/reacción/celebración/evolución/necesita atención) como rig único compartido, sistema de accesorios, mapeo de personalidad a pose | Fase 0 |
| **D** | `feature/perfil-usuario` | Pantalla de Perfil completa, traslado de "Cuenta" desde Ajustes, cálculo/persistencia de racha en `User.racha`, links de acceso desde Inicio y Ajustes | Fase 0 (campo `racha`) |

**Orden sugerido de merge:** A primero (es la base estructural que B y C necesitan para integrar contenido), después B y C en paralelo (no dependen entre sí directamente), D al final o en paralelo desde el inicio ya que es independiente del resto.

---

## 8. Coordinación y archivos compartidos

- `prisma/schema.prisma`: cerrado en Fase 0, reabierto de forma aditiva en Fase 0-bis (campos `especie`/`especiePropuestaPor`, ejecutados por A). Avisar antes de tocarlo, aunque el resto de agentes no los necesite directamente.
- **Dependencia dura entre A y C:** Agente C debe pasarle a Agente A la lista de ids/nombres de las 7 especies en cuanto la tenga definida (no hace falta esperar a los sprites pulidos) — es lo único que bloquea el carrusel de selección de especie del flujo de invitación.
- Pantalla de detalle de mascota: **A es dueño de la estructura**, B y C integran contenido (interacciones sociales y elementos visuales respectivamente) sin reescribir el archivo completo — mismo patrón usado en el Wellness Hub de Fase 6.
- Tab bar / navegación raíz: coordinar con quien sea dueño histórico de ese archivo (revisar COORDINACION.md vigente) antes de agregar la 6ª tab.
- Ajustes: D necesita tocar la sección "Cuenta" para trasladarla — avisar si algún otro agente tiene trabajo pendiente ahí (no debería, tras el fix del crash de Fase 12).

---

## 9. Checklist de QA antes de cada merge

- [ ] `npm test` verde en la rama (backend + app)
- [ ] `npm test` verde en `main` después del merge
- [ ] Prueba funcional en dispositivo real de lo que tocó ese agente:
  - **A:** flujo completo de invitación → propuesta de especie → aceptación/contrapropuesta/rechazo → mascota activa con especie fija; verificar que la especie no se pueda cambiar tras aceptar; navegación entre lista y detalle
  - **B:** envío de regalo, racha compartida sumando/rompiendo correctamente, notificación social llega
  - **C:** las 7 especies se ven claramente distintas entre sí, y las 3 etapas de evolución se distinguen dentro de cada una; cada estado de animación dispara en el momento correcto; accesorios se equipan y se ven para ambos usuarios de la amistad
  - **D:** perfil muestra datos reales y actualizados; racha coincide con lo que muestra el historial de ánimo; preview de mascotas muestra el sprite correcto según su especie
- [ ] Sin regresiones visibles en pantallas existentes (especialmente Ajustes, tras el fix del crash de Fase 12)
- [ ] Ninguna mecánica nueva se siente competitiva o de presión social al probarla — validar contra el principio de diseño de la sección 1

---

## 10. Fuera de alcance — candidatos a fase futura

- **Sistema de insignias/hitos transversal** (más allá de los de mascota) — mencionado en la sección de Perfil como espacio preparado pero no implementado
- **Widget de Android para registro rápido de ánimo** — ya venía arrastrándose de Fase 12/13 por requerir código nativo
- **Refactor de tokens (Fase 13)** — corre en paralelo, sin dependencias con esta fase
- **Selección de especie aleatoria o automática** — se descartó explícitamente a favor de la negociación conjunta entre amigos (Parte A)
