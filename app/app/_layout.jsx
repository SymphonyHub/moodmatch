import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Sora_600SemiBold } from '@expo-google-fonts/sora/600SemiBold';
import { Sora_700Bold } from '@expo-google-fonts/sora/700Bold';
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_500Medium } from '@expo-google-fonts/nunito/500Medium';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Baloo2_400Regular } from '@expo-google-fonts/baloo-2/400Regular';
import { Baloo2_500Medium } from '@expo-google-fonts/baloo-2/500Medium';
import { Baloo2_600SemiBold } from '@expo-google-fonts/baloo-2/600SemiBold';
import { Baloo2_700Bold } from '@expo-google-fonts/baloo-2/700Bold';
import { Rubik_400Regular } from '@expo-google-fonts/rubik/400Regular';
import { Rubik_500Medium } from '@expo-google-fonts/rubik/500Medium';
import { Rubik_600SemiBold } from '@expo-google-fonts/rubik/600SemiBold';
import { Rubik_700Bold } from '@expo-google-fonts/rubik/700Bold';
import { Lora_400Regular } from '@expo-google-fonts/lora/400Regular';
import { Lora_500Medium } from '@expo-google-fonts/lora/500Medium';
import { Lora_600SemiBold } from '@expo-google-fonts/lora/600SemiBold';
import { Lora_700Bold } from '@expo-google-fonts/lora/700Bold';
import { Bitter_400Regular } from '@expo-google-fonts/bitter/400Regular';
import { Bitter_500Medium } from '@expo-google-fonts/bitter/500Medium';
import { Bitter_600SemiBold } from '@expo-google-fonts/bitter/600SemiBold';
import { Bitter_700Bold } from '@expo-google-fonts/bitter/700Bold';
import { Fraunces_400Regular } from '@expo-google-fonts/fraunces/400Regular';
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Fraunces_700Bold } from '@expo-google-fonts/fraunces/700Bold';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ThemeProvider, ThemeVeil, useTheme } from '../theme/ThemeContext';
import { FriendsCountProvider } from '../friends/FriendsCountContext';

// El splash queda visible hasta tener el tema guardado y las fuentes cargadas:
// así el arranque no muestra un flash del tema/tipografía por defecto.
SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedStack() {
  const { theme, hydrated } = useTheme();

  // Solo los pesos que usan los temas (imports por subpath para no inflar el bundle).
  const [fontsLoaded, fontError] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Baloo2_400Regular,
    Baloo2_500Medium,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
    Lora_400Regular,
    Lora_500Medium,
    Lora_600SemiBold,
    Lora_700Bold,
    Bitter_400Regular,
    Bitter_500Medium,
    Bitter_600SemiBold,
    Bitter_700Bold,
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  // Si una fuente fallara (no debería: son assets locales), seguimos con la del sistema.
  const ready = hydrated && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={theme.statusBar.onBackground} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[friendId]" animation="slide_from_right" />
        <Stack.Screen name="add-friend" />
      </Stack>
      <ThemeVeil />
    </View>
  );
}

export default function RootLayout() {
  return (
    // KeyboardProvider alimenta useKeyboardOffset con WindowInsets nativos
    // (edge-to-edge no redimensiona la ventana y los eventos Keyboard de RN
    // fallan en MIUI) — lo más alto posible, como recomienda la librería.
    <KeyboardProvider>
      <ThemeProvider>
        <FriendsCountProvider>
          <ThemedStack />
        </FriendsCountProvider>
      </ThemeProvider>
    </KeyboardProvider>
  );
}
