import Svg, {
  Circle, Ellipse, G, Path, Defs, RadialGradient, Stop,
} from 'react-native-svg';
import { escenaPlana } from './sprites/disenoEtapas';
import { ESPECIE_POR_DEFECTO } from './sprites/especies';

// Materializa un nodo del pipeline de sprites (objeto plano { t, ...attrs }) en
// un primitivo de react-native-svg. Los atributos ya vienen en camelCase.
// El nodo `grad` no dibuja: declara el sombreado radial que las masas de la
// silueta referencian por id (fill="url(#…)"), y debe ir dentro del <Svg>.
// `rol` tampoco se dibuja: es la etiqueta con la que el rig encuentra el rubor
// dentro de la cara (geometria.js), y no debe llegar al SVG como atributo.
// `g` agrupa y transforma: sus `hijos` se materializan anidados, y por eso ese
// campo tampoco viaja como atributo.
export function renderNodo(nodo, key) {
  const { t, rol, hijos, ...attrs } = nodo;
  if (t === 'circle') return <Circle key={key} {...attrs} />;
  if (t === 'ellipse') return <Ellipse key={key} {...attrs} />;
  if (t === 'path') return <Path key={key} {...attrs} />;
  if (t === 'g') {
    return (
      <G key={key} {...attrs}>
        {renderNodos(hijos ?? [], `${key}h`)}
      </G>
    );
  }
  if (t === 'grad') {
    return (
      <Defs key={key}>
        <RadialGradient id={attrs.id} cx="0.36" cy="0.26" r="0.82">
          <Stop offset="0" stopColor={attrs.hi} />
          <Stop offset="0.52" stopColor={attrs.body} />
          <Stop offset="1" stopColor={attrs.edge} />
        </RadialGradient>
      </Defs>
    );
  }
  return null;
}

export const renderNodos = (nodos, prefijo = 'n') =>
  nodos.map((nodo, i) => renderNodo(nodo, `${prefijo}${i}`));

// Sprite ESTÁTICO de la mascota. `etapa` es el número evolutivo (1|2|3) del
// backend (mascota.etapa.numero); ya no el índice viejo por umbrales 4/10/20.
// Para el sprite ANIMADO usar MascotaAnimada, que comparte este mismo pipeline.
export default function MascotaSprite({
  especie = ESPECIE_POR_DEFECTO,
  etapa = 1,
  accesorioCabeza = null,
  accesorioColor = null,
  parpado = 'ninguno',
  size = 62,
}) {
  const nodos = escenaPlana({
    especie, etapa, accesorioCabeza, accesorioColor, parpado,
  });
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityLabel={`Mascota ${especie}, etapa ${etapa}`}
    >
      {renderNodos(nodos)}
    </Svg>
  );
}
