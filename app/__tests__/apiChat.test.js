// apiChatRespond — cliente de POST /api/chat/respond (CONTRATO-GEMINI.md §3).
// A diferencia del resto de api.js, LANZA en !res.ok o respuesta malformada:
// useRetry detecta el fallo por excepción. Shapes desde testing/contratoGemini.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiChatRespond } from '../services/api';
import { API_URL } from '../config';
import {
  respuestaGemini,
  respuestaPlantilla,
  respuestaTerminar,
  error400,
  redCaida,
} from '../testing/contratoGemini';

const respuestaHttp = (body, ok = true) => ({ ok, json: async () => body });

beforeEach(async () => {
  await AsyncStorage.setItem('token', 'token-de-test');
  global.fetch = jest.fn();
});

afterAll(() => {
  delete global.fetch;
});

describe('apiChatRespond', () => {
  test('manda mood, mensaje e historial al endpoint del contrato, con auth', async () => {
    global.fetch.mockResolvedValue(respuestaHttp(respuestaGemini()));
    const historial = [{ autor: 'usuario', texto: '😌 Calmado' }];

    const data = await apiChatRespond('CALMADO', 'hoy dormí bien', historial);

    expect(data).toEqual(respuestaGemini());
    const [url, opciones] = global.fetch.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/chat/respond`);
    expect(opciones.method).toBe('POST');
    expect(opciones.headers.Authorization).toBe('Bearer token-de-test');
    expect(JSON.parse(opciones.body)).toEqual({
      mood: 'CALMADO',
      mensaje: 'hoy dormí bien',
      historial,
    });
  });

  test('historial es opcional: por defecto viaja vacío', async () => {
    global.fetch.mockResolvedValue(respuestaHttp(respuestaGemini()));

    await apiChatRespond('NEUTRO', 'un día normal');

    const [, opciones] = global.fetch.mock.calls[0];
    expect(JSON.parse(opciones.body).historial).toEqual([]);
  });

  test('un 200 con fuente "plantilla" es éxito (fallback transparente, no error)', async () => {
    global.fetch.mockResolvedValue(respuestaHttp(respuestaPlantilla()));

    await expect(apiChatRespond('TRISTE', 'no fue un buen día')).resolves.toEqual(
      respuestaPlantilla(),
    );
  });

  test('un 200 con terminar: true llega intacto al caller', async () => {
    global.fetch.mockResolvedValue(respuestaHttp(respuestaTerminar()));

    const data = await apiChatRespond('FELIZ', 'gracias por escucharme');

    expect(data.terminar).toBe(true);
  });

  test('un 400 del contrato lanza con el mensaje del backend', async () => {
    global.fetch.mockResolvedValue(respuestaHttp(error400(), false));

    await expect(apiChatRespond('OTRO', 'hola')).rejects.toThrow(
      error400().error,
    );
  });

  test('un 200 malformado (sin respuesta string) lanza en vez de propagarse', async () => {
    global.fetch.mockResolvedValue(respuestaHttp({ fuente: 'gemini' }));

    await expect(apiChatRespond('FELIZ', 'hola')).rejects.toThrow(
      'Respuesta inválida del chat',
    );
  });

  test('red caída: el rechazo de fetch se propaga (useRetry decide el reintento)', async () => {
    global.fetch.mockRejectedValue(redCaida());

    await expect(apiChatRespond('ANSIOSO', 'no me carga nada')).rejects.toThrow(
      'Network request failed',
    );
  });
});
