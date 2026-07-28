import { useState } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Tappable from '../../components/Tappable';
import { makeThemedStyles, useTheme } from '../../theme/ThemeContext';
import CelebracionLottie from '../animation/CelebracionLottie';
import MascotaSprite from '../MascotaSprite';
import { CATALOGO_ACCESORIOS } from '../sprites/accesorios';
import { ESPECIE_POR_DEFECTO } from '../sprites/especies';

// Vestidor: el grid donde se equipa y se quita lo que la mascota lleva puesto.
//
// Antes era una lista de nombres. Con el catálogo base ya son once piezas de
// cabeza, y un nombre suelto no dice si el gorro es de lana o de fiesta: cada
// casilla dibuja la mascota REAL —su especie, su etapa— usando la pieza, que es
// lo único que responde de verdad a "¿cómo le queda?".
//
// El recorte es lo que hace la vista previa legible. Un accesorio de cabeza
// ocupa una franja chica de un lienzo de 100×100; dibujado entero en una casilla
// de 76 px queda del tamaño de una miga. Para esas piezas el sprite se dibuja
// más grande y se encuadra en la cabeza; los patrones de color, que van sobre el
// cuerpo, se muestran de cuerpo entero.

const LADO_CASILLA = 78;
const SPRITE_CABEZA = 142;
const SPRITE_CUERPO = 74;

// Encuadre de cabeza. Con el sprite a 142 px y la casilla mostrando 78×66, la
// ventana visible del lienzo 0 0 100 100 queda en x≈22..78, y≈3..49: entra el
// gorro más alto (su punta llega a y≈5) y se recorta a la altura del pecho.
const RECORTE_CABEZA = {
  width: SPRITE_CABEZA,
  height: SPRITE_CABEZA,
  marginLeft: (LADO_CASILLA - SPRITE_CABEZA) / 2,
  marginTop: -4,
};

const GRUPOS = [
  { categoria: 'cabeza', titulo: 'Cabeza y rostro', foco: 'cabeza' },
  { categoria: 'color', titulo: 'Color y patrón', foco: 'cuerpo' },
];

export function VistaPreviaAccesorio({
  item, especie, etapa, foco, apagado,
}) {
  const styles = useStyles();
  const puesto = {
    accesorioCabeza: item.categoria === 'cabeza' ? item.id : null,
    accesorioColor: item.categoria === 'color' ? item.id : null,
  };
  const enCabeza = foco === 'cabeza';

  return (
    <View style={[styles.preview, apagado && styles.previewApagado]}>
      <View style={enCabeza ? RECORTE_CABEZA : null}>
        <MascotaSprite
          especie={especie}
          etapa={etapa}
          size={enCabeza ? SPRITE_CABEZA : SPRITE_CUERPO}
          {...puesto}
        />
      </View>
    </View>
  );
}

function Casilla({
  item, especie, etapa, foco, desbloqueado, puesto, onPress, celebrar, onFinCelebrar,
}) {
  const { theme } = useTheme();
  const styles = useStyles();

  let etiqueta = `Equipar ${item.nombre}`;
  if (!desbloqueado) etiqueta = `${item.nombre}, bloqueado. ${item.pista}`;
  else if (puesto) etiqueta = `Quitar ${item.nombre}`;

  return (
    <Tappable
      style={[
        styles.casilla,
        puesto && styles.casillaPuesta,
        !desbloqueado && styles.casillaBloqueada,
      ]}
      onPress={() => desbloqueado && onPress()}
      disabled={!desbloqueado}
      haptic={false}
      accessibilityLabel={etiqueta}
      accessibilityState={{ selected: puesto, disabled: !desbloqueado }}
      testID={`accesorio-${item.id}`}
    >
      <View style={styles.previewCaja}>
        <VistaPreviaAccesorio
          item={item}
          especie={especie}
          etapa={etapa}
          foco={foco}
          apagado={!desbloqueado}
        />
        {!desbloqueado && (
          <View style={styles.velo}>
            <Ionicons name="lock-closed" size={15} color={theme.colors.textMuted} />
          </View>
        )}
        {puesto && (
          <View style={styles.marcaPuesta}>
            <Ionicons name="checkmark" size={12} color={theme.colors.onPrimary} />
          </View>
        )}
        {celebrar && (
          <CelebracionLottie
            tipo="destellos"
            base={LADO_CASILLA}
            onFin={onFinCelebrar}
            testID={`destellos-${item.id}`}
          />
        )}
      </View>
      <Text
        style={[styles.nombre, !desbloqueado && styles.nombreBloqueado]}
        numberOfLines={2}
      >
        {item.nombre}
      </Text>
      {!desbloqueado && <Text style={styles.pista} numberOfLines={2}>{item.pista}</Text>}
    </Tappable>
  );
}

export default function VestidorAccesorios({
  accesorios,
  especie = ESPECIE_POR_DEFECTO,
  etapa = 1,
  onEquipar,
  catalogo = CATALOGO_ACCESORIOS,
}) {
  const styles = useStyles();
  const [festejando, setFestejando] = useState(null);

  const desbloqueados = new Set(accesorios?.desbloqueados ?? []);
  const equipado = {
    cabeza: accesorios?.cabeza ?? null,
    color: accesorios?.color ?? null,
  };

  // Los destellos solo salen al PONER algo, no al quitarlo: quitar no es un
  // logro y una celebración ahí se leería como que pasó algo bueno.
  const tocar = (categoria, id) => {
    const seEstaPoniendo = equipado[categoria] !== id;
    setFestejando(seEstaPoniendo ? id : null);
    onEquipar?.(categoria, id);
  };

  return (
    <View style={styles.wrap} testID="vestidor-accesorios">
      {GRUPOS.map(({ categoria, titulo, foco }) => {
        const items = catalogo.filter((a) => a.categoria === categoria);
        if (!items.length) return null;
        const puestos = items.filter((a) => desbloqueados.has(a.id)).length;
        return (
          <View key={categoria} style={styles.grupo}>
            <View style={styles.grupoEncabezado}>
              <Text style={styles.grupoTitulo}>{titulo}</Text>
              <Text style={styles.grupoConteo}>{`${puestos} de ${items.length}`}</Text>
            </View>
            <View style={styles.fila}>
              {items.map((item) => (
                <Casilla
                  key={item.id}
                  item={item}
                  especie={especie}
                  etapa={etapa}
                  foco={foco}
                  desbloqueado={desbloqueados.has(item.id)}
                  puesto={equipado[categoria] === item.id}
                  onPress={() => tocar(categoria, item.id)}
                  celebrar={festejando === item.id}
                  onFinCelebrar={() => setFestejando(
                    (actual) => (actual === item.id ? null : actual),
                  )}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  wrap: { marginTop: 12, gap: 18 },
  grupo: { gap: 9 },
  grupoEncabezado: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  grupoTitulo: {
    ...t.typography.fonts.semibold,
    fontSize: t.fontSize(12),
    color: t.colors.text,
  },
  grupoConteo: { ...t.typography.type.caption, color: t.colors.textMuted },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  casilla: {
    width: LADO_CASILLA,
    padding: 5,
    borderRadius: t.shape.radiusMd,
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
  },
  casillaPuesta: {
    borderColor: t.colors.primary,
    borderWidth: t.shape.borderMedium,
    backgroundColor: t.colors.primarySoft,
  },
  casillaBloqueada: { backgroundColor: t.colors.background },
  previewCaja: {
    height: LADO_CASILLA - 12,
    overflow: 'hidden',
    borderRadius: t.shape.radiusSm,
    backgroundColor: t.colors.accentSoft,
  },
  preview: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewApagado: { opacity: 0.45 },
  velo: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    width: 21,
    height: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: t.colors.surface,
  },
  marcaPuesta: {
    position: 'absolute',
    right: 3,
    top: 3,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: t.colors.primary,
  },
  nombre: {
    ...t.typography.fonts.medium,
    marginTop: 5,
    fontSize: t.fontSize(10),
    lineHeight: Math.round(t.fontSize(10) * 1.3),
    textAlign: 'center',
    color: t.colors.text,
  },
  nombreBloqueado: { color: t.colors.textMuted },
  pista: {
    ...t.typography.fonts.regular,
    marginTop: 2,
    fontSize: t.fontSize(9),
    lineHeight: Math.round(t.fontSize(9) * 1.3),
    textAlign: 'center',
    color: t.colors.textFaint,
  },
}));
