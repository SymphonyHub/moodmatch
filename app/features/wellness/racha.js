// Dominio puro de la racha de días registrando ánimo. Sin imports de React
// Native (mismo criterio que historial.js / paraMi.js).
//
// "Racha" = días calendario consecutivos con al menos un registro de ánimo,
// contados hacia atrás desde hoy. Si hoy todavía no hay registro pero ayer sí,
// la racha sigue viva: el día no terminó y no se castiga a quien aún no abrió
// la app hoy. Reglas de tono verificadas en racha.test.js: refuerzo amable,
// nunca presión ("no rompas la racha" está prohibido).

const DIA_MS = 24 * 60 * 60 * 1000;

// Clave de día local, misma semántica que historial.js: agrupa por día del
// calendario del dispositivo, no por UTC.
function claveDiaLocal(fecha) {
  return `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
}

// Días consecutivos con registro contando desde hoy. Acepta las mismas entries
// que devuelve apiGetMoodHistory ({ entries: [{ createdAt, ... }] }), en
// cualquier orden; varios registros el mismo día cuentan como un solo día.
export function rachaDeDias(entries, ahora = Date.now()) {
  const dias = new Set();
  for (const entry of entries ?? []) {
    const fecha = new Date(entry.createdAt);
    if (Number.isNaN(fecha.getTime())) continue;
    dias.add(claveDiaLocal(fecha));
  }
  if (dias.size === 0) return 0;

  // El ancla es hoy si hoy tiene registro; si no, ayer (la racha sigue viva
  // hasta que el día termine). Si ninguno de los dos tiene, no hay racha activa.
  const cursor = new Date(ahora);
  if (!dias.has(claveDiaLocal(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!dias.has(claveDiaLocal(cursor))) return 0;
  }

  // setDate maneja bordes de mes/año y es estable ante horario de verano
  // (opera sobre el día del calendario, no sobre milisegundos acumulados).
  let racha = 0;
  while (dias.has(claveDiaLocal(cursor))) {
    racha += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return racha;
}

// Mensaje breve y sin presión que acompaña al número de la racha. No repite el
// número (la tarjeta ya lo muestra) y nunca amenaza con perderla.
export function textoRacha(racha) {
  if (racha <= 0) return 'Registra cómo estás cuando quieras, a tu ritmo.';
  if (racha === 1) return 'Hoy te tomaste un momento para ti.';
  return 'Vienes tomándote un momento para ti estos días.';
}

// Etiqueta singular/plural para el número (día / días).
export function etiquetaDias(racha) {
  return racha === 1 ? 'día' : 'días';
}
