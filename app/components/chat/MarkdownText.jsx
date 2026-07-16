import { Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { parsearMarkdown } from './markdown';

// Texto de burbuja con markdown simple (ver markdown.js). Recibe el estilo
// base de la burbuja (color y fuente del tema) y lo hereda en cada span:
// la negrita y el énfasis solo cambian la familia tipográfica del tema
// activo — no hay rol itálico en los temas, el énfasis usa semibold.
export default function MarkdownText({ texto, style }) {
  const { theme } = useTheme();
  const bloques = parsearMarkdown(texto);

  const estiloDeSpan = {
    negrita: theme.typography.fonts.bold,
    enfasis: theme.typography.fonts.semibold,
  };

  return (
    <View>
      {bloques.map((bloque, i) => (
        <Text
          key={i}
          style={[style, i > 0 && { marginTop: 4 }, bloque.tipo === 'item' && { paddingLeft: 8 }]}
        >
          {bloque.tipo === 'item' ? '•  ' : null}
          {bloque.spans.map((span, j) =>
            span.estilo === 'normal' ? (
              span.texto
            ) : (
              <Text key={j} style={estiloDeSpan[span.estilo]}>
                {span.texto}
              </Text>
            ),
          )}
        </Text>
      ))}
    </View>
  );
}
