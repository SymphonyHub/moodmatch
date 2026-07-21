import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../theme/ThemeContext';
import TabBar from '../../components/TabBar';
import { apiGetUnreadCount } from '../../services/api';

const UNREAD_POLL_MS = 30000;

export default function TabsLayout() {
  const { theme } = useTheme();

  // Mensajes sin leer: alimenta el badge de la pestaña Amigos.
  // Polling suave; el conteo fino por amigo se ve dentro de la pestaña.
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let activo = true;
    const refrescar = () => {
      apiGetUnreadCount()
        .then((data) => {
          if (activo && typeof data.count === 'number') setUnread(data.count);
        })
        .catch(() => {});
    };
    refrescar();
    const timer = setInterval(refrescar, UNREAD_POLL_MS);
    return () => {
      activo = false;
      clearInterval(timer);
    };
  }, []);

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
          name="actividades"
          options={{
            title: 'Actividades',
            tabBarLabel: 'Actividades',
            tabBarIconSet: { outline: 'sparkles-outline', filled: 'sparkles' },
          }}
        />
        <Tabs.Screen
          name="mascota"
          options={{
            title: 'Mascota',
            tabBarLabel: 'Mascota',
            tabBarIconSet: { outline: 'paw-outline', filled: 'paw' },
          }}
        />
        <Tabs.Screen
          name="amigos"
          options={{
            title: 'Amigos',
            tabBarLabel: 'Amigos',
            tabBarIconSet: { outline: 'people-outline', filled: 'people' },
            tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
            tabBarBadgeStyle: {
              backgroundColor: theme.colors.primary,
              color: theme.colors.onPrimary,
              fontSize: 11,
            },
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