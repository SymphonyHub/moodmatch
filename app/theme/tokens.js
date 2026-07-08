// Contrato de forma de los temas: todo tema debe definir TODAS estas claves.
// Los tests de app/__tests__/themes.test.js verifican la completitud de cada tema.

export const MOOD_KEYS = ['FELIZ', 'TRISTE', 'ANSIOSO', 'CALMADO', 'ENOJADO', 'NEUTRO'];

// Deben coincidir con los valores de `categoria` del seed del backend.
export const CATEGORY_KEYS = [
  'social',
  'físico',
  'creativo',
  'relajación',
  'reflexión',
  'entretenimiento',
  'productividad',
  'mindfulness',
];

export const REQUIRED_COLOR_KEYS = [
  'background',
  'surface',
  'surfaceElevated',
  'text',
  'textMuted',
  'textFaint',
  'primary',
  'onPrimary',
  'primarySoft',
  'border',
  'danger',
  'dangerSoft',
  'overlay',
  'headerBackground',
  'onHeader',
  'tabBarBackground',
  'tabBarBorder',
  'tabActive',
  'tabInactive',
];

export const REQUIRED_SHAPE_KEYS = [
  'radiusSm',
  'radiusMd',
  'radiusLg',
  'radiusXl',
  'borderThin',
  'borderMedium',
  'borderThick',
];

export const REQUIRED_FONT_ROLES = ['regular', 'medium', 'semibold', 'bold'];

export const REQUIRED_SHADOW_KEYS = ['card', 'cardStrong', 'modal'];
