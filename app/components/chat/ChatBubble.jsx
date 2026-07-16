import { Text, View } from 'react-native';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Entrance from '../Entrance';
import MarkdownText from './MarkdownText';

// Resalta en negrita los teléfonos de ayuda dentro del mensaje de crisis.
function TextoCrisis({ texto, styles }) {
  const partes = texto.split(/(\*4141|600 360 7777)/g);
  return (
    <Text style={styles.textoCrisis}>
      {partes.map((parte, i) =>
        /^(\*4141|600 360 7777)$/.test(parte) ? (
          <Text key={i} style={styles.telefono}>{parte}</Text>
        ) : (
          parte
        ),
      )}
    </Text>
  );
}

// Burbuja del chat de emociones. El color de la burbuja del usuario adopta
// el tono suave de la emoción elegida; antes de elegir, usa primarySoft.
export default function ChatBubble({ autor, tipo = 'texto', texto, mood }) {
  const { theme } = useTheme();
  const styles = useStyles();

  if (tipo === 'crisis') {
    return (
      <Entrance style={styles.filaBot} distance={12}>
        <View style={[styles.burbuja, styles.burbujaCrisis]}>
          <TextoCrisis texto={texto} styles={styles} />
        </View>
      </Entrance>
    );
  }

  if (autor === 'usuario') {
    const tinte = mood ? theme.colors.moods[mood] : null;
    return (
      <Entrance style={styles.filaUsuario} distance={12}>
        <View
          style={[
            styles.burbuja,
            styles.burbujaUsuario,
            tinte && { backgroundColor: tinte.soft },
          ]}
        >
          <Text style={[styles.textoUsuario, tinte && { color: tinte.color }]}>{texto}</Text>
        </View>
      </Entrance>
    );
  }

  // El bot puede responder con markdown simple (Gemini); el texto plano de
  // los guiones se renderiza idéntico que antes.
  return (
    <Entrance style={styles.filaBot} distance={12}>
      <View style={[styles.burbuja, styles.burbujaBot]}>
        <MarkdownText texto={texto} style={styles.textoBot} />
      </View>
    </Entrance>
  );
}

const useStyles = makeThemedStyles((t) => ({
  filaBot: { alignItems: 'flex-start', marginBottom: 10 },
  filaUsuario: { alignItems: 'flex-end', marginBottom: 10 },
  burbuja: {
    maxWidth: '84%',
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderRadius: t.shape.radiusLg,
  },
  burbujaBot: {
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    borderBottomLeftRadius: t.shape.radiusSm,
    ...t.shadows.card,
  },
  burbujaUsuario: {
    backgroundColor: t.colors.primarySoft,
    borderBottomRightRadius: t.shape.radiusSm,
  },
  burbujaCrisis: {
    backgroundColor: t.colors.accentSoft,
    borderWidth: t.shape.borderMedium,
    borderColor: t.colors.accent,
    borderBottomLeftRadius: t.shape.radiusSm,
  },
  textoBot: { ...t.typography.type.body, color: t.colors.text },
  textoUsuario: { ...t.typography.type.body, color: t.colors.primary },
  textoCrisis: { ...t.typography.type.body, color: t.colors.text },
  telefono: { ...t.typography.fonts.bold, color: t.colors.text },
}));
