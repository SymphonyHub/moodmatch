import { useState } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import {
  CATEGORY_IONICONS,
  DEFAULT_CATEGORY_IONICON,
} from '../../constants/categories';
import Tappable from '../Tappable';
import Entrance from '../Entrance';
import RecompensaCompletada from './RecompensaCompletada';

// Etiqueta local: wellness no depende de los guiones del chat.
const ETIQUETA_OTRA_IDEA = 'Quiero otra idea';

// Card de sugerencia de actividad para la pestaña "Para mí" del Wellness Hub.
// Además de "quiero otra idea", permite marcar la actividad como hecha con una
// celebración discreta (RecompensaCompletada). El estado `completada` lo maneja
// el contenedor (ParaMiTab) y lo persiste localmente; esta card solo pinta el
// estado y avisa por `onCompletar`. Props de completar opcionales: sin ellas la
// card sigue funcionando como antes (compatible hacia atrás).
export default function ActivitySuggestionCard({
  actividad,
  onOtraIdea,
  loadingOtra,
  completada = false,
  onCompletar,
}) {
  const { theme } = useTheme();
  const styles = useStyles();
  const [celebrando, setCelebrando] = useState(false);

  const color = theme.colors.categories[actividad.categoria] ?? theme.colors.textMuted;
  const icon = CATEGORY_IONICONS[actividad.categoria] ?? DEFAULT_CATEGORY_IONICON;

  // Solo anima cuando se marca en vivo; si ya venía completada de antes, se
  // muestra el estado final sin celebración.
  const handleHice = () => {
    if (completada) return;
    setCelebrando(true);
    onCompletar?.();
  };

  return (
    <Entrance key={actividad.id} style={styles.fila}>
      <View style={[styles.card, { borderLeftColor: color }]}>
        <View style={styles.tag}>
          <Ionicons name={completada ? 'checkmark' : icon} size={18} color={color} />
          <Text style={[styles.tagText, { color }]}>{actividad.categoria.toUpperCase()}</Text>
        </View>
        <Text style={styles.nombre}>{actividad.nombre}</Text>
        <Text style={styles.desc}>{actividad.descripcion}</Text>

        <View style={styles.acciones}>
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

        {celebrando && (
          <View style={styles.overlay} pointerEvents="none">
            <RecompensaCompletada onFin={() => setCelebrando(false)} />
          </View>
        )}
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
    ...t.shadows.card,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: t.fontSize(11),
    ...t.typography.fonts.bold,
    letterSpacing: 1.2,
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
  acciones: {
    flexDirection: 'row',
    gap: 10,
  },
  btnHice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 12,
  },
  btnHecha: { backgroundColor: t.colors.primarySoft },
  btnHiceText: {
    ...t.typography.fonts.semibold,
    fontSize: t.fontSize(15),
  },
  btnOtra: {
    flex: 1,
    borderWidth: t.shape.borderMedium,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOtraText: {
    ...t.typography.fonts.semibold,
    fontSize: t.fontSize(15),
  },
  btnDeshabilitado: { opacity: 0.6 },
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
