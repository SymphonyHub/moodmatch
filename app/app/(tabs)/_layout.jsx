import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../theme/ThemeContext';

export default function TabsLayout() {
  const { theme } = useTheme();

  return (
    <>
      <StatusBar style={theme.statusBar.onHeader} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.colors.tabActive,
          tabBarInactiveTintColor: theme.colors.tabInactive,
          tabBarStyle: {
            backgroundColor: theme.colors.tabBarBackground,
            borderTopColor: theme.colors.tabBarBorder,
          },
          headerStyle: { backgroundColor: theme.colors.headerBackground },
          headerTintColor: theme.colors.onHeader,
          headerTitleStyle: { ...theme.typography.fonts.bold },
          sceneStyle: { backgroundColor: theme.colors.background },
          animation: 'shift',
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Estado de ánimo',
            tabBarLabel: 'Inicio',
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>,
          }}
        />
        <Tabs.Screen
          name="amigos"
          options={{
            title: 'Amigos',
            tabBarLabel: 'Amigos',
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>👥</Text>,
          }}
        />
        <Tabs.Screen
          name="mi-qr"
          options={{
            title: 'Mi QR',
            tabBarLabel: 'Mi QR',
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>📱</Text>,
          }}
        />
        <Tabs.Screen
          name="ajustes"
          options={{
            title: 'Ajustes',
            tabBarLabel: 'Ajustes',
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚙️</Text>,
          }}
        />
      </Tabs>
    </>
  );
}
