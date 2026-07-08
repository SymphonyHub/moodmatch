import { Stack } from 'expo-router';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, ThemeVeil, useTheme } from '../theme/ThemeContext';

function ThemedStack() {
  const { theme, hydrated } = useTheme();

  // Mantiene el splash visible hasta conocer el tema guardado: evita un flash
  // del tema por defecto cuando el usuario usa otro.
  if (!hydrated) return null;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={theme.statusBar.onBackground} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <ThemeVeil />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedStack />
    </ThemeProvider>
  );
}
