import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { escenaPlana } from './sprites/disenoEtapas';
import { ESPECIE_POR_DEFECTO } from './sprites/especies';

// Materializa un nodo del pipeline de sprites (objeto plano { t, ...attrs }) en
// un primitivo de react-native-svg. Los atributos ya vienen en camelCase.
export function renderNodo(nodo, key) {
  const { t, ...attrs } = nodo;
  if (t === 'circle') return <Circle key={key} {...attrs} />;
  if (t === 'ellipse') return <Ellipse key={key} {...attrs} />;
  if (t === 'path') return <Path key={key} {...attrs} />;
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
  size = 62,
}) {
  const nodos = escenaPlana({
    especie, etapa, accesorioCabeza, accesorioColor,
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
