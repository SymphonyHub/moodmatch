# FASE 16 — Navegación tipo Instagram (Perfil/Ajustes) + Eliminar mascota

**Proyecto:** moodmatch
**Estado previo:** Fase 14 cerrada y validada en dispositivo. Esta fase parte de ese feedback de la prueba visual. Sin dependencias con Fase 15 (chat + Cloudinary) — pueden trabajarse en cualquier orden.

---

## Índice

1. [Contexto y objetivo](#1-contexto-y-objetivo)
2. [Parte 1 — Perfil como apartado propio, Ajustes colgando de él](#2-parte-1--perfil-como-apartado-propio-ajustes-colgando-de-él)
3. [Parte 2 — Eliminar mascota](#3-parte-2--eliminar-mascota)
4. [Reparto de trabajo](#4-reparto-de-trabajo)
5. [Checklist de QA antes de mergear](#5-checklist-de-qa-antes-de-mergear)
6. [Fuera de alcance — candidatos a fase futura](#6-fuera-de-alcance--candidatos-a-fase-futura)

---

## 1. Contexto y objetivo

Tras probar Fase 14 en dispositivo, surgieron dos pendientes concretos y acotados:

1. La relación entre Perfil y Ajustes está invertida respecto a apps de referencia como Instagram: hoy Ajustes es una tab principal y el Perfil es un link escondido adentro. La idea es que sea al revés — Perfil con su propio apartado en la navegación principal, y Ajustes accesible desde ahí (como el ícono de menú/engranaje en el perfil de Instagram), no compitiendo por espacio en la barra inferior.
2. Falta la posibilidad de eliminar/archivar una mascota compartida si los usuarios ya no la quieren — hoy no existe ningún punto de entrada para eso.

Alcance chico y bien acotado — no requiere el mismo despliegue de 4 agentes en paralelo que usó Fase 14.

---

## 2. Parte 1 — Perfil como apartado propio, Ajustes colgando de él

### Estado actual

- Barra inferior con 6 tabs: Inicio, Actividades, Mascota, Amigos, Mi QR, Ajustes
- Perfil vive en `app/perfil.jsx`, alcanzable hoy por dos caminos: tocar el avatar en Inicio, o "Ver mi perfil" dentro de Ajustes → Cuenta
- Ajustes (tab) contiene: tema actual, accesibilidad, notificaciones, Cuenta (ver perfil + cerrar sesión)

### Cambio propuesto

- **Reemplazar la tab "Ajustes" por "Perfil"** en la barra inferior (mismo lugar, ícono de persona/avatar en vez de engranaje)
- Agregar un **ícono de engranaje** en la esquina superior de la pantalla de Perfil que navega (como push, no como tab) hacia Ajustes — Ajustes deja de vivir en la barra inferior y pasa a ser una pantalla alcanzable únicamente desde ahí
- El atajo de tocar el avatar en Inicio se mantiene igual — sigue siendo válido como acceso rápido, redundante con la tab (mismo patrón que Instagram, donde también se puede llegar al perfil propio desde más de un lugar)
- **Ningún contenido de Ajustes cambia** — mismos bloques (tema, accesibilidad, notificaciones, cerrar sesión), solo cambia el camino para llegar

### Archivos a tocar (referencia, confirmar contra el estado real del repo)

- Definición de tabs / layout raíz de navegación (dueño histórico según `COORDINACION.md` vigente — confirmar antes de tocar)
- `app/perfil.jsx` — agregar el ícono/botón de acceso a Ajustes
- `app/ajustes.jsx` — deja de estar registrada como tab, pasa a pantalla accesible por navegación push
- Revisar cualquier deep-link o notificación que apunte a Ajustes asumiendo que es una tab

---

## 3. Parte 2 — Eliminar mascota

### Decisión de diseño

**Cualquiera de los dos amigos puede archivar la mascota compartida, sin necesitar aprobación del otro.** A diferencia de elegir la especie al inicio (que sí fue una decisión conjunta, negociada), terminar algo no debería requerir el permiso de la otra persona — forzar esa negociación podría atrapar a alguien en un vínculo que ya no quiere si el otro no acepta soltarlo. Coherente con el principio de no presión de toda la app.

- Reutiliza la lógica ya existente desde Fase 14: `activa: false` en `MascotaAmistad`, conserva `historialHitos` (no se borra nada, se archiva)
- Nuevo: notificación suave al otro amigo cuando esto ocurre (tono ejemplo: "Tu amistad puso en pausa a Lumi"), sin culpa ni presión — coherente con el resto de notificaciones sociales de mascota
- Punto de entrada en la UI: dentro de "Configuración" en la pantalla de detalle de la mascota, junto a donde ya vive el cambio de nombre
- Confirmación con un diálogo simple antes de ejecutar (acción con consecuencia visible aunque técnicamente reversible a nivel de datos)

### Backend

- Nuevo endpoint: `POST /api/mascota/:amistadId/archivar` — exige que quien llama sea parte de la amistad, marca `activa: false`
- Nueva notificación (puede reutilizar el patrón de `mascota_social` ya existente) para avisar al otro amigo
- La mascota archivada deja de aparecer en la lista principal — el filtro por `activa: true` ya existe desde Fase 14, no requiere cambios ahí

### Frontend

- Botón/acción "Eliminar mascota" (o "Poner en pausa", a definir el texto exacto con tono no punitivo) dentro de la sección de Configuración del detalle
- Diálogo de confirmación antes de llamar al endpoint
- Manejo del estado tras archivar: volver a la lista principal, ya no mostrar el detalle de una mascota archivada

---

## 4. Reparto de trabajo

Alcance chico — recomendado con uno o dos agentes, no cuatro en paralelo:

- **Agente para Parte 1 (navegación):** toca el layout raíz, `perfil.jsx`, `ajustes.jsx` — un solo dueño para evitar pisarse con el archivo de navegación compartido
- **Agente para Parte 2 (eliminar mascota):** puede ser el mismo agente en secuencia, o uno distinto en paralelo si no comparten archivos (a confirmar — Parte 2 no debería tocar la navegación raíz)

---

## 5. Checklist de QA antes de mergear

- [ ] `npm test` verde en backend y app
- [ ] Barra inferior muestra Perfil en el lugar de Ajustes, con el ícono correcto
- [ ] Desde Perfil, el ícono de engranaje abre Ajustes correctamente (push, no tab)
- [ ] Ajustes conserva todo su contenido anterior sin regresiones
- [ ] El atajo del avatar en Inicio sigue funcionando
- [ ] Cualquiera de los dos amigos puede archivar la mascota desde Configuración, con confirmación previa
- [ ] La mascota archivada desaparece de la lista principal pero conserva su historial de hitos
- [ ] El otro amigo recibe la notificación suave, con tono no punitivo
- [ ] Ningún deep-link o notificación existente quedó apuntando a una ruta de Ajustes que ya no es tab

---

## 6. Fuera de alcance — candidatos a fase futura

- **Optimizar las skins/accesorios disponibles** — mencionado por el usuario, sin alcance definido todavía
- **Rework completo del apartado de mascota al estilo Pou** (mini-juego más profundo, interacciones más ricas) — visión a futuro explícita del usuario, no forma parte de esta fase; cuando se quiera abordar, se arma como su propio documento de fase con el mismo formato
