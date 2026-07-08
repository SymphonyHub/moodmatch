// Los 6 estados de ánimo de MoodMatch. Emoji y etiqueta son contenido compartido
// entre pantallas; el color de cada ánimo lo define cada tema (theme.colors.moods).

export const MOODS = [
  { value: 'FELIZ', label: 'Feliz', emoji: '😊' },
  { value: 'TRISTE', label: 'Triste', emoji: '😢' },
  { value: 'ANSIOSO', label: 'Ansioso', emoji: '😰' },
  { value: 'CALMADO', label: 'Calmado', emoji: '😌' },
  { value: 'ENOJADO', label: 'Enojado', emoji: '😠' },
  { value: 'NEUTRO', label: 'Neutro', emoji: '😐' },
];

export const MOOD_INFO = Object.fromEntries(MOODS.map((m) => [m.value, m]));
