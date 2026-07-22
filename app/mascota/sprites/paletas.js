// Paleta de marca de la criatura, por etapa evolutiva (1 = Cachorro, 2 = Joven,
// 3 = Adulta). Son constantes fijas a propósito: la identidad de la mascota debe
// ser estable entre los 6 temas (una mascota no cambia de color al pasar a tema
// Fiesta). Mismo criterio que tools/iconos/generar.js, que fija INDIGO/CORAL
// tomados del tema Sereno. La paleta se profundiza al evolucionar.

const ETAPAS = [
  { body: '#DDC9FB', bodyHi: '#EFE3FF', belly: '#F6EEFF', dark: '#7E57C2', line: '#6D48B0' },
  { body: '#C3B4FB', bodyHi: '#DCD2FF', belly: '#EDE9FE', dark: '#5B4B9A', line: '#4C3E86' },
  { body: '#A6B0FC', bodyHi: '#C9D0FF', belly: '#E4E8FF', dark: '#4A4F9E', line: '#3D3F8C' },
];

// Acentos compartidos por todas las especies.
export const CORAL = '#F0977A';
export const CORAL_SOFT = '#F9C3B0';
export const GOLD = '#F6C453';
export const GLOW = '#B9C4FF';

// etapa 1|2|3 → paleta (tolera fuera de rango).
export const paletaEtapa = (etapa) => ETAPAS[Math.max(0, Math.min(2, (Number(etapa) || 1) - 1))];
