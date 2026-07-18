import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '../../constants/categories';
import Tappable from '../Tappable';

/**
 * AccionSocialCard — tarjeta visual de una acción de "Con amigos". Presenta
 * icono + jerarquía título/descripción. Diseñada para dos modos, sin regresión:
 *
 * - Sin `onPress`: tarjeta informativa (equivale al estado estático actual).
 * - Con `onPress`: se vuelve táctil (Tappable) y muestra el chevron.
 *
 * Así el Agente C puede volver interactivas las 3 acciones pasando `onPress`
 * (y opcionalmente `icon`/`accessory`) sin cambiar esta pieza de presentación.
 */
export default function AccionSocialCard({ actividad, onPress, icon, accessory, disabled }) {
  const { theme } = useTheme();
  const styles = useStyles();

  const color = theme.colors.categories[actividad.categoria] ?? theme.colors.textMuted;
  const emoji = icon ?? CATEGORY_ICONS[actividad.categoria] ?? DEFAULT_CATEGORY_ICON;

  const derecha =
    accessory ??
    (onPress ? (
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textFaint} />
    ) : null);

  const contenido = (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <Text style={styles.icono}>{emoji}</Text>
      <View style={styles.textos}>
        <Text style={styles.nombre}>{actividad.nombre}</Text>
        <Text style={styles.desc}>{actividad.descripcion}</Text>
      </View>
      {derecha}
    </View>
  );

  if (!onPress) return contenido;

  // El Tappable solo envuelve para la animación de presión; el margen inferior
  // lo aporta la card, así el espaciado entre ítems es igual en ambos modos.
  return (
    <Tappable onPress={onPress} disabled={disabled} haptic={false}>
      {contenido}
    </Tappable>
  );
}

const useStyles = makeThemedStyles((t) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusLg,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: t.colors.categories.social,
    ...t.shadows.card,
  },
  icono: { fontSize: t.fontSize(24) },
  textos: { flex: 1 },
  nombre: {
    fontSize: t.fontSize(15),
    ...t.typography.fonts.bold,
    color: t.colors.text,
    marginBottom: 4,
  },
  desc: {
    fontSize: t.fontSize(13),
    color: t.colors.textMuted,
    lineHeight: Math.round(t.fontSize(13) * 1.5),
  },
}));
