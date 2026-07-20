jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

import { colorAnilloRacha } from '../components/profile/Avatar';
import EmptyFriendsIllustration from '../components/friends/EmptyFriendsIllustration';
import { varianteCelebracion } from '../components/wellness/RecompensaCompletada';
import { scaleThemeText } from '../theme/ThemeContext';
import { THEMES } from '../theme/themes';

describe('pulido visual', () => {
  test('el estado vacío de Amigos tiene una ilustración vectorial propia', () => {
    expect(typeof EmptyFriendsIllustration).toBe('function');
  });

  test('agrupa las categorías en celebraciones visualmente distintas', () => {
    expect(varianteCelebracion('mindfulness')).toBe('calma');
    expect(varianteCelebracion('físico')).toBe('energia');
    expect(varianteCelebracion('creativo')).toBe('creatividad');
    expect(varianteCelebracion('social')).toBe('social');
  });

  test('el anillo de racha destaca hitos largos con el acento del tema', () => {
    expect(colorAnilloRacha(1, THEMES.sereno)).toBe(THEMES.sereno.colors.primary);
    expect(colorAnilloRacha(7, THEMES.sereno)).toBe(THEMES.sereno.colors.accent);
  });

  test('el modo de texto grande escala presets y tamaños puntuales sin mutar el tema', () => {
    const scaled = scaleThemeText(THEMES.sereno, 1.2);
    expect(scaled.typography.type.body.fontSize).toBe(18);
    expect(scaled.typography.type.body.lineHeight).toBe(28);
    expect(scaled.fontSize(15)).toBe(18);
    expect(THEMES.sereno.typography.type.body.fontSize).toBe(15);
  });
});
