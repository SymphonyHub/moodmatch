import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../theme/ThemeContext';
import TabBar from '../../components/TabBar';

export default function TabsLayout() {
  const { theme } = useTheme();

  return (
    <>
      <StatusBar style={theme.statusBar.onHeader} />
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.headerBackground },
          headerShadowVisible: false,
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
            tabBarIconSet: { outline: 'home-outline', filled: 'home' },
          }}
        />
        <Tabs.Screen
          name="amigos"
          options={{
            title: 'Amigos',
            tabBarLabel: 'Amigos',
            tabBarIconSet: { outline: 'people-outline', filled: 'people' },
          }}
        />
        <Tabs.Screen
          name="mi-qr"
          options={{
            title: 'Mi QR',
            tabBarLabel: 'Mi QR',
            tabBarIconSet: { outline: 'qr-code-outline', filled: 'qr-code' },
          }}
        />
        <Tabs.Screen
          name="ajustes"
          options={{
            title: 'Ajustes',
            tabBarLabel: 'Ajustes',
            tabBarIconSet: { outline: 'settings-outline', filled: 'settings' },
          }}
        />
      </Tabs>
    </>
  );
}
