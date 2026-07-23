import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../theme/ThemeContext';
import TabBar from '../../components/TabBar';
import BotonAjustes from '../../components/profile/BotonAjustes';
import { TABS_PRINCIPALES } from '../../components/tabsConfig';
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
        {TABS_PRINCIPALES.map(({ name, title, tabBarLabel, iconSet }) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title,
              tabBarLabel,
              tabBarIconSet: iconSet,
              // El badge de Amigos depende del polling de arriba; el engranaje
              // del Perfil es la única entrada a Ajustes desde que salió de la barra.
              ...(name === 'amigos' && {
                tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
                tabBarBadgeStyle: {
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.onPrimary,
                  fontSize: 11,
                },
              }),
              ...(name === 'perfil' && {
                headerRight: ({ tintColor }) => <BotonAjustes tintColor={tintColor} />,
              }),
            }}
          />
        ))}
      </Tabs>
    </>
  );
}