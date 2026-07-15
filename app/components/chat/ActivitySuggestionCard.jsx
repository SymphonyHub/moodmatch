import { Text, View } from 'react-native';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '../../constants/categories';
import { ETIQUETAS } from '../../features/emociones/guiones';
import Tappable from '../Tappable';
import Entrance from '../Entrance';

// La sugerencia de actividad como mensaje del chat: misma card de siempre
// (borde por categoría, tag, nombre, descripción) + acciones del flujo.
export default function ActivitySuggestionCard({ actividad, onOtraIdea, onAceptar, loadingOtra }) {
  const { theme } = useTheme();
  const styles = useStyles();

  const color = theme.colors.categories[actividad.categoria] ?? theme.colors.textMuted;
  const icon = CATEGORY_ICONS[actividad.categoria] ?? DEFAULT_CATEGORY_ICON;

  return (
    <Entrance key={actividad.id} style={styles.fila}>
      <View style={[styles.card, { borderLeftColor: color }]}>
        <Text style={[styles.tag, { color }]}>
          {icon}{'  '}{actividad.categoria.toUpperCase()}
        </Text>
        <Text style={styles.nombre}>{actividad.nombre}</Text>
        <Text style={styles.desc}>{actividad.descripcion}</Text>

        <Tappable
          style={[styles.btnOtra, { borderColor: color }, loadingOtra && styles.btnDeshabilitado]}
          onPress={onOtraIdea}
          disabled={loadingOtra}
          haptic={false}
        >
          <Text style={[styles.btnOtraText, { color: loadingOtra ? theme.colors.textFaint : color }]}>
            {loadingOtra ? 'Buscando...' : ETIQUETAS.otraIdea}
          </Text>
        </Tappable>

        <Tappable style={styles.btnAceptar} onPress={onAceptar} disabled={loadingOtra}>
          <Text style={styles.btnAceptarText}>{ETIQUETAS.aceptarActividad}</Text>
        </Tappable>
      </View>
    </Entrance>
  );
}

const useStyles = makeThemedStyles((t) => ({
  fila: { alignItems: 'stretch', marginBottom: 10 },
  card: {
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.shape.radiusLg,
    padding: 22,
    borderLeftWidth: 5,
    ...t.shadows.cardStrong,
  },
  tag: {
    fontSize: t.fontSize(11),
    ...t.typography.fonts.bold,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  nombre: {
    ...t.typography.type.title,
    color: t.colors.text,
    marginBottom: 10,
  },
  desc: {
    ...t.typography.type.body,
    color: t.colors.textMuted,
    marginBottom: 18,
  },
  btnOtra: {
    borderWidth: t.shape.borderMedium,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnOtraText: {
    ...t.typography.fonts.semibold,
    fontSize: t.fontSize(15),
  },
  btnAceptar: {
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnAceptarText: {
    color: t.colors.onPrimary,
    ...t.typography.fonts.bold,
    fontSize: t.fontSize(15),
  },
  btnDeshabilitado: { opacity: 0.6 },
}));
