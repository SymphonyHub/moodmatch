import { useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Entrance from '../../components/Entrance';
import HabitatBg from '../../components/mascota/HabitatBg';
import SegmentedTabs from '../../components/SegmentedTabs';
import Tappable from '../../components/Tappable';
import { makeThemedStyles, useTheme } from '../../theme/ThemeContext';
import { isCompactWidth } from '../../utils/responsive';
import MascotaSprite from '../MascotaSprite';
import { CATALOGO_TIENDA, CATEGORIAS_TIENDA } from './catalogo';

const tabs = CATEGORIAS_TIENDA.map(({ id, etiqueta }) => ({ id, label: etiqueta }));

const textoSemillitas = (cantidad) =>
  `${cantidad} ${cantidad === 1 ? 'semillita' : 'semillitas'}`;

function VistaProducto({ item }) {
  const styles = useStyles();

  if (item.categoria === 'habitat') {
    return (
      <HabitatBg
        variante={item.preview.variante}
        style={styles.habitatMiniatura}
        testID={`habitat-preview-${item.id}`}
      />
    );
  }

  return (
    <View
      style={[styles.previewIlustrado, { backgroundColor: item.preview.fondo }]}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={[
          styles.previewHalo,
          { backgroundColor: item.preview.superficie, borderColor: item.preview.detalle },
        ]}
      />
      <View
        style={[styles.previewPunto, styles.previewPuntoArriba, { backgroundColor: item.preview.detalle }]}
      />
      <View
        style={[styles.previewPunto, styles.previewPuntoAbajo, { backgroundColor: item.preview.color }]}
      />
      <Ionicons name={item.preview.icono} size={43} color={item.preview.color} />
    </View>
  );
}

function TarjetaProducto({ item, monedas, comprado, onComprar }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const alcanza = monedas >= item.precio;
  const puedeComprar = !comprado && alcanza;
  const faltan = Math.max(0, item.precio - monedas);

  let accion = 'Comprar';
  let iconoAccion = 'leaf';
  let accessibilityLabel = `Comprar ${item.nombre} por ${textoSemillitas(item.precio)}`;
  if (comprado) {
    accion = 'En su colección';
    iconoAccion = 'checkmark-circle';
    accessibilityLabel = `${item.nombre}. Ya está en su colección`;
  } else if (!alcanza) {
    accion = `Faltan ${textoSemillitas(faltan)}`;
    iconoAccion = 'lock-closed';
    accessibilityLabel = `${item.nombre}, ${textoSemillitas(item.precio)}. ${accion}`;
  }

  const manejarCompra = () => {
    if (puedeComprar) onComprar?.(item);
  };

  return (
    <Tappable
      style={[
        styles.tarjeta,
        comprado && styles.tarjetaComprada,
        !alcanza && !comprado && styles.tarjetaSinSaldo,
      ]}
      onPress={manejarCompra}
      disabled={!puedeComprar}
      haptic={false}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={
        puedeComprar ? 'Usa las semillitas compartidas para solicitar la compra' : undefined
      }
      accessibilityState={{ disabled: !puedeComprar }}
      testID={`tienda-item-${item.id}`}
    >
      <View style={styles.previewProducto}>
        <VistaProducto item={item} />
      </View>

      <View style={styles.infoProducto}>
        <Text style={styles.nombreProducto}>{item.nombre}</Text>
        <Text style={styles.descripcionProducto}>{item.descripcion}</Text>
        <View style={styles.precioFila}>
          <Ionicons name="leaf" size={13} color={theme.colors.primary} />
          <Text style={styles.precioTexto}>{textoSemillitas(item.precio)}</Text>
        </View>
      </View>

      <View
        style={[
          styles.accionProducto,
          comprado && styles.accionComprada,
          !alcanza && !comprado && styles.accionSinSaldo,
        ]}
      >
        <Ionicons
          name={iconoAccion}
          size={15}
          color={puedeComprar ? theme.colors.onPrimary : theme.colors.textMuted}
        />
        <Text style={[styles.accionTexto, !puedeComprar && styles.accionTextoInactiva]}>
          {accion}
        </Text>
      </View>
    </Tappable>
  );
}

export default function TiendaScreen({
  monedas = 0,
  comprados = [],
  items = CATALOGO_TIENDA,
  categoriaInicial = CATEGORIAS_TIENDA[0].id,
  especie,
  etapa = 1,
  nombreMascota,
  varianteHabitat = 'sereno',
  onComprar,
}) {
  const { width } = useWindowDimensions();
  const compacta = isCompactWidth(width);
  const encabezadoVertical = Number.isFinite(width) && width < 520;
  const { theme } = useTheme();
  const styles = useStyles();
  const categoriaValida = CATEGORIAS_TIENDA.some(({ id }) => id === categoriaInicial);
  const [categoriaActiva, setCategoriaActiva] = useState(
    categoriaValida ? categoriaInicial : CATEGORIAS_TIENDA[0].id,
  );
  const saldo = Number.isFinite(monedas) && monedas >= 0 ? monedas : 0;
  const idsComprados = new Set(Array.isArray(comprados) ? comprados : []);
  const catalogo = Array.isArray(items) ? items : CATALOGO_TIENDA;
  const visibles = catalogo.filter((item) => item.categoria === categoriaActiva);
  const destinatario = nombreMascota ? ` para ${nombreMascota}` : '';

  return (
    <ScrollView
      style={styles.pantalla}
      contentContainerStyle={styles.contenido}
      showsVerticalScrollIndicator={false}
      testID="tienda-screen"
    >
      <Entrance index={0}>
        <View style={[styles.encabezado, encabezadoVertical && styles.encabezadoVertical]}>
          <View style={styles.tituloBloque}>
            <View style={styles.sobretituloFila}>
              <Ionicons name="sparkles" size={15} color={theme.colors.accent} />
              <Text style={styles.sobretitulo}>TIENDA DEL HÁBITAT</Text>
            </View>
            <Text style={styles.titulo}>Un rinconcito para compartir</Text>
            <Text style={styles.intro}>
              Elijan algo bonito{destinatario}; las semillitas son de ambos.
            </Text>
          </View>

          <View
            style={styles.saldo}
            accessible
            accessibilityLabel={`Saldo compartido: ${textoSemillitas(saldo)}`}
          >
            <View style={styles.saldoIcono}>
              <Ionicons name="leaf" size={17} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.saldoEtiqueta}>Disponible</Text>
              <Text style={styles.saldoCantidad}>{textoSemillitas(saldo)}</Text>
            </View>
          </View>
        </View>
      </Entrance>

      <Entrance index={1} style={styles.escenaEntrada}>
        <View style={[styles.escena, compacta && styles.escenaCompacta]}>
          <HabitatBg
            variante={varianteHabitat}
            style={styles.habitatPrincipal}
            testID="tienda-habitat-bg"
          />
          <View style={styles.escenaEtiqueta}>
            <Ionicons name="home-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.escenaEtiquetaTexto}>Su espacio</Text>
          </View>
          <View style={styles.mascotaHero}>
            <MascotaSprite especie={especie} etapa={etapa} size={compacta ? 104 : 122} />
          </View>
        </View>
      </Entrance>

      <Entrance index={2} style={styles.notaEntrada}>
        <View style={styles.notaCompartida}>
          <View style={styles.notaIcono}>
            <Ionicons name="heart-outline" size={17} color={theme.colors.accent} />
          </View>
          <Text style={styles.notaTexto}>
            Cada compra queda en la colección compartida de su mascota.
          </Text>
        </View>
      </Entrance>

      <Entrance index={3} style={styles.catalogoEntrada}>
        <View style={styles.catalogoTituloFila}>
          <Text style={styles.catalogoTitulo}>Explorar la tienda</Text>
          <Text style={styles.conteo}>{`${visibles.length} opciones`}</Text>
        </View>
        <SegmentedTabs
          tabs={tabs}
          activeId={categoriaActiva}
          onChange={setCategoriaActiva}
        />
      </Entrance>

      <View style={styles.grid} testID="tienda-catalogo">
        {visibles.map((item, index) => (
          <Entrance
            key={`${categoriaActiva}-${item.id}`}
            index={Math.min(index + 1, 4)}
            style={compacta ? styles.columnaCompleta : styles.columnaDoble}
          >
            <TarjetaProducto
              item={item}
              monedas={saldo}
              comprado={idsComprados.has(item.id)}
              onComprar={onComprar}
            />
          </Entrance>
        ))}
      </View>

      {visibles.length === 0 && (
        <View style={styles.vacio}>
          <Ionicons name="leaf-outline" size={22} color={theme.colors.textFaint} />
          <Text style={styles.vacioTexto}>Este estante se está preparando.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const useStyles = makeThemedStyles((t) => ({
  pantalla: { flex: 1, backgroundColor: t.colors.background },
  contenido: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 44,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 18,
  },
  encabezadoVertical: { flexDirection: 'column' },
  tituloBloque: { flex: 1, minWidth: 0 },
  sobretituloFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sobretitulo: {
    ...t.typography.fonts.bold,
    fontSize: t.fontSize(10),
    letterSpacing: 1.1,
    color: t.colors.accent,
  },
  titulo: { ...t.typography.type.display, marginTop: 6, color: t.colors.text },
  intro: {
    ...t.typography.type.body,
    marginTop: 7,
    maxWidth: 460,
    color: t.colors.textMuted,
  },
  saldo: {
    minWidth: 138,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: t.shape.radiusLg,
    backgroundColor: t.colors.primarySoft,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
  },
  saldoIcono: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: t.colors.surface,
  },
  saldoEtiqueta: { ...t.typography.fonts.medium, fontSize: t.fontSize(10), color: t.colors.textMuted },
  saldoCantidad: {
    ...t.typography.fonts.bold,
    marginTop: 1,
    fontSize: t.fontSize(13),
    color: t.colors.primary,
  },
  escenaEntrada: { marginTop: 20 },
  escena: {
    height: 214,
    overflow: 'hidden',
    borderRadius: t.shape.radiusXl,
    borderWidth: t.shape.borderMedium,
    borderColor: t.colors.primarySoftBorder,
    backgroundColor: t.colors.accentSoft,
    ...t.shadows.cardStrong,
  },
  escenaCompacta: { height: 190 },
  habitatPrincipal: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 0,
  },
  escenaEtiqueta: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: t.shape.radiusXl,
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
  },
  escenaEtiquetaTexto: {
    ...t.typography.fonts.semibold,
    fontSize: t.fontSize(11),
    color: t.colors.primary,
  },
  mascotaHero: {
    position: 'absolute',
    right: 0,
    bottom: 10,
    left: 0,
    alignItems: 'center',
  },
  notaEntrada: { marginTop: 12 },
  notaCompartida: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: t.shape.radiusLg,
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
  },
  notaIcono: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: t.colors.accentSoft,
  },
  notaTexto: { ...t.typography.type.caption, flex: 1, color: t.colors.textMuted },
  catalogoEntrada: { marginTop: 28, gap: 12 },
  catalogoTituloFila: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  catalogoTitulo: { ...t.typography.type.section, color: t.colors.text },
  conteo: { ...t.typography.type.caption, color: t.colors.textMuted },
  grid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    columnGap: 12,
  },
  columnaCompleta: { width: '100%' },
  columnaDoble: { width: '48%' },
  tarjeta: {
    minHeight: 252,
    padding: 10,
    borderRadius: t.shape.radiusLg,
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    ...t.shadows.card,
  },
  tarjetaComprada: {
    borderColor: t.colors.primarySoftBorder,
    backgroundColor: t.colors.surfaceElevated,
  },
  tarjetaSinSaldo: { opacity: 0.78 },
  previewProducto: {
    height: 112,
    overflow: 'hidden',
    borderRadius: t.shape.radiusMd,
    backgroundColor: t.colors.accentSoft,
  },
  habitatMiniatura: { borderRadius: t.shape.radiusMd },
  previewIlustrado: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewHalo: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: t.shape.borderMedium,
    opacity: 0.82,
  },
  previewPunto: { position: 'absolute', width: 12, height: 12, borderRadius: 6, opacity: 0.7 },
  previewPuntoArriba: { top: 15, right: 19 },
  previewPuntoAbajo: { bottom: 16, left: 21, width: 8, height: 8, borderRadius: 4, opacity: 0.4 },
  infoProducto: { paddingHorizontal: 2, paddingTop: 11 },
  nombreProducto: {
    ...t.typography.fonts.semibold,
    fontSize: t.fontSize(14),
    lineHeight: Math.round(t.fontSize(14) * 1.35),
    color: t.colors.text,
  },
  descripcionProducto: {
    ...t.typography.fonts.regular,
    marginTop: 3,
    fontSize: t.fontSize(11),
    lineHeight: Math.round(t.fontSize(11) * 1.45),
    color: t.colors.textMuted,
  },
  precioFila: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  precioTexto: {
    ...t.typography.fonts.semibold,
    fontSize: t.fontSize(11),
    color: t.colors.primary,
  },
  accionProducto: {
    minHeight: 38,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: t.shape.radiusMd,
    backgroundColor: t.colors.primary,
  },
  accionComprada: { backgroundColor: t.colors.primarySoft },
  accionSinSaldo: { backgroundColor: t.colors.background },
  accionTexto: {
    ...t.typography.fonts.semibold,
    flexShrink: 1,
    textAlign: 'center',
    fontSize: t.fontSize(11),
    color: t.colors.onPrimary,
  },
  accionTextoInactiva: { color: t.colors.textMuted },
  vacio: {
    marginTop: 14,
    alignItems: 'center',
    gap: 8,
    padding: 24,
    borderRadius: t.shape.radiusLg,
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
  },
  vacioTexto: { ...t.typography.type.body, textAlign: 'center', color: t.colors.textMuted },
}));
