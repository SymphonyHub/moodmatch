// Lógica pura y textos de las interacciones sociales de la mascota (Fase 14):
// racha compartida "blanda" y regalos entre amigos. Separada del componente
// para testear la copia y los estados sin montar React
// (app/__tests__/interaccionesSociales.test.js).
//
// Tono del proyecto: se celebra la constancia conjunta, nunca se culpabiliza ni
// se mete presión. La copia se valida mecánicamente contra las listas negras de
// tono en el mismo test.

// Mensaje de la racha compartida. `racha` = { dias, viva, cuidadaHoy } tal como
// lo entrega el backend (calculado al vuelo). Ausente o no viva = en pausa, sin
// reproche.
export function mensajeRacha(racha) {
  if (!racha || !racha.viva) {
    return 'La racha está en pausa. Pueden retomarla cuando quieran, sin apuro.';
  }
  const dias = Math.max(1, Number(racha.dias) || 1);
  const base = dias >= 2
    ? `Llevan ${dias} días seguidos acompañándola.`
    : 'Arrancaron una racha de cuidados juntos.';
  return racha.cuidadaHoy
    ? `${base} Hoy ya pasaron a cuidarla.`
    : `${base} Un cuidado de cualquiera de los dos la mantiene viva.`;
}

// Etiqueta corta para el encabezado de la racha.
export function tituloRacha(racha) {
  if (!racha || !racha.viva) return 'Racha compartida';
  const dias = Math.max(1, Number(racha.dias) || 1);
  return `Racha compartida · ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

// Estado del botón de regalo a partir de `regalo` = { puedeRegalar, disponibleEn }.
// Devuelve null si el backend no envió el dato (no se inventa un estado).
export function estadoRegalo(regalo) {
  if (!regalo) return null;
  if (regalo.puedeRegalar) {
    return {
      habilitado: true,
      etiqueta: 'Enviar un regalo de cariño',
      detalle: 'Un empujón para su mascota. Uno por semana entre los dos.',
    };
  }
  return {
    habilitado: false,
    etiqueta: 'Regalo enviado esta semana',
    detalle: regalo.disponibleEn
      ? `Podrán enviar otro a partir del ${formatFecha(regalo.disponibleEn)}.`
      : 'Podrán enviar otro la próxima semana.',
  };
}

function formatFecha(iso) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return 'la próxima semana';
  return fecha.toLocaleDateString();
}
