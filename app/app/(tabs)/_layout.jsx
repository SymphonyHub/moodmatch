import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';

const TAB_ICONS = {
  home: { outline: 'home-outline', filled: 'home' },
  amigos: { outline: 'people-outline', filled: 'people' },
  'mi-qr': { outline: 'qr-code-outline', filled: 'qr-code' },
  ajustes: { outline: 'settings-outline', filled: 'settings' },
};

// Variante según tema: los temas "outline" rellenan solo la tab activa;
// los temas "filled" (Fiesta) usan íconos rellenos siempre.
const tabIcon = (route, variant) =>
  function TabIcon({ color, size, focused }) {
    const icons = TAB_ICONS[route];
    const name = variant === 'filled' || focused ? icons.filled : icons.outline;
    return <Ionicons name={name} size={size ?? 22} color={color} />;
  };

export default function TabsLayout() {
  const { theme } = useTheme();
  const variant = theme.icons.variant;

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
          headerTitleStyle: { ...theme.typography.type.title },
          sceneStyle: { backgroundColor: theme.colors.background },
          animation: 'shift',
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Estado de ánimo',
            tabBarLabel: 'Inicio',
            tabBarIcon: tabIcon('home', variant),
          }}
        />
        <Tabs.Screen
          name="amigos"
          options={{
            title: 'Amigos',
            tabBarLabel: 'Amigos',
            tabBarIcon: tabIcon('amigos', variant),
          }}
        />
        <Tabs.Screen
          name="mi-qr"
          options={{
            title: 'Mi QR',
            tabBarLabel: 'Mi QR',
            tabBarIcon: tabIcon('mi-qr', variant),
          }}
        />
        <Tabs.Screen
          name="ajustes"
          options={{
            title: 'Ajustes',
            tabBarLabel: 'Ajustes',
            tabBarIcon: tabIcon('ajustes', variant),
          }}
        />
      </Tabs>
    </>
  );
}
