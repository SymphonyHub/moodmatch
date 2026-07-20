import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { apiGetMe } from '../services/api';

export default function Index() {
  const { theme } = useTheme();

  useEffect(() => {
    let activo = true;
    AsyncStorage.getItem('token').then(async (token) => {
      if (!activo) return;
      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        const data = await apiGetMe();
        if (!activo) return;
        if (!data.user) {
          await AsyncStorage.removeItem('token');
          router.replace('/login');
        } else {
          router.replace(data.user.perfilPersonalidad ? '/(tabs)/home' : '/onboarding/cuestionario');
        }
      } catch {
        // Conserva el comportamiento offline previo: una sesión local sigue a Inicio.
        if (activo) router.replace('/(tabs)/home');
      }
    });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
      }}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}
