import { Text, View, ScrollView } from 'react-native';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../Tappable';
import { ESPECIES } from '../../mascota/especiesCatalogo';

// Carrusel horizontal para proponer una especie al invitar (o al contraproponer).
// Cada tarjeta muestra un ícono chico y el nombre; la seleccionada se resalta.
// Los íconos son placeholders (emoji): cuando llegue el catálogo de sprites de
// Agente C, se cambia el render de la tarjeta sin tocar esta interfaz
// (value: id seleccionado, onChange: (id) => void).
export default function SelectorEspecie({ value, onChange, especies = ESPECIES }) {
  const { theme } = useTheme();
  const styles = useStyles();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.fila}
      accessibilityRole="radiogroup"
    >
      {especies.map((especie) => {
        const activa = especie.id === value;
        return (
          <Tappable
            key={especie.id}
            style={[styles.card, activa && styles.cardActiva]}
            onPress={() => onChange?.(especie.id)}
            haptic={false}
            accessibilityRole="radio"
            accessibilityState={{ selected: activa }}
            accessibilityLabel={especie.nombre}
          >
            <View style={[styles.iconoWrap, activa && styles.iconoWrapActiva]}>
              <Text style={styles.emoji}>{especie.emoji ?? '🐾'}</Text>
            </View>
            <Text style={[styles.nombre, activa && styles.nombreActiva]} numberOfLines={1}>
              {especie.nombre}
            </Text>
          </Tappable>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeThemedStyles((t) => ({
  fila: { gap: 10, paddingVertical: 4, paddingHorizontal: 2 },
  card: {
    width: 92,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: t.shape.radiusLg,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  cardActiva: {
    borderColor: t.colors.primary,
    backgroundColor: t.colors.primarySoft,
  },
  iconoWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
    marginBottom: 8,
  },
  iconoWrapActiva: { backgroundColor: t.colors.surface },
  emoji: { fontSize: 30 },
  nombre: { fontSize: t.fontSize(12), color: t.colors.textMuted, textAlign: 'center' },
  nombreActiva: { color: t.colors.primary, ...t.typography.fonts.semibold },
}));
