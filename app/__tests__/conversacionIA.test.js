// Acciones IA del reducer de conversación (Fase 8, integración): el turno
// viaja a /api/chat/respond vía fase 'esperandoIA', con escudo de crisis
// resuelto ANTES de despachar (omitirIA/mensajeCrisis llegan en la acción) y
// fallback por plantilla local. Las acciones del guion clásico no se tocan:
// sus invariantes viven en conversacion.test.js.

import {
  crearConversacion,
  reducer,
  quickRepliesDe,
  historialParaIA,
  MAX_INTERCAMBIOS,
  MAX_HISTORIAL_IA,
} from '../features/emociones/conversacion';
import { respuestaPlantilla } from '../features/emociones/plantillas';
import { MENSAJE_CRISIS } from '../features/emociones/crisis';
import { respuestaGemini, respuestaTerminar } from '../testing/contratoGemini';

const SEED = 7;

// Conversación ya en fase 'conversando' (mood elegido, validación del guion).
function conversando(mood = 'TRISTE') {
  return reducer(crearConversacion(SEED), { tipo: 'ELEGIR_MOOD', mood });
}

function enviar(estado, texto, extras = {}) {
  return reducer(estado, {
    tipo: 'ENVIAR_TEXTO_IA', texto, omitirIA: false, mensajeCrisis: null, ...extras,
  });
}

const ultimo = (estado) => estado.mensajes[estado.mensajes.length - 1];

describe('ENVIAR_TEXTO_IA', () => {
  test('agrega la burbuja del usuario y deja el turno en vuelo', () => {
    const antes = conversando();
    const s = enviar(antes, 'hoy fue un día pesado');

    expect(ultimo(s)).toMatchObject({
      autor: 'usuario', tipo: 'texto', texto: 'hoy fue un día pesado',
    });
    expect(s.fase).toBe('esperandoIA');
    expect(s.intercambios).toBe(antes.intercambios + 1);
    expect(s.notas).toContain('hoy fue un día pesado');
    expect(s.pendienteIA.texto).toBe('hoy fue un día pesado');
  });

  test('el historial se congela ANTES de la burbuja nueva (el texto viaja como mensaje)', () => {
    const antes = conversando();
    const s = enviar(antes, 'hoy fue un día pesado');

    expect(s.pendienteIA.historial).toEqual(historialParaIA(antes.mensajes));
    const textos = s.pendienteIA.historial.map((t) => t.texto);
    expect(textos).not.toContain('hoy fue un día pesado');
  });

  test('con omitirIA responde por plantilla local sin pasar por esperandoIA', () => {
    const antes = conversando();
    const s = enviar(antes, 'texto sensible', { omitirIA: true });

    expect(s.fase).toBe('conversando');
    expect(s.pendienteIA).toBeNull();
    expect(ultimo(s)).toMatchObject({
      autor: 'bot',
      tipo: 'texto',
      texto: respuestaPlantilla('TRISTE', s.intercambios, false),
    });
  });

  test('mensajeCrisis agrega la burbuja de crisis (una sola vez) antes de la plantilla', () => {
    const antes = conversando();
    const s1 = enviar(antes, 'texto sensible', {
      omitirIA: true, mensajeCrisis: MENSAJE_CRISIS,
    });

    const crisis = s1.mensajes.filter((m) => m.tipo === 'crisis');
    expect(crisis).toHaveLength(1);
    expect(crisis[0].texto).toBe(MENSAJE_CRISIS);
    expect(s1.crisisMostrada).toBe(true);

    // Turnos siguientes: omitirIA sigue true pero sin burbuja repetida
    // (el escudo manda mensajeCrisis null; la guarda del reducer es doble).
    const s2 = enviar(s1, 'otro texto sensible', { omitirIA: true });
    expect(s2.mensajes.filter((m) => m.tipo === 'crisis')).toHaveLength(1);
  });

  test('al alcanzar MAX_INTERCAMBIOS con omitirIA cierra con plantilla y crea la entrada', () => {
    let s = conversando();
    while (s.intercambios < MAX_INTERCAMBIOS - 1) {
      s = reducer(enviar(s, 'sigo aquí'), {
        tipo: 'IA_RESPONDIO', ...respuestaGemini(),
      });
    }
    s = enviar(s, 'último turno sensible', { omitirIA: true });

    expect(s.intercambios).toBe(MAX_INTERCAMBIOS);
    expect(s.fase).toBe('creandoEntrada');
    expect(ultimo(s).texto).toBe(
      respuestaPlantilla('TRISTE', MAX_INTERCAMBIOS, true),
    );
  });

  test('guardas: fuera de conversando o con texto vacío no hace nada', () => {
    const saludo = crearConversacion(SEED);
    expect(enviar(saludo, 'hola')).toBe(saludo);

    const s = conversando();
    expect(enviar(s, '   ')).toBe(s);
  });
});

describe('IA_RESPONDIO / IA_FALLO / IA_REINTENTAR / SEGUIR_SIN_IA', () => {
  test('IA_RESPONDIO agrega la respuesta como burbuja del bot y libera el turno', () => {
    const enVuelo = enviar(conversando(), 'hoy fue un día pesado');
    const s = reducer(enVuelo, { tipo: 'IA_RESPONDIO', ...respuestaGemini() });

    expect(ultimo(s)).toMatchObject({
      autor: 'bot', tipo: 'texto', texto: respuestaGemini().respuesta,
    });
    expect(s.fase).toBe('conversando');
    expect(s.pendienteIA).toBeNull();
  });

  test('IA_RESPONDIO con terminar: true dispara el registro del MoodEntry', () => {
    const enVuelo = enviar(conversando(), 'gracias por escucharme');
    const s = reducer(enVuelo, { tipo: 'IA_RESPONDIO', ...respuestaTerminar() });

    expect(s.fase).toBe('creandoEntrada');
  });

  test('IA_FALLO conserva pendienteIA y IA_REINTENTAR reenvía el mismo turno', () => {
    const enVuelo = enviar(conversando(), 'hoy fue un día pesado');
    const fallo = reducer(enVuelo, { tipo: 'IA_FALLO' });

    expect(fallo.fase).toBe('iaFallo');
    expect(fallo.pendienteIA).toEqual(enVuelo.pendienteIA);
    expect(quickRepliesDe(fallo)).toEqual({ tipo: 'iaFallo' });

    const reintento = reducer(fallo, { tipo: 'IA_REINTENTAR' });
    expect(reintento.fase).toBe('esperandoIA');
    expect(reintento.pendienteIA).toEqual(enVuelo.pendienteIA);
  });

  test('SEGUIR_SIN_IA responde el turno por plantilla local y la conversación sigue', () => {
    const fallo = reducer(enviar(conversando(), 'hoy fue un día pesado'), {
      tipo: 'IA_FALLO',
    });
    const s = reducer(fallo, { tipo: 'SEGUIR_SIN_IA' });

    expect(s.fase).toBe('conversando');
    expect(s.pendienteIA).toBeNull();
    expect(ultimo(s)).toMatchObject({
      autor: 'bot',
      texto: respuestaPlantilla('TRISTE', s.intercambios, false),
    });
  });

  test('guardas de fase: las acciones IA fuera de su fase no cambian el estado', () => {
    const s = conversando();
    expect(reducer(s, { tipo: 'IA_RESPONDIO', ...respuestaGemini() })).toBe(s);
    expect(reducer(s, { tipo: 'IA_FALLO' })).toBe(s);
    expect(reducer(s, { tipo: 'IA_REINTENTAR' })).toBe(s);
    expect(reducer(s, { tipo: 'SEGUIR_SIN_IA' })).toBe(s);
  });

  test('REINICIAR desde iaFallo limpia el turno pendiente', () => {
    const fallo = reducer(enviar(conversando(), 'hoy fue un día pesado'), {
      tipo: 'IA_FALLO',
    });
    const s = reducer(fallo, { tipo: 'REINICIAR' });

    expect(s.pendienteIA).toBeNull();
    expect(s.fase).toBe('saludo');
  });
});

describe('charla extendida tras el registro (Fase 9)', () => {
  // Arco inicial completo: mood → texto → cierre de la IA → MoodEntry creado.
  function charla(mood = 'TRISTE') {
    const enVuelo = enviar(conversando(mood), 'hoy fue un día pesado');
    const cierre = reducer(enVuelo, { tipo: 'IA_RESPONDIO', ...respuestaTerminar() });
    expect(cierre.fase).toBe('creandoEntrada');
    return reducer(cierre, { tipo: 'ENTRADA_CREADA', moodEntryId: 42 });
  }

  test('ENTRADA_CREADA deja la charla abierta con los chips disponibles', () => {
    const s = charla();
    expect(s.fase).toBe('charla');
    expect(s.registrada).toBe(true);
    expect(quickRepliesDe(s)).toEqual({ tipo: 'charla' });
  });

  test('ENVIAR_TEXTO_IA en charla pone el turno en vuelo sin tocar las notas', () => {
    const antes = charla();
    const s = enviar(antes, 'todavía le doy vueltas');

    expect(s.fase).toBe('esperandoIA');
    expect(ultimo(s)).toMatchObject({ autor: 'usuario', texto: 'todavía le doy vueltas' });
    expect(s.pendienteIA.texto).toBe('todavía le doy vueltas');
    // El MoodEntry ya existe: las notas quedaron congeladas en el arco inicial.
    expect(s.notas).toEqual(antes.notas);
  });

  test('IA_RESPONDIO en charla vuelve a charla e ignora terminar', () => {
    const enVuelo = enviar(charla(), 'todavía le doy vueltas');
    const s = reducer(enVuelo, { tipo: 'IA_RESPONDIO', ...respuestaTerminar() });

    expect(s.fase).toBe('charla');
    expect(s.moodEntryId).toBe(42);
    expect(ultimo(s)).toMatchObject({ autor: 'bot', tipo: 'texto' });
  });

  test('omitirIA en charla responde plantilla `seguir` con burbuja de crisis y nunca cierra', () => {
    const antes = charla();
    const s = enviar(antes, 'texto sensible', {
      omitirIA: true, mensajeCrisis: MENSAJE_CRISIS,
    });

    expect(s.fase).toBe('charla');
    expect(s.mensajes.filter((m) => m.tipo === 'crisis')).toHaveLength(1);
    expect(ultimo(s).texto).toBe(respuestaPlantilla('TRISTE', s.intercambios, false));
  });

  test('SEGUIR_SIN_IA en charla también responde con `seguir` y sigue en charla', () => {
    const fallo = reducer(enviar(charla(), 'sigo aquí'), { tipo: 'IA_FALLO' });
    expect(quickRepliesDe(fallo)).toEqual({ tipo: 'iaFallo' });

    const s = reducer(fallo, { tipo: 'SEGUIR_SIN_IA' });
    expect(s.fase).toBe('charla');
    expect(ultimo(s).texto).toBe(respuestaPlantilla('TRISTE', s.intercambios, false));
  });

  test('la charla no tiene tope: sigue viva pasado MAX_INTERCAMBIOS', () => {
    let s = charla();
    for (let i = 0; i < MAX_INTERCAMBIOS + 2; i++) {
      s = reducer(enviar(s, `mensaje libre ${i}`), {
        tipo: 'IA_RESPONDIO', ...respuestaGemini(),
      });
      expect(s.fase).toBe('charla');
    }
    expect(s.intercambios).toBeGreaterThan(MAX_INTERCAMBIOS);
  });

  test('REINICIAR desde la charla inicia una sesión nueva limpia', () => {
    const s = reducer(charla(), { tipo: 'REINICIAR' });
    expect(s.fase).toBe('saludo');
    expect(s.registrada).toBe(false);
    expect(s.moodEntryId).toBeNull();
  });
});

describe('historialParaIA', () => {
  test('shape del contrato, sin burbujas de crisis y truncado a los últimos 8', () => {
    const mensajes = [
      { id: 1, autor: 'bot', tipo: 'texto', texto: 'saludo' },
      { id: 2, autor: 'usuario', tipo: 'texto', texto: '😔 Triste' },
      { id: 3, autor: 'bot', tipo: 'crisis', texto: 'burbuja de crisis' },
      ...Array.from({ length: MAX_HISTORIAL_IA }, (_, i) => ({
        id: 4 + i,
        autor: i % 2 ? 'bot' : 'usuario',
        tipo: 'texto',
        texto: `turno ${i}`,
      })),
    ];

    const historial = historialParaIA(mensajes);

    expect(historial).toHaveLength(MAX_HISTORIAL_IA);
    expect(historial.every((t) => t.texto !== 'burbuja de crisis')).toBe(true);
    expect(historial[0]).toEqual({ autor: 'usuario', texto: 'turno 0' });
    expect(Object.keys(historial[0])).toEqual(['autor', 'texto']);
  });

  test('incluye el pseudo-turno del mood: el conteo del backend queda alineado', () => {
    // Backend: terminar = turnosUsuario(historial) + 1 >= MAX_INTERCAMBIOS.
    // Al enviar el intercambio MAX (mood + 3 textos), el historial congelado
    // debe traer MAX - 1 turnos de usuario.
    let s = conversando();
    while (s.intercambios < MAX_INTERCAMBIOS - 1) {
      s = reducer(enviar(s, 'sigo aquí'), {
        tipo: 'IA_RESPONDIO', ...respuestaGemini(),
      });
    }
    s = enviar(s, 'cierre');

    expect(s.intercambios).toBe(MAX_INTERCAMBIOS);
    const turnosUsuario = s.pendienteIA.historial.filter(
      (t) => t.autor === 'usuario',
    ).length;
    expect(turnosUsuario).toBe(MAX_INTERCAMBIOS - 1);
  });
});
