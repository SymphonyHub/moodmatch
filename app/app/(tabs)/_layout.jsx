import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const GREEN = '#2e7d32';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: GREEN,
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { borderTopColor: '#e0e0e0' },
        headerStyle: { backgroundColor: GREEN },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
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
    </Tabs>
  );
}
