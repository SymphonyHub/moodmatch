// Definición de la barra inferior, en orden de aparición. Vive aparte del
// layout para poder verificar la composición de la barra sin renderizar el
// navegador (app/__tests__/tabsConfig.test.js).
//
// Ajustes NO está aquí a propósito: cuelga del Perfil como pantalla push
// (app/ajustes/index.jsx), no de la barra.
export const TABS_PRINCIPALES = [
  {
    name: 'home',
    title: 'Estado de ánimo',
    tabBarLabel: 'Inicio',
    iconSet: { outline: 'home-outline', filled: 'home' },
  },
  {
    name: 'actividades',
    title: 'Actividades',
    tabBarLabel: 'Actividades',
    iconSet: { outline: 'sparkles-outline', filled: 'sparkles' },
  },
  {
    name: 'mascota',
    title: 'Mascota',
    tabBarLabel: 'Mascota',
    iconSet: { outline: 'paw-outline', filled: 'paw' },
  },
  {
    name: 'amigos',
    title: 'Amigos',
    tabBarLabel: 'Amigos',
    iconSet: { outline: 'people-outline', filled: 'people' },
  },
  {
    name: 'mi-qr',
    title: 'Mi QR',
    tabBarLabel: 'Mi QR',
    iconSet: { outline: 'qr-code-outline', filled: 'qr-code' },
  },
  {
    name: 'perfil',
    title: 'Mi perfil',
    tabBarLabel: 'Perfil',
    iconSet: { outline: 'person-outline', filled: 'person' },
  },
];
