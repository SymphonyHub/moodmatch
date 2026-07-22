// Catálogo de especies para el carrusel de propuesta del flujo de invitación.
//
// Este módulo NO es la fuente canónica: esa la posee Agente C (Parte B) con las
// siluetas SVG por etapa. El carrusel solo necesita id + nombre + un ícono chico.
//
// Los ids son los canónicos confirmados por C (kebab, sin acentos); los emojis
// siguen siendo placeholders hasta que lleguen las siluetas SVG por etapa.
//   Cuando el módulo de especies del frontend de C llegue a esta rama,
//   reexportar la lista desde ahí (derivando id/nombre + un ícono) en vez de
//   mantener esta copia, para no tener dos catálogos que se desincronicen. La
//   UI que consume ESPECIES/emojiEspecie/nombreEspecie no cambia.
export const ESPECIES = [
  { id: 'polluelo', nombre: 'Polluelo', emoji: '🐤' },
  { id: 'nutria-lunar', nombre: 'Nutria lunar', emoji: '🦦' },
  { id: 'espiritu-calma', nombre: 'Espíritu de calma', emoji: '🌙' },
  { id: 'pinguino', nombre: 'Pingüino', emoji: '🐧' },
  { id: 'perro', nombre: 'Perro', emoji: '🐶' },
  { id: 'dinosaurio', nombre: 'Dinosaurio', emoji: '🦕' },
  { id: 'huevo', nombre: 'Huevo', emoji: '🥚' },
];

export const especiePorId = (id) => ESPECIES.find((e) => e.id === id) ?? null;

export const nombreEspecie = (id) => especiePorId(id)?.nombre ?? 'Mascota';

export const emojiEspecie = (id) => especiePorId(id)?.emoji ?? '🐾';
