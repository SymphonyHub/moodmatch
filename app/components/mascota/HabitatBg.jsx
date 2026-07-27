import { useId } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { makeThemedStyles } from '../../theme/ThemeContext';

export const VARIANTES_HABITAT = Object.freeze(['sereno', 'amanecer', 'nocturno']);

const PALETAS = Object.freeze({
  sereno: Object.freeze({
    paredLuz: '#F7F2FF',
    paredSombra: '#DDD8F4',
    pisoLuz: '#EADFD7',
    pisoSombra: '#D8C6BA',
    zocalo: '#C9BBDD',
    luz: '#FFF3C9',
    manta: '#F4B29D',
    mantaLuz: '#F9D2C5',
    costura: '#C97763',
    hoja: '#789D82',
    hojaLuz: '#A9C4A4',
    maceta: '#D68D72',
    macetaLuz: '#F0B49C',
    sombra: '#504469',
  }),
  amanecer: Object.freeze({
    paredLuz: '#FFF5EC',
    paredSombra: '#F2D7CE',
    pisoLuz: '#EAD9C8',
    pisoSombra: '#D8C0AA',
    zocalo: '#DFB9AA',
    luz: '#FFF0AF',
    manta: '#C9CFF7',
    mantaLuz: '#E7E9FF',
    costura: '#858DCB',
    hoja: '#72977D',
    hojaLuz: '#AAC9A7',
    maceta: '#C9876D',
    macetaLuz: '#EAB29B',
    sombra: '#675263',
  }),
  nocturno: Object.freeze({
    paredLuz: '#55577D',
    paredSombra: '#303253',
    pisoLuz: '#554B67',
    pisoSombra: '#40384F',
    zocalo: '#77749B',
    luz: '#FFE8A8',
    manta: '#D58678',
    mantaLuz: '#EFB5A8',
    costura: '#844D4B',
    hoja: '#70917A',
    hojaLuz: '#A1B99C',
    maceta: '#B86F62',
    macetaLuz: '#DC9B88',
    sombra: '#25243B',
  }),
});

export default function HabitatBg({ variante = 'sereno', style, testID = 'habitat-bg' }) {
  const styles = useStyles();
  const paleta = PALETAS[variante] ?? PALETAS.sereno;
  const uid = useId().replace(/:/g, '');
  const paredId = `pared-${uid}`;
  const pisoId = `piso-${uid}`;
  const luzId = `luz-${uid}`;
  const mantaId = `manta-${uid}`;

  return (
    <View
      style={[styles.contenedor, style]}
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 360 240"
        preserveAspectRatio="xMidYMid slice"
        accessible={false}
        focusable={false}
      >
        <Defs>
          <LinearGradient id={paredId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={paleta.paredLuz} />
            <Stop offset="1" stopColor={paleta.paredSombra} />
          </LinearGradient>
          <LinearGradient id={pisoId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={paleta.pisoLuz} />
            <Stop offset="1" stopColor={paleta.pisoSombra} />
          </LinearGradient>
          <RadialGradient id={luzId} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={paleta.luz} stopOpacity="0.82" />
            <Stop offset="0.55" stopColor={paleta.luz} stopOpacity="0.28" />
            <Stop offset="1" stopColor={paleta.luz} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id={mantaId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={paleta.mantaLuz} />
            <Stop offset="1" stopColor={paleta.manta} />
          </LinearGradient>
        </Defs>

        <G id="habitat-capa-ambiente">
          <Rect width="360" height="169" fill={`url(#${paredId})`} />
          <Ellipse cx="285" cy="48" rx="112" ry="102" fill={`url(#${luzId})`} />
          <Circle cx="46" cy="45" r="23" fill={paleta.paredLuz} opacity="0.22" />
          <Circle cx="88" cy="84" r="11" fill={paleta.paredLuz} opacity="0.18" />
          <Path
            d="M21 137 C88 126 145 131 208 122 C268 114 317 118 360 108"
            fill="none"
            stroke={paleta.paredLuz}
            strokeWidth="3"
            opacity="0.2"
          />
          <Rect y="164" width="360" height="7" fill={paleta.zocalo} />
          <Path d="M0 171 L360 171 L360 240 L0 240 Z" fill={`url(#${pisoId})`} />
          <Path
            d="M0 208 C96 193 259 195 360 213"
            fill="none"
            stroke={paleta.pisoLuz}
            strokeWidth="2"
            opacity="0.42"
          />
        </G>

        <G id="habitat-capa-manta">
          <Ellipse cx="168" cy="219" rx="112" ry="13" fill={paleta.sombra} opacity="0.13" />
          <Path
            d="M55 210 C61 181 91 170 139 172 C190 165 246 179 270 207 C250 226 221 232 164 232 C111 232 76 225 55 210 Z"
            fill={`url(#${mantaId})`}
          />
          <Path
            d="M72 202 C107 211 129 197 159 202 C188 207 217 193 251 204"
            fill="none"
            stroke={paleta.costura}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.5"
          />
          <Path
            d="M88 181 C103 193 119 195 135 188 M212 183 C221 194 232 198 246 196"
            fill="none"
            stroke={paleta.mantaLuz}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.72"
          />
          <Circle cx="64" cy="213" r="3.4" fill={paleta.costura} opacity="0.68" />
          <Circle cx="73" cy="220" r="3.2" fill={paleta.costura} opacity="0.6" />
          <Circle cx="261" cy="214" r="3.4" fill={paleta.costura} opacity="0.68" />
        </G>

        <G id="habitat-capa-planta">
          <Ellipse cx="310" cy="224" rx="35" ry="7" fill={paleta.sombra} opacity="0.16" />
          <Path
            d="M307 180 C292 161 288 141 296 126 M308 179 C313 154 324 139 339 132 M308 177 C303 154 310 137 320 120"
            fill="none"
            stroke={paleta.hoja}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <Path
            d="M299 153 C281 151 273 137 279 126 C294 127 303 138 299 153 Z"
            fill={paleta.hojaLuz}
          />
          <Path
            d="M315 150 C320 132 333 124 345 128 C344 143 332 153 315 150 Z"
            fill={paleta.hoja}
          />
          <Path
            d="M306 143 C296 126 302 111 315 105 C325 119 320 134 306 143 Z"
            fill={paleta.hojaLuz}
          />
          <Path
            d="M293 181 L327 181 L323 218 C319 223 302 223 297 218 Z"
            fill={paleta.maceta}
          />
          <Rect x="290" y="176" width="40" height="11" rx="5.5" fill={paleta.macetaLuz} />
          <Path
            d="M301 190 C308 194 316 194 323 190"
            fill="none"
            stroke={paleta.macetaLuz}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
        </G>
      </Svg>
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  contenedor: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: t.shape.radiusXl,
    backgroundColor: t.colors.accentSoft,
  },
}));
