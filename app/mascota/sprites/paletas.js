// Paleta de la criatura, por etapa evolutiva (1 = Cachorro, 2 = Joven,
// 3 = Adulta). Son constantes fijas a propósito: la identidad de la mascota debe
// ser estable entre los 6 temas (una mascota no cambia de color al pasar a tema
// Fiesta). Mismo criterio que tools/iconos/generar.js, que fija INDIGO/CORAL
// tomados del tema Sereno. La paleta se profundiza al evolucionar.
//
// Fase 17: es una pastel derivada del índigo de marca (#4A5FC1), no la marca en
// sí — vive solo en el mundo de la mascota y la identidad de la app no se toca.
// Cada etapa expone cinco valores de masa y dos de línea:
//
//   hi    → centro del sombreado radial (la luz)
//   body  → color medio, el que domina la silueta
//   edge  → borde del sombreado y piezas secundarias (alas, patas, orejas)
//   deep  → marcas de especie (mancha del perro, antifaz, cresta del dino)
//   belly → panza, hocicos y zonas claras
//   ink   → facciones: ojos, nariz, boca
//   tonal → contorno, del propio tono del cuerpo (tratamiento elegido en el
//           checkpoint 1: ni contorno neutro ni ausencia de contorno)
//
// bodyHi/dark/line son alias de compatibilidad: accesorios.js sigue nombrando
// así los tres colores que usa.

const ETAPAS = [
  {
    hi: '#F6F0FF', body: '#DFD2FB', edge: '#CBB8F3', deep: '#B79FEC', belly: '#FCF8FF', ink: '#6B4F8E', tonal: '#A88ADD',
  },
  {
    hi: '#EFEBFF', body: '#CFC6F9', edge: '#B9ADF2', deep: '#A093E6', belly: '#F7F4FF', ink: '#574A85', tonal: '#8E82D6',
  },
  {
    hi: '#EAEEFF', body: '#BEC6FA', edge: '#A6B0F2', deep: '#8D9AE9', belly: '#F1F4FF', ink: '#414781', tonal: '#7A88D6',
  },
].map((p) => ({
  ...p, bodyHi: p.hi, dark: p.ink, line: p.tonal,
}));

// Acentos compartidos por todas las especies.
export const CORAL = '#F0977A';
export const CORAL_SOFT = '#F6BCA8';
export const GOLD = '#F6C453';
export const GLOW = '#C6CEFF';

// etapa 1|2|3 → paleta (tolera fuera de rango).
export const paletaEtapa = (etapa) => ETAPAS[Math.max(0, Math.min(2, (Number(etapa) || 1) - 1))];
