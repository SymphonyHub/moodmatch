// Composición de la barra inferior (components/tabsConfig.js). Fija el cambio
// de Fase 16: Perfil ocupa el lugar que tenía Ajustes, y Ajustes sale de la barra.
import { TABS_PRINCIPALES } from '../components/tabsConfig';

const nombres = TABS_PRINCIPALES.map((t) => t.name);

test('la barra tiene 6 destinos en el orden esperado', () => {
  expect(nombres).toEqual(['home', 'actividades', 'mascota', 'amigos', 'mi-qr', 'perfil']);
});

test('Perfil es el último destino y Ajustes ya no está en la barra', () => {
  expect(nombres[nombres.length - 1]).toBe('perfil');
  expect(nombres).not.toContain('ajustes');
});

test('cada destino declara etiqueta, título e íconos de ambas variantes', () => {
  TABS_PRINCIPALES.forEach((tab) => {
    expect(tab.title).toBeTruthy();
    expect(tab.tabBarLabel).toBeTruthy();
    expect(tab.iconSet.outline).toBeTruthy();
    expect(tab.iconSet.filled).toBeTruthy();
  });
});
