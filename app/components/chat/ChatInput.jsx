import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../Tappable';

// Entrada de texto libre del chat. Visible solo en pasos con textoLibre: true.
export default function ChatInput({ onSend, placeholder, disabled }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const [texto, setTexto] = useState('');

  const puedeEnviar = texto.trim().length > 0 && !disabled;

  const enviar = () => {
    if (!puedeEnviar) return;
    onSend(texto.trim());
    setTexto('');
  };

  return (
    <View style={styles.barra}>
      <TextInput
        style={styles.input}
        value={texto}
        onChangeText={setTexto}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textFaint}
        multiline
        maxLength={500}
        editable={!disabled}
        onSubmitEditing={enviar}
      />
      <Tappable
        style={[styles.botonEnviar, !puedeEnviar && styles.botonEnviarDisabled]}
        onPress={enviar}
        disabled={!puedeEnviar}
        accessibilityLabel="Enviar mensaje"
      >
        <Text style={styles.iconoEnviar}>➤</Text>
      </Tappable>
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  barra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: t.colors.surface,
    borderTopWidth: t.shape.borderThin,
    borderTopColor: t.colors.border,
  },
  input: {
    flex: 1,
    ...t.typography.type.body,
    color: t.colors.text,
    backgroundColor: t.colors.background,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    borderRadius: t.shape.radiusXl,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 110,
  },
  botonEnviar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonEnviarDisabled: { backgroundColor: t.colors.primaryDisabled },
  iconoEnviar: {
    color: t.colors.onPrimary,
    fontSize: t.fontSize(17),
    marginLeft: 2,
  },
}));
