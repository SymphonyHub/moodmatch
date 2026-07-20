import { useState } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import {
  CATEGORY_IONICONS,
  DEFAULT_CATEGORY_IONICON,
} from '../../constants/categories';
import Tappable from '../Tappable';
import RecompensaCompletada from './RecompensaCompletada';

/**
 * AccionSocialCard — tarjeta visual de una acción de "Con amigos". Presenta
 * icono + jerarquía título/descripción. Diseñada para dos modos, sin regresión:
 *
 * - Sin `onPress`: tarjeta informativa (equivale al estado estático actual).
 * - Con `onPress`: se vuelve táctil (Tappable) y muestra el chevron.
 *
 * En ambos modos incluye el estado persistible "La hice" / "Hecha".
 */
export default function AccionSocialCard({
  actividad,
  onPress,
  icon,
  accessory,
  disabled,
  completada = false,
  onCompletar,
}) {
  const { theme } = useTheme();
  const styles = useStyles();
  const [celebrando, setCelebrando] = useState(false);

  const color = theme.colors.categories[actividad.categoria] ?? theme.colors.textMuted;
  const iconName = icon ?? CATEGORY_IONICONS[actividad.categoria] ?? DEFAULT_CATEGORY_IONICON;

  const derecha =
    accessory ??
    (onPress ? (
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textFaint} />
    ) : null);

  const contenido = (
    <View style={styles.principal}>
      <View style={[styles.icono, { backgroundColor: theme.colors.primarySoft }]}>
        <Ionicons name={iconName} size={22} color={color} />
      </View>
      <View style={styles.textos}>
        <Text style={styles.nombre}>{actividad.nombre}</Text>
        <Text style={styles.desc}>{actividad.descripcion}</Text>
      </View>
      {derecha}
    </View>
  );

  const handleHice = () => {
    if (completada) return;
    setCelebrando(true);
    onCompletar?.();
  };

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      {onPress ? (
        <Tappable onPress={onPress} disabled={disabled} haptic={false}>
          {contenido}
        </Tappable>
      ) : contenido}

      <Tappable
        style={[styles.btnHice, completada ? styles.btnHecha : { backgroundColor: color }]}
        onPress={handleHice}
        disabled={completada}
      >
        <Ionicons
          name={completada ? 'checkmark' : 'checkmark-circle-outline'}
          size={18}
          color={completada ? color : theme.colors.onPrimary}
        />
        <Text style={[styles.btnHiceText, { color: completada ? color : theme.colors.onPrimary }]}>
          {completada ? 'Hecha' : 'La hice'}
        </Text>
      </Tappable>

      {celebrando && (
        <View style={styles.overlay} pointerEvents="none">
            <RecompensaCompletada categoria={actividad.categoria} onFin={() => setCelebrando(false)} />
        </View>
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  card: {
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.shape.radiusLg,
    padding: 20,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: t.colors.categories.social,
    ...t.shadows.card,
  },
  principal: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  icono: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  btnHice: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: t.shape.radiusMd,
    marginTop: 16,
  },
  btnHecha: { backgroundColor: t.colors.primarySoft },
  btnHiceText: {
    ...t.typography.fonts.semibold,
    fontSize: t.fontSize(15),
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
