// Smoke test: la pantalla de emociones y los componentes del chat importan
// sin errores (rutas, sintaxis JSX y dependencias). No se renderiza nada.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import HomeScreen from '../app/(tabs)/home';
import ChatBubble from '../components/chat/ChatBubble';
import QuickReplies from '../components/chat/QuickReplies';
import TypingIndicator from '../components/chat/TypingIndicator';
import ChatInput from '../components/chat/ChatInput';
import MarkdownText from '../components/chat/MarkdownText';
import FallbackMessage from '../components/chat/FallbackMessage';
import useAutoScroll from '../components/chat/useAutoScroll';
import { useCrisisShield } from '../features/emociones/useCrisisShield';
import { useRetry } from '../features/emociones/useRetry';
import { apiChatRespond } from '../services/api';

test('la pantalla y los componentes del chat exportan componentes', () => {
  [
    HomeScreen, ChatBubble, QuickReplies, TypingIndicator, ChatInput,
    MarkdownText, FallbackMessage,
  ].forEach((Componente) => {
    expect(typeof Componente).toBe('function');
  });
});

test('los hooks y el cliente del chat con IA exportan funciones', () => {
  [useAutoScroll, useCrisisShield, useRetry, apiChatRespond].forEach((fn) => {
    expect(typeof fn).toBe('function');
  });
});
