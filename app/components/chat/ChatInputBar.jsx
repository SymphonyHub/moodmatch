import { useState } from 'react';
import { Animated, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../Tappable';
import useKeyboardOffset from './useKeyboardOffset';

/**
 * ChatInputBar — barra de envío compartida de los chats (Fase 9, Prioridad 1).
 *
 * Pieza AISLADA: nadie la monta todavía; los chats de Emociones y Amigos la
 * integran en sus pantallas. Unifica la barra de escritura con manejo correcto
 * de teclado: el campo crece solo con mensajes largos (hasta maxHeight) y el
 * botón de enviar queda siempre visible sobre el teclado, vía
 * [useKeyboardOffset] (ver ahí la causa raíz del bug edge-to-edge).
 *
 * Contrato de integración:
 *
 *   <ChatInputBar
 *     onSend={(texto) => …}        // requerido; recibe el texto ya con trim
 *     placeholder="Escribe…"
 *     disabled={false}              // apaga input y botón (turno del bot)
 *     maxLength={500}
 *     bottomOffset={0}              // alto fijo bajo la barra: alto del tab
 *                                   // bar en Emociones, 0 en Amigos
 *     accessory={<Chips />}         // opcional, se renderiza sobre el input
 *                                   // dentro de la superficie que sube con el
 *                                   // teclado (chips de ánimos rápidos)
 *   />
 *
 * - La pantalla debe QUITAR su KeyboardAvoidingView al integrarla: la barra se
 *   compensa sola en ambas plataformas y un KAV activo duplicaría el empuje.
 * - La barra ya incluye el inset inferior de safe-area en reposo; la pantalla
 *   no debe sumar su propio paddingBottom debajo de ella.
 * - El texto es estado interno: se limpia al enviar; enviar vacío no dispara.
 * - Reemplaza a ChatInput.jsx, que queda obsoleto cuando ambas pantallas
 *   migren (lo retira el integrador).
 */
export default function ChatInputBar({
  onSend,
  placeholder,
  disabled,
  maxLength = 500,
  bottomOffset = 0,
  accessory,
}) {
  const { theme } = useTheme();
  const styles = useStyles();
  const [texto, setTexto] = useState('');
  const paddingInferior = useKeyboardOffset({ bottomOffset });

  const puedeEnviar = texto.trim().length > 0 && !disabled;

  const enviar = () => {
    if (!puedeEnviar) return;
    onSend(texto.trim());
    setTexto('');
  };

  return (
    <Animated.View style={[styles.superficie, { paddingBottom: paddingInferior }]}>
      {accessory}
      <View style={styles.fila}>
        <TextInput
          style={styles.input}
          value={texto}
          onChangeText={setTexto}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textFaint}
          multiline
          maxLength={maxLength}
          editable={!disabled}
          onSubmitEditing={enviar}
        />
        <Tappable
          style={[styles.botonEnviar, !puedeEnviar && styles.botonEnviarDisabled]}
          onPress={enviar}
          disabled={!puedeEnviar}
          accessibilityLabel="Enviar mensaje"
        >
          <Ionicons name="arrow-up" size={22} color={theme.colors.onPrimary} />
        </Tappable>
      </View>
    </Animated.View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  superficie: {
    backgroundColor: t.colors.surface,
    borderTopWidth: t.shape.borderThin,
    borderTopColor: t.colors.border,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
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
}));
