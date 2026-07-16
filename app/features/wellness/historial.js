// Dominio puro de la vista de historial de ánimos. Sin imports de React
// Native (mismo criterio que paraMi.js).
//
// El mensaje de resumen se calcula LOCALMENTE por conteo de frecuencias de
// los registros existentes — sin IA ni APIs de análisis (FASE6 PARTE C).
// Reglas de tono de siempre, verificadas mecánicamente en historial.test.js:
// no diagnosticar, no minimizar, cero positividad forzada en rachas
// difíciles; validar primero, sugerir después y sin presión.

import { MOOD_KEYS } from '../../theme/tokens';

// Ruta de la pantalla de historial (stack por convención de archivos).
export const RUTA_HISTORIAL = '/historial';

export const DIAS_VENTANA = 7;
export const MIN_REGISTROS = 3;
export const UMBRAL = 0.6;
export const MOODS_POSITIVOS = ['FELIZ', 'CALMADO'];
export const MOODS_DIFICILES = ['TRISTE', 'ANSIOSO', 'ENOJADO'];

const DIA_MS = 24 * 60 * 60 * 1000;

// Analiza los registros dentro de la ventana y clasifica el patrón:
// 'insuficiente' (menos de MIN_REGISTROS), 'positivo'/'dificil' (el grupo
// alcanza el UMBRAL del total) o 'mixto'. NEUTRO no suma a ningún grupo
// pero sí al total: una semana mayormente neutra es mixta, no positiva.
export function analizarPatron(entries, ahora = Date.now()) {
  const corte = ahora - DIAS_VENTANA * DIA_MS;
  const conteos = Object.fromEntries(MOOD_KEYS.map((m) => [m, 0]));

  let total = 0;
  for (const entry of entries ?? []) {
    const t = new Date(entry.createdAt).getTime();
    if (Number.isNaN(t) || t < corte) continue;
    if (!(entry.moodType in conteos)) continue;
    conteos[entry.moodType] += 1;
    total += 1;
  }

  const suma = (grupo) => grupo.reduce((acc, m) => acc + conteos[m], 0);

  let tipo = 'mixto';
  if (total < MIN_REGISTROS) tipo = 'insuficiente';
  else if (suma(MOODS_POSITIVOS) / total >= UMBRAL) tipo = 'positivo';
  else if (suma(MOODS_DIFICILES) / total >= UMBRAL) tipo = 'dificil';

  return { tipo, conteos, total };
}

export const MENSAJES_PATRON = {
  positivo: [
    'Buena racha estos días: la mayoría de tus registros han sido de calma o alegría. Vale la pena notarlo.',
    'Tus últimos días se ven más ligeros en el registro. Está bien tomarse un momento para reconocerlo.',
    'Varios días buenos seguidos según tu historial. Que duren lo que tengan que durar.',
  ],
  dificil: [
    'Estos días se han sentido cuesta arriba, y registrarlo también es una forma de cuidarte. Si te hace sentido, tu espacio Para mí tiene ideas pequeñas, sin apuro.',
    'Tu historial muestra varios días difíciles. No tienen que verse distintos de como se sienten. Cuando quieras, en Para mí hay algo pequeño esperándote.',
    'Ha sido una racha pesada, y está bien nombrarla tal como es. Tu espacio Para mí sigue ahí, por si algún día quieres usarlo.',
  ],
  mixto: [
    'Tus últimos días han tenido de todo un poco. Así también se ven las semanas reales.',
    'Esta semana mezcló momentos distintos. Tu registro los guarda tal como fueron.',
    'Altos y bajos conviven en tus registros recientes. Tenerlos anotados ayuda a mirarlos con perspectiva.',
  ],
  insuficiente: [
    'Aún hay pocos registros esta semana. Con algunos más, acá va a aparecer un resumen de cómo han sido tus días.',
    'Tu resumen se arma con lo que registras. Cuando haya unos cuantos de esta semana, lo vas a ver acá.',
    'Todavía no hay suficientes registros recientes para un resumen. Registra cuando quieras, a tu ritmo.',
  ],
};

// Variante determinista por total de registros: estable entre re-renders
// (un resumen que cambia en cada visita se siente aleatorio, no observado)
// y rota naturalmente a medida que se agregan registros.
export function mensajeResumen(analisis) {
  const variantes = MENSAJES_PATRON[analisis.tipo];
  return variantes[analisis.total % variantes.length];
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function claveDiaLocal(fecha) {
  return `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
}

function etiquetaDia(fecha, ahora) {
  const hoy = new Date(ahora);
  if (claveDiaLocal(fecha) === claveDiaLocal(hoy)) return 'Hoy';
  const ayer = new Date(ahora - DIA_MS);
  if (claveDiaLocal(fecha) === claveDiaLocal(ayer)) return 'Ayer';
  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

// Agrupa entries (ya ordenadas desc) en secciones por día local, listas
// para SectionList: [{ titulo: 'Hoy'|'Ayer'|'14 de julio', data: [...] }].
export function agruparPorDia(entries, ahora = Date.now()) {
  const secciones = [];
  let claveActual = null;

  for (const entry of entries ?? []) {
    const fecha = new Date(entry.createdAt);
    if (Number.isNaN(fecha.getTime())) continue;
    const clave = claveDiaLocal(fecha);
    if (clave !== claveActual) {
      secciones.push({ titulo: etiquetaDia(fecha, ahora), data: [] });
      claveActual = clave;
    }
    secciones[secciones.length - 1].data.push(entry);
  }

  return secciones;
}

export function horaCorta(iso) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const hh = String(fecha.getHours()).padStart(2, '0');
  const mm = String(fecha.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
