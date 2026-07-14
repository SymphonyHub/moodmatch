// Tema "Personalizado": el usuario elige primario, acento, fondo y fuente de
// cuerpo; de esos 4 valores se deriva un tema completo que cumple el contrato
// de tokens.js. No entra al registro estático de themes/index.js — lo construye
// el ThemeProvider en runtime. Importa solo ./contrast y temas concretos para
// no crear ciclos con themes/index.
import { contrastRatio, relativeLuminance, hexToRgb } from './contrast';
import sereno from './themes/sereno';
import nocturno from './themes/nocturno';

export const CUSTOM_THEME_ID = 'personalizado';

export const AA_MIN = 4.5;

// Debe coincidir con isValidCustomTheme del backend (backend/routes/users.js).
const HEX_RE = /^#[0-9a-f]{6}$/i;
const CONFIG_KEYS = ['primary', 'accent', 'background', 'bodyFont'];

export const BODY_FONT_IDS = ['manrope', 'nunito', 'baloo2'];

export const BODY_FONTS = {
  manrope: {
    label: 'Manrope',
    fonts: {
      regular: { fontFamily: 'Manrope_400Regular' },
      medium: { fontFamily: 'Manrope_500Medium' },
      semibold: { fontFamily: 'Manrope_600SemiBold' },
      bold: { fontFamily: 'Manrope_700Bold' },
    },
    bodyFamily: 'Manrope_500Medium',
    captionFamily: 'Manrope_400Regular',
  },
  nunito: {
    label: 'Nunito',
    fonts: {
      regular: { fontFamily: 'Nunito_400Regular' },
      medium: { fontFamily: 'Nunito_500Medium' },
      semibold: { fontFamily: 'Nunito_600SemiBold' },
      bold: { fontFamily: 'Nunito_700Bold' },
    },
    bodyFamily: 'Nunito_500Medium',
    captionFamily: 'Nunito_400Regular',
  },
  baloo2: {
    label: 'Baloo 2',
    fonts: {
      regular: { fontFamily: 'Baloo2_400Regular' },
      medium: { fontFamily: 'Baloo2_500Medium' },
      semibold: { fontFamily: 'Baloo2_600SemiBold' },
      bold: { fontFamily: 'Baloo2_700Bold' },
    },
    bodyFamily: 'Baloo2_500Medium',
    captionFamily: 'Baloo2_400Regular',
  },
};

// Swatches curados por rol. Los fondos oscuros tienen luminancia <= nocturno
// para que los moods/categories heredados conserven AA sobre las superficies
// derivadas. Los primarios/acentos vienen en dos mitades: tonos profundos que
// funcionan sobre fondos claros y tonos claros que funcionan sobre oscuros
// (la mezcla cruzada la señala el aviso de contraste, sin bloquear).
export const SWATCHES = {
  background: [
    '#f5f6fa', '#faf7f2', '#f3f7f4', '#f7f3f8', '#fdf6ee', '#ffffff',
    '#12141c', '#171422', '#101c17', '#1d1512', '#0e1720', '#171717',
  ],
  primary: [
    '#4a5fc1', '#00695c', '#7d3f9e', '#b34c30', '#ad2f5e', '#b84800',
    '#93a3f0', '#6fd0c2', '#c9a2ec', '#f0a36a', '#f08a8a', '#a3cf6f',
  ],
  accent: [
    '#b84800', '#8a6000', '#00707b', '#3d6bb5', '#c2185b', '#6d4c41',
    '#f0977a', '#e2b25c', '#66c7d4', '#c49ae0', '#f291b5', '#a9b2c4',
  ],
};

export const DEFAULT_CUSTOM_CONFIG = {
  primary: '#4a5fc1',
  accent: '#b34c30',
  background: '#f5f6fa',
  bodyFont: 'manrope',
};

export function isValidCustomConfig(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== CONFIG_KEYS.length) return false;
  if (!CONFIG_KEYS.every((k) => keys.includes(k))) return false;
  return (
    HEX_RE.test(value.primary) &&
    HEX_RE.test(value.accent) &&
    HEX_RE.test(value.background) &&
    BODY_FONT_IDS.includes(value.bodyFont)
  );
}

const clamp255 = (n) => Math.max(0, Math.min(255, Math.round(n)));

const toHex = ({ r, g, b }) =>
  `#${[r, g, b].map((ch) => clamp255(ch).toString(16).padStart(2, '0')).join('')}`;

// Interpolación lineal por canal: weight 0 → hexA puro, weight 1 → hexB puro.
export function mix(hexA, hexB, weight) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return toHex({
    r: a.r + (b.r - a.r) * weight,
    g: a.g + (b.g - a.g) * weight,
    b: a.b + (b.b - a.b) * weight,
  });
}

const lighten = (hex, amount) => mix(hex, '#ffffff', amount);

// Tinta mezclada con el fondo, empezando en startWeight (peso del fondo) y
// acercándose a la tinta pura en pasos de 0.05 hasta cumplir AA contra todas
// las superficies. Si ni la tinta pura cumple, la devuelve (el aviso de
// contraste lo reporta; nunca bloqueamos).
function deriveReadable(ink, background, surfaces, startWeight) {
  let weight = startWeight;
  while (weight > 0) {
    const candidate = mix(ink, background, weight);
    if (surfaces.every((s) => contrastRatio(candidate, s) >= AA_MIN)) return candidate;
    weight -= 0.05;
  }
  return ink;
}

// Fondo suave de un color de énfasis: mezcla hacia el fondo, alejándose de él
// hasta que el color cumpla AA sobre su propio suave (o hasta el tope).
function deriveSoft(color, background, startWeight) {
  let weight = startWeight;
  while (weight < 0.98 && contrastRatio(color, mix(color, background, weight)) < AA_MIN) {
    weight += 0.02;
  }
  return mix(color, background, weight);
}

const bestOn = (base, optionA, optionB) =>
  contrastRatio(optionA, base) >= contrastRatio(optionB, base) ? optionA : optionB;

export function makeCustomTheme({ primary, accent, background, bodyFont }) {
  const isDark = relativeLuminance(background) < 0.35;
  const base = isDark ? nocturno : sereno;
  const font = BODY_FONTS[bodyFont] ?? BODY_FONTS.manrope;

  const surface = isDark ? lighten(background, 0.05) : '#ffffff';
  const surfaceElevated = isDark ? lighten(background, 0.1) : '#ffffff';
  const surfaces = [background, surface, surfaceElevated];

  // La tinta se elige por contraste real, no por isDark: cubre fondos ambiguos.
  const text = bestOn(background, isDark ? '#e9ebf2' : '#232a3d', isDark ? '#232a3d' : '#e9ebf2');
  const textMuted = deriveReadable(text, background, surfaces, 0.35);
  const textFaint = deriveReadable(text, background, surfaces, 0.28);

  const danger = isDark ? '#ef8080' : '#c62828';

  return {
    id: CUSTOM_THEME_ID,
    name: 'Personalizado',
    tagline: 'Tus colores y tu fuente',
    isDark,
    statusBar: {
      onBackground: isDark ? 'light' : 'dark',
      onHeader: isDark ? 'light' : 'dark',
    },
    icons: { variant: 'outline' },
    colors: {
      background,
      surface,
      surfaceElevated,
      text,
      textMuted,
      textFaint,
      primary,
      onPrimary: bestOn(primary, '#ffffff', '#14161f'),
      primarySoft: deriveSoft(primary, background, isDark ? 0.84 : 0.88),
      primarySoftBorder: mix(primary, background, 0.64),
      primaryDisabled: mix(primary, background, 0.55),
      accent,
      accentSoft: deriveSoft(accent, background, isDark ? 0.84 : 0.88),
      border: mix(text, background, isDark ? 0.82 : 0.88),
      danger,
      dangerSoft: deriveSoft(danger, background, 0.88),
      overlay: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(20, 24, 38, 0.55)',
      headerBackground: background,
      onHeader: text,
      tabBarBackground: surface,
      tabBarBorder: mix(text, background, isDark ? 0.82 : 0.88),
      tabActive: primary,
      tabInactive: textMuted,
      // Heredados del tema base según claridad: paletas ya afinadas para AA.
      moods: base.colors.moods,
      categories: base.colors.categories,
    },
    typography: {
      scale: 1,
      fonts: font.fonts,
      type: {
        // Sora fija en jerarquía alta: contrato de marca (forzado por tests).
        display: { fontFamily: 'Sora_700Bold', fontSize: 28, lineHeight: 34 },
        title: { fontFamily: 'Sora_700Bold', fontSize: 20, lineHeight: 26 },
        section: { fontFamily: 'Sora_600SemiBold', fontSize: 16, lineHeight: 22 },
        body: { fontFamily: font.bodyFamily, fontSize: 15, lineHeight: 23 },
        caption: { fontFamily: font.captionFamily, fontSize: 12, lineHeight: 17 },
      },
    },
    shape: {
      radiusSm: 8,
      radiusMd: 11,
      radiusLg: 14,
      radiusXl: 20,
      borderThin: 1,
      borderMedium: 1.5,
      borderThick: 2,
    },
    shadows: isDark
      ? { card: {}, cardStrong: {}, modal: {} }
      : {
          card: {
            shadowColor: text,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
          },
          cardStrong: {
            shadowColor: text,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 3,
          },
          modal: {
            shadowColor: text,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.16,
            shadowRadius: 12,
            elevation: 8,
          },
        },
    // Mismo helper que agrega withHelpers en themes/index.js: este tema no
    // pasa por el registro estático, así que lo trae consigo.
    fontSize: (size) => Math.round(size * 1),
  };
}

const SURFACE_LABELS = {
  background: 'el fondo',
  surface: 'las tarjetas',
  surfaceElevated: 'las tarjetas elevadas',
};

// Los mismos pares que verifica __tests__/contrast.test.js sobre los temas
// base, con etiquetas legibles para el aviso de Ajustes. Devuelve solo los
// pares que NO alcanzan AA (lista vacía = combinación recomendable).
export function evaluateCustomTheme(theme) {
  const c = theme.colors;

  const pares = [
    ...Object.entries(SURFACE_LABELS).flatMap(([key, label]) => [
      [`Texto sobre ${label}`, c.text, c[key]],
      [`Texto secundario sobre ${label}`, c.textMuted, c[key]],
      [`Texto tenue sobre ${label}`, c.textFaint, c[key]],
      [`Alertas sobre ${label}`, c.danger, c[key]],
    ]),
    ['Color primario sobre las tarjetas', c.primary, c.surface],
    ['Color primario sobre su fondo suave', c.primary, c.primarySoft],
    ['Texto de los botones primarios', c.onPrimary, c.primary],
    ['Acento sobre las tarjetas', c.accent, c.surface],
    ['Acento sobre su fondo suave', c.accent, c.accentSoft],
    ['Texto del encabezado', c.onHeader, c.headerBackground],
    ['Alertas sobre su fondo suave', c.danger, c.dangerSoft],
    ['Pestaña activa en la barra', c.tabActive, c.tabBarBackground],
    ['Pestaña inactiva en la barra', c.tabInactive, c.tabBarBackground],
    ...Object.entries(c.moods).flatMap(([mood, def]) => [
      [`Ánimo ${mood} sobre las tarjetas`, def.color, c.surface],
      [`Ánimo ${mood} sobre su fondo suave`, def.color, def.soft],
    ]),
    ...Object.entries(c.categories).map(([cat, color]) => [
      `Categoría ${cat} sobre las tarjetas`,
      color,
      c.surface,
    ]),
  ];

  return pares
    .map(([pair, fg, bg]) => ({ pair, ratio: contrastRatio(fg, bg) }))
    .filter(({ ratio }) => ratio < AA_MIN)
    .map(({ pair, ratio }) => ({ pair, ratio: Math.round(ratio * 100) / 100 }));
}
