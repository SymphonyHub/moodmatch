// Lógica pura de la barra de tabs, separada del componente para poder
// testearla sin render (app/__tests__/tabbar.test.js).

// Nombre del ícono Ionicons según variante del tema y foco: los temas
// "outline" rellenan solo la tab activa; los "filled" (Fiesta) usan íconos
// rellenos siempre.
export function resolveTabIcon(icons, variant, focused) {
  return variant === 'filled' || focused ? icons.filled : icons.outline;
}

// Geometría de la píldora indicadora: tabs de ancho igual, píldora centrada
// dentro del tab activo. Si el tab es más angosto que la píldora, la píldora
// se ajusta al ancho del tab.
export function indicatorLayout(containerWidth, tabCount, index, { pillWidth = 64 } = {}) {
  if (containerWidth <= 0 || tabCount <= 0) return { x: 0, width: 0 };
  const tabWidth = containerWidth / tabCount;
  const width = Math.min(pillWidth, tabWidth);
  const x = tabWidth * index + (tabWidth - width) / 2;
  return { x, width };
}
