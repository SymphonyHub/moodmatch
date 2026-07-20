import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

const PALETAS = [
  { cuerpo: '#D8B4FE', detalle: '#7E57C2', oreja: '#F3E8FF' },
  { cuerpo: '#C4B5FD', detalle: '#5B4B9A', oreja: '#EDE9FE' },
  { cuerpo: '#A5B4FC', detalle: '#4338CA', oreja: '#E0E7FF' },
  { cuerpo: '#818CF8', detalle: '#312E81', oreja: '#DDD6FE' },
];

// Cuatro sprites vectoriales propios: cambian silueta y detalles con cada etapa.
export default function MascotaSprite({ etapa = 0, size = 62 }) {
  const nivel = Math.max(0, Math.min(3, etapa));
  const color = PALETAS[nivel];
  const corona = nivel === 3;

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel={`Sprite etapa ${nivel + 1}`}>
      {corona && <Path d="M20 15l5 5 7-9 7 9 5-5 2 13H18z" fill="#FBBF24" />}
      <Ellipse cx="32" cy="51" rx={nivel > 1 ? 20 : 17} ry="10" fill={color.cuerpo} />
      <Circle cx="32" cy="30" r={nivel > 1 ? 19 : 16} fill={color.cuerpo} />
      <Path d="M18 24L19 8l12 12zM46 24L45 8 33 20z" fill={color.detalle} />
      <Path d="M21 20l-1-7 7 8zM43 20l1-7-7 8z" fill={color.oreja} />
      <Circle cx="26" cy="30" r="2" fill={color.detalle} />
      <Circle cx="38" cy="30" r="2" fill={color.detalle} />
      <Path d="M29 37q3 3 6 0" stroke={color.detalle} strokeWidth="2" fill="none" strokeLinecap="round" />
      {nivel >= 1 && <Path d="M24 45q8 5 16 0" stroke={color.oreja} strokeWidth="2" fill="none" />}
      {nivel >= 2 && <Circle cx="17" cy="42" r="3" fill={color.oreja} />}
    </Svg>
  );
}
