// Íconos de las categorías de actividades (los valores de `categoria` del backend).
// El color de cada categoría lo define cada tema (theme.colors.categories).

export const CATEGORY_ICONS = {
  social: '👥',
  físico: '🏃',
  creativo: '🎨',
  relajación: '🌊',
  reflexión: '📝',
  entretenimiento: '🎬',
  productividad: '⚡',
  mindfulness: '🧘',
};

export const DEFAULT_CATEGORY_ICON = '✨';

// Versión vectorial para tarjetas del Hub. Mantiene una sola familia visual
// junto al widget de respiración y evita mezclar emojis de plataforma con
// Ionicons dentro de una misma jerarquía.
export const CATEGORY_IONICONS = {
  social: 'people-outline',
  físico: 'walk-outline',
  creativo: 'color-palette-outline',
  relajación: 'water-outline',
  reflexión: 'create-outline',
  entretenimiento: 'film-outline',
  productividad: 'flash-outline',
  mindfulness: 'leaf-outline',
};

export const DEFAULT_CATEGORY_IONICON = 'sparkles-outline';
