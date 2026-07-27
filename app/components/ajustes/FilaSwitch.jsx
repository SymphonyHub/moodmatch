import { Switch, Text, View } from 'react-native';
import { makeThemedStyles, useTheme } from '../../theme/ThemeContext';

// Fila de ajuste con interruptor: el patrón que comparten Ajustes y las
// Preferencias de notificaciones. Vive acá porque las dos pantallas lo tenían
// duplicado y ya había divergido — el pulgar apagado era `surface` en una y
// `textFaint` en la otra, así que el mismo control se veía distinto según de
// dónde se llegara.
//
// `divider` dibuja la línea inferior para las listas de varias filas seguidas
// (la última de la lista va sin ella).
export default function FilaSwitch({
  title,
  hint,
  value,
  onValueChange,
  disabled = false,
  divider = false,
  accessibilityLabel,
  accessibilityHint,
}) {
  const { theme } = useTheme();
  const styles = useStyles();

  return (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.colors.border, true: theme.colors.primarySoftBorder }}
        thumbColor={value ? theme.colors.primary : theme.colors.surface}
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={accessibilityHint}
      />
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13 },
  divider: { borderBottomWidth: t.shape.borderThin, borderBottomColor: t.colors.border },
  copy: { flex: 1 },
  title: { ...t.typography.type.body, ...t.typography.fonts.semibold, color: t.colors.text },
  hint: { ...t.typography.type.caption, color: t.colors.textMuted, marginTop: 3 },
}));
