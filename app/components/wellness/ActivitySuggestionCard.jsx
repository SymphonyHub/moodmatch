import { Text, View } from 'react-native';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '../../constants/categories';
import Tappable from '../Tappable';
import Entrance from '../Entrance';

// Etiqueta local: wellness no depende de los guiones del chat.
const ETIQUETA_OTRA_IDEA = 'Quiero otra idea';

// Card de sugerencia de actividad para la pestaña "Para mí" del Wellness
// Hub. Misma anatomía que tenía dentro del chat (borde por categoría, tag,
// nombre, descripción) pero sin cierre de conversación: aquí solo se puede
// pedir otra idea.
export default function ActivitySuggestionCard({ actividad, onOtraIdea, loadingOtra }) {
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
            {loadingOtra ? 'Buscando...' : ETIQUETA_OTRA_IDEA}
          </Text>
        </Tappable>
      </View>
    </Entrance>
  );
}

const useStyles = makeThemedStyles((t) => ({
  fila: { alignItems: 'stretch' },
  card: {
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.shape.radiusLg,
    padding: 24,
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
    marginBottom: 8,
  },
  desc: {
    ...t.typography.type.body,
    color: t.colors.textMuted,
    marginBottom: 16,
  },
  btnOtra: {
    borderWidth: t.shape.borderMedium,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnOtraText: {
    ...t.typography.fonts.semibold,
    fontSize: t.fontSize(15),
  },
  btnDeshabilitado: { opacity: 0.6 },
}));
