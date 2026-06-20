# Mejoras a la pantalla de emociones (Home)

Problema actual: al seleccionar un estado de ánimo, se muestra solo
texto plano con 1 sugerencia. Para ver otra opción, el usuario tiene
que volver a enviar el mood completo, lo que crea un registro nuevo
en la base cada vez solo para "probar suerte" con otra sugerencia.
Se siente seco y poco reactivo.

## 1. Separar "registrar ánimo" de "pedir otra idea"

- Mantén POST /api/mood-entries para el registro real del ánimo
  (se llama UNA vez cuando el usuario elige su estado).
- Agrega un endpoint nuevo, liviano y sin escritura en la base:
  GET /api/activities/random?mood=FELIZ (o el estado que sea) que
  devuelve una actividad aleatoria de esa categoría de ánimo, sin
  crear ningún registro.

## 2. Botón "Quiero otra idea"

En la pantalla Home, después de mostrar la primera sugerencia,
agrega un botón "Quiero otra idea" que llama al endpoint liviano
de arriba y reemplaza solo la tarjeta de la sugerencia (no vuelve a
pedir el estado de ánimo, no recarga la pantalla completa).

## 3. Hazlo sentir más vivo

- Agrega un emoji a cada botón de estado de ánimo
  (FELIZ, TRISTE, ANSIOSO, CALMADO, ENOJADO, NEUTRO)
- Cuando cambie la sugerencia (al tocar "Quiero otra idea" o al
  mostrarse la primera vez), anímala con un fade simple usando la
  Animated API de React Native — no agregues librerías nuevas para
  esto, ya viene incluida.
- Dale a la tarjeta de sugerencia un poco de color o un ícono según
  la categoría de la actividad (físico, social, mindfulness, etc.)

## 4. Más variedad en el seed

Sube el catálogo de actividades de 3 a 5-6 por cada estado de ánimo,
para que no se repita tan rápido al usar "Quiero otra idea" varias
veces seguidas.

## 5. Detalles que evitan frustración

- Que el endpoint /api/activities/random no devuelva la misma
  actividad que se acaba de mostrar (pásale el id de la actividad
  actual y exclúyelo de la selección). Si no, el usuario toca
  "Quiero otra idea" y a veces le sale lo mismo, lo cual es peor
  que no tener el botón.
- Mientras espera la respuesta del servidor, muestra un loading
  breve en la tarjeta (un spinner o el texto "Buscando..."), para
  que no se sienta trabado si la red tarda un poco.

Mantén todo dentro del alcance ya definido en CLAUDE.md — esto es
pulido de UX, no funcionalidades nuevas.
