// Markdown simple para respuestas del bot (Gemini o plantillas): **negrita**,
// *énfasis* y viñetas ("- " / "* " al inicio de línea). Nada más.
// Regla de oro: ante markdown malformado se degrada a texto literal — nunca
// se pierde ni se oculta contenido que escribió el modelo.

const INLINE_RE = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
const VINETA_RE = /^\s*[-*]\s+/;

// ¿El interior de un par de asteriscos es énfasis real? Los asteriscos de
// aritmética o listas mal pegadas ("5 * 3 *") llevan espacios en los bordes
// y se dejan literales, como hace CommonMark.
const esInteriorValido = (interior) => interior !== '' && interior.trim() === interior;

// parsearInline(texto) → [{ estilo: 'normal'|'negrita'|'enfasis', texto }]
export function parsearInline(texto) {
  const spans = [];
  const agregar = (estilo, t) => {
    if (t === '') return;
    const previo = spans[spans.length - 1];
    if (previo && previo.estilo === estilo) previo.texto += t;
    else spans.push({ estilo, texto: t });
  };

  for (const parte of texto.split(INLINE_RE)) {
    if (parte === undefined || parte === '') continue;
    if (/^\*\*[^*]+\*\*$/.test(parte)) {
      const interior = parte.slice(2, -2);
      if (esInteriorValido(interior)) agregar('negrita', interior);
      else agregar('normal', parte);
    } else if (/^\*[^*]+\*$/.test(parte)) {
      const interior = parte.slice(1, -1);
      if (esInteriorValido(interior)) agregar('enfasis', interior);
      else agregar('normal', parte);
    } else {
      agregar('normal', parte);
    }
  }
  return spans;
}

// parsearMarkdown(texto) → [{ tipo: 'parrafo'|'item', spans }]
// Una línea = un bloque; las líneas vacías solo separan.
export function parsearMarkdown(texto) {
  if (typeof texto !== 'string') return [];
  const bloques = [];
  for (const linea of texto.split('\n')) {
    if (linea.trim() === '') continue;
    const esItem = VINETA_RE.test(linea);
    const contenido = esItem ? linea.replace(VINETA_RE, '') : linea.trim();
    bloques.push({ tipo: esItem ? 'item' : 'parrafo', spans: parsearInline(contenido) });
  }
  return bloques;
}
