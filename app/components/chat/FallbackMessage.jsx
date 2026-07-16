import { Text, View } from 'react-native';
import { makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../Tappable';
import Entrance from '../Entrance';
import { ETIQUETAS } from '../../features/emociones/guiones';

// Burbuja para cuando la IA no está disponible (Fase 8) — pieza AISLADA:
// ninguna pantalla la importa todavía; la integra el implementador del chat
// cuando useRetry() agota los reintentos (resultado.ok === false). Es la cara
// amable del fallback: la app nunca muestra un error del modelo
// (CONTRATO-GEMINI.md §3). El texto respeta las reglas de tono de tono.js y
// no incluye teléfonos: esos son exclusivos de MENSAJE_CRISIS.
export const TEXTO_FALLBACK =
  'Estoy tomando un respiro para reconectarme. Mientras tanto, sigo aquí ' +
  'contigo: cuéntame más y seguimos con calma.';

export default function FallbackMessage({ texto = TEXTO_FALLBACK, onReintentar }) {
  const styles = useStyles();

  return (
    <Entrance style={styles.fila} distance={12}>
      <View style={styles.burbuja}>
        <Text style={styles.texto}>{texto}</Text>
      </View>
      {onReintentar ? (
        <Tappable style={styles.chip} onPress={onReintentar} activeOpacity={0.8}>
          <Text style={styles.chipLabel}>{ETIQUETAS.reintentar}</Text>
        </Tappable>
      ) : null}
    </Entrance>
  );
}

const useStyles = makeThemedStyles((t) => ({
  fila: { alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  burbuja: {
    maxWidth: '84%',
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderRadius: t.shape.radiusLg,
    borderBottomLeftRadius: t.shape.radiusSm,
    backgroundColor: t.colors.accentSoft,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
  },
  texto: { ...t.typography.type.body, color: t.colors.text },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderMedium,
    borderColor: t.colors.primarySoftBorder,
    borderRadius: t.shape.radiusXl,
    paddingVertical: 9,
    paddingHorizontal: 14,
    ...t.shadows.card,
  },
  chipLabel: {
    ...t.typography.fonts.semibold,
    fontSize: t.fontSize(14),
    color: t.colors.primary,
  },
}));
