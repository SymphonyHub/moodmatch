jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
    useFocusEffect: (callback) => React.useEffect(callback, [callback]),
    useLocalSearchParams: () => ({ amistadId: '7' }),
    Stack: { Screen: () => null },
  };
});

const mascota = {
  id: 'pet-1',
  amistadId: 7,
  nombre: 'Lumi',
  nivelCarino: 24,
  personalidad: 'curiosa',
  especie: 'perro',
  etapa: { numero: 2, nombre: 'Joven' },
  necesitaAtencion: false,
  puedeCuidar: true,
  reto: null,
  nombrePropuesto: null,
  historialHitos: [],
  accesorios: { desbloqueados: [], cabeza: null, color: null },
};

jest.mock('../services/api', () => ({
  apiGetMascota: jest.fn().mockResolvedValue({ mascota }),
  apiCuidarMascota: jest.fn(),
  apiIniciarRetoMascota: jest.fn(),
  apiProponerNombreMascota: jest.fn(),
  apiRegalarMascota: jest.fn(),
  apiEquiparAccesorioMascota: jest.fn(),
  apiArchivarMascota: jest.fn(),
}));

import React from 'react';
import { act, create } from 'react-test-renderer';
import { router } from 'expo-router';
import MascotaDetalleScreen from '../app/mascota/[amistadId]';
import { ThemeProvider } from '../theme/ThemeContext';
import { TEXTOS_PAUSA } from '../mascota/textosPausa';
import { apiArchivarMascota } from '../services/api';

const montar = async () => {
  let renderer;
  await act(async () => {
    renderer = create(
      <ThemeProvider>
        <MascotaDetalleScreen />
      </ThemeProvider>,
    );
    await Promise.resolve();
  });
  return renderer;
};

const tocar = async (renderer, accessibilityLabel) => {
  const nodo = renderer.root.findAll(
    (n) => n.props?.accessibilityLabel === accessibilityLabel && typeof n.props?.onPress === 'function',
  )[0];
  await act(async () => {
    nodo.props.onPress();
    await Promise.resolve();
  });
};

const textoVisible = (renderer, texto) =>
  renderer.root.findAll((n) => n.props?.children === texto).length > 0;

beforeEach(() => jest.clearAllMocks());

describe('poner la mascota en pausa desde Configuración', () => {
  test('el diálogo solo aparece tras tocar la acción, no antes', async () => {
    const renderer = await montar();

    expect(textoVisible(renderer, TEXTOS_PAUSA.dialogoTitulo('Lumi'))).toBe(false);

    await tocar(renderer, TEXTOS_PAUSA.accion('Lumi'));

    expect(textoVisible(renderer, TEXTOS_PAUSA.dialogoTitulo('Lumi'))).toBe(true);
    expect(textoVisible(renderer, TEXTOS_PAUSA.dialogoTexto)).toBe(true);
    expect(apiArchivarMascota).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  test('confirmar archiva la mascota y deja atrás el detalle', async () => {
    apiArchivarMascota.mockResolvedValue({ archivada: true });
    const renderer = await montar();

    await tocar(renderer, TEXTOS_PAUSA.accion('Lumi'));
    await tocar(renderer, TEXTOS_PAUSA.confirmar);

    expect(apiArchivarMascota).toHaveBeenCalledWith('7');
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/mascota');

    act(() => renderer.unmount());
  });

  test('"Mejor no" cierra el diálogo sin tocar nada', async () => {
    const renderer = await montar();

    await tocar(renderer, TEXTOS_PAUSA.accion('Lumi'));
    await tocar(renderer, TEXTOS_PAUSA.cancelar);

    expect(textoVisible(renderer, TEXTOS_PAUSA.dialogoTitulo('Lumi'))).toBe(false);
    expect(apiArchivarMascota).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  test('si falla, avisa y se queda en el detalle', async () => {
    apiArchivarMascota.mockResolvedValue({ error: 'No hay una mascota activa para esta amistad' });
    const renderer = await montar();

    await tocar(renderer, TEXTOS_PAUSA.accion('Lumi'));
    await tocar(renderer, TEXTOS_PAUSA.confirmar);

    expect(router.replace).not.toHaveBeenCalled();
    expect(textoVisible(renderer, 'No hay una mascota activa para esta amistad')).toBe(true);

    act(() => renderer.unmount());
  });
});

describe('tono de los textos de la pausa', () => {
  const todos = [
    TEXTOS_PAUSA.bloqueTitulo,
    TEXTOS_PAUSA.bloqueTexto,
    TEXTOS_PAUSA.accion('Lumi'),
    TEXTOS_PAUSA.dialogoTitulo('Lumi'),
    TEXTOS_PAUSA.dialogoTexto,
    TEXTOS_PAUSA.cancelar,
    TEXTOS_PAUSA.confirmar,
    TEXTOS_PAUSA.error,
  ].join(' ').toLocaleLowerCase();

  test('no culpa, no advierte ni amenaza con pérdidas', () => {
    const prohibidas = [
      'abandon', 'perderás', 'se perderá', 'para siempre', 'irreversible',
      '¿estás seguro', 'cuidado:', 'atención:', 'no podrás', 'arrepent',
      'deberías', 'tienes que', 'error grave',
    ];
    for (const frase of prohibidas) {
      expect(todos).not.toContain(frase);
    }
  });

  test('promete pausa, no borrado, porque eso es lo que hace', () => {
    expect(todos).not.toContain('eliminar');
    expect(todos).not.toContain('borrar');
    expect(TEXTOS_PAUSA.bloqueTexto).toContain('Sus recuerdos se guardan');
  });

  test('es transparente en que la otra persona se entera y no la aprueba', () => {
    expect(TEXTOS_PAUSA.dialogoTexto).toContain('No necesitas la aprobación de tu amistad');
    expect(TEXTOS_PAUSA.dialogoTexto).toContain('le llegará un aviso');
  });
});
