import { Text, View } from 'react-native';
import { makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../Tappable';
import Entrance from '../Entrance';

// Chips de respuesta rápida al final del stream del chat.
// items: [{ id, label, emoji?, tint?: { color, soft } }]
export default function QuickReplies({ items, onSelect, disabled }) {
  const styles = useStyles();

  return (
    <View style={styles.fila}>
      {items.map((item, i) => (
        <Entrance key={item.id} index={i} distance={8}>
          <Tappable
            style={[
              styles.chip,
              item.tint && {
                backgroundColor: item.tint.soft,
                borderColor: item.tint.color,
              },
            ]}
            onPress={() => onSelect(item.id)}
            disabled={disabled}
            activeOpacity={0.8}
          >
            {item.emoji ? <Text style={styles.emoji}>{item.emoji}</Text> : null}
            <Text
              style={[styles.label, item.tint && { color: item.tint.color }]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Tappable>
        </Entrance>
      ))}
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  fila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 2,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderMedium,
    borderColor: t.colors.primarySoftBorder,
    borderRadius: t.shape.radiusXl,
    paddingVertical: 9,
    paddingHorizontal: 14,
    ...t.shadows.card,
  },
  emoji: { fontSize: t.fontSize(16) },
  label: {
    ...t.typography.fonts.semibold,
    fontSize: t.fontSize(14),
    color: t.colors.primary,
  },
}));
