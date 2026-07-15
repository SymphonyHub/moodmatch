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
import ActivitySuggestionCard from '../components/chat/ActivitySuggestionCard';

test('la pantalla y los componentes del chat exportan componentes', () => {
  [HomeScreen, ChatBubble, QuickReplies, TypingIndicator, ChatInput, ActivitySuggestionCard]
    .forEach((Componente) => {
      expect(typeof Componente).toBe('function');
    });
});
