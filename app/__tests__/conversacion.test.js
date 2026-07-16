import {
  crearConversacion,
  reducer,
  pasoActual,
  quickRepliesDe,
  MAX_INTERCAMBIOS,
} from '../features/emociones/conversacion';
import { GUIONES, ETIQUETAS } from '../features/emociones/guiones';
import { MOOD_KEYS } from '../theme/tokens';

function elegir(estado, mood) {
  return reducer(estado, { tipo: 'ELEGIR_MOOD', mood });
}

function ultimoMensaje(estado) {
  return estado.mensajes[estado.mensajes.length - 1];
}

describe('crearConversacion', () => {
  test('parte en fase saludo con un mensaje bot y chips de mood', () => {
    const conv = crearConversacion(0);
    expect(conv.fase).toBe('saludo');
    expect(conv.mensajes).toHaveLength(1);
    expect(conv.mensajes[0].autor).toBe('bot');
    expect(quickRepliesDe(conv)).toEqual({ tipo: 'moods' });
  });

  test('es determinista con la misma seed y varía con otra', () => {
    expect(crearConversacion(1).mensajes[0].texto).toBe(crearConversacion(1).mensajes[0].texto);
    expect(crearConversacion(0).mensajes[0].texto).not.toBe(crearConversacion(1).mensajes[0].texto);
  });
});

describe('recorrido exhaustivo de todas las ramas de quick replies', () => {
  // DFS sobre el guion vía el reducer real: toda combinación de quick replies
  // debe llegar a la sugerencia con 2..MAX_INTERCAMBIOS inputs del usuario.
  function explorar(estado, camino, visitar) {
    if (estado.fase === 'creandoEntrada') {
      visitar(estado, camino);
      return;
    }
    expect(estado.fase).toBe('conversando');
    const paso = pasoActual(estado);
    expect(paso).not.toBeNull();
    expect(paso.quickReplies?.length).toBeGreaterThan(0);
    paso.quickReplies.forEach((reply) => {
      explorar(
        reducer(estado, { tipo: 'QUICK_REPLY', replyId: reply.id }),
        [...camino, reply.id],
        visitar,
      );
    });
  }

  MOOD_KEYS.forEach((mood) => {
    test(`${mood}: toda rama termina en la sugerencia dentro del máximo`, () => {
      let caminos = 0;
      explorar(elegir(crearConversacion(0), mood), [mood], (final, camino) => {
        caminos += 1;
        expect(final.intercambios).toBeGreaterThanOrEqual(2);
        expect(final.intercambios).toBeLessThanOrEqual(MAX_INTERCAMBIOS);
        expect(final.pasoId).toBe('cierre');
        expect(camino.length).toBe(final.intercambios);
      });
      expect(caminos).toBeGreaterThan(1);
    });
  });
});

describe('texto libre', () => {
  test('se acumula en notas y avanza el paso', () => {
    let conv = elegir(crearConversacion(0), 'TRISTE');
    conv = reducer(conv, { tipo: 'TEXTO_LIBRE', texto: 'discutí con mi mamá' });
    expect(conv.notas).toEqual(['discutí con mi mamá']);
    expect(ultimoMensaje(conv).autor).toBe('bot');
    expect(conv.mensajes.some((m) => m.autor === 'usuario' && m.texto === 'discutí con mi mamá')).toBe(true);
    expect(conv.fase).toBe('creandoEntrada'); // textoLibreNext = cierre
  });

  test('texto vacío o solo espacios se ignora', () => {
    const conv = elegir(crearConversacion(0), 'TRISTE');
    expect(reducer(conv, { tipo: 'TEXTO_LIBRE', texto: '   ' })).toBe(conv);
  });

  test('una frase de crisis inserta el mensaje de crisis una sola vez y el flujo continúa', () => {
    let conv = elegir(crearConversacion(0), 'TRISTE');
    conv = reducer(conv, { tipo: 'TEXTO_LIBRE', texto: 'no quiero seguir viviendo' });
    const crisis = conv.mensajes.filter((m) => m.tipo === 'crisis');
    expect(crisis).toHaveLength(1);
    expect(conv.crisisMostrada).toBe(true);
    // El flujo NO se bloquea: llegó igual a la creación de la entrada.
    expect(conv.fase).toBe('creandoEntrada');
  });

  test('texto sin señales de crisis no inserta el mensaje', () => {
    let conv = elegir(crearConversacion(0), 'TRISTE');
    conv = reducer(conv, { tipo: 'TEXTO_LIBRE', texto: 'estoy muerto de cansancio' });
    expect(conv.mensajes.some((m) => m.tipo === 'crisis')).toBe(false);
  });
});

describe('tope duro de intercambios', () => {
  test('al alcanzar el máximo, cualquier rama salta al cierre', () => {
    let conv = elegir(crearConversacion(0), 'ANSIOSO');
    // Forzamos el contador al máximo con el estado aún en `validacion`.
    conv = { ...conv, intercambios: MAX_INTERCAMBIOS };
    const conFoco = reducer(conv, { tipo: 'QUICK_REPLY', replyId: 'foco' });
    expect(conFoco.pasoId).toBe('cierre');
    expect(conFoco.fase).toBe('creandoEntrada');
  });
});

describe('puente al hub y cierre', () => {
  function llegarAPuente() {
    let conv = elegir(crearConversacion(0), 'CALMADO');
    conv = reducer(conv, { tipo: 'QUICK_REPLY', replyId: 'reserva' });
    expect(conv.fase).toBe('creandoEntrada');
    return reducer(conv, { tipo: 'ENTRADA_CREADA', moodEntryId: 42 });
  }

  test('ENTRADA_CREADA guarda el id y deja el chat en el puente, sin card adentro', () => {
    const conv = llegarAPuente();
    expect(conv.fase).toBe('puente');
    expect(conv.moodEntryId).toBe(42);
    // La sugerencia vive en la pestaña Para mí: ningún mensaje de actividad.
    expect(conv.mensajes.some((m) => m.tipo === 'actividad')).toBe(false);
    // El último mensaje sigue siendo el cierre del guion (el puente).
    expect(ultimoMensaje(conv).autor).toBe('bot');
    expect(quickRepliesDe(conv)).toEqual({ tipo: 'puente' });
  });

  test('ENTRADA_FALLO ofrece reintentar y REINTENTAR_ENTRADA vuelve a crear', () => {
    let conv = elegir(crearConversacion(0), 'NEUTRO');
    conv = reducer(conv, { tipo: 'QUICK_REPLY', replyId: 'reserva' });
    const fallo = reducer(conv, { tipo: 'ENTRADA_FALLO' });
    expect(fallo.fase).toBe('errorEntrada');
    expect(quickRepliesDe(fallo)).toEqual({ tipo: 'reintentar' });
    expect(reducer(fallo, { tipo: 'REINTENTAR_ENTRADA' }).fase).toBe('creandoEntrada');
  });

  test('VER_HUB cierra con eco del usuario y despedida', () => {
    const conv = reducer(llegarAPuente(), { tipo: 'VER_HUB' });
    expect(conv.fase).toBe('cerrado');
    expect(conv.mensajes.some((m) => m.autor === 'usuario' && m.texto === ETIQUETAS.verSugerencia)).toBe(true);
    expect(ultimoMensaje(conv).autor).toBe('bot');
    expect(quickRepliesDe(conv)).toEqual({ tipo: 'reiniciar' });
  });

  test('VER_HUB fuera del puente se ignora', () => {
    const conv = elegir(crearConversacion(0), 'CALMADO');
    expect(reducer(conv, { tipo: 'VER_HUB' })).toBe(conv);
  });

  test('REINICIAR desde el puente vuelve al estado inicial limpio', () => {
    const conv = reducer(llegarAPuente(), { tipo: 'REINICIAR' });
    expect(conv.fase).toBe('saludo');
    expect(conv.mensajes).toHaveLength(1);
    expect(conv.notas).toEqual([]);
    expect(conv.mood).toBeNull();
    expect(conv.moodEntryId).toBeNull();
  });
});

describe('acciones fuera de fase no alteran el estado', () => {
  test('QUICK_REPLY y TEXTO_LIBRE en el saludo se ignoran', () => {
    const conv = crearConversacion(0);
    expect(reducer(conv, { tipo: 'QUICK_REPLY', replyId: 'evento' })).toBe(conv);
    expect(reducer(conv, { tipo: 'TEXTO_LIBRE', texto: 'hola' })).toBe(conv);
  });

  test('ELEGIR_MOOD con mood inválido se ignora', () => {
    const conv = crearConversacion(0);
    expect(reducer(conv, { tipo: 'ELEGIR_MOOD', mood: 'EUFORICO' })).toBe(conv);
  });

  test('las variantes rotan con seeds distintas para el mismo paso', () => {
    const a = elegir(crearConversacion(0), 'TRISTE');
    const b = elegir(crearConversacion(1), 'TRISTE');
    const validacionDe = (c) => c.mensajes[c.mensajes.length - 1].texto;
    expect(GUIONES.TRISTE.pasos.validacion.bot).toContain(validacionDe(a));
    expect(GUIONES.TRISTE.pasos.validacion.bot).toContain(validacionDe(b));
    expect(validacionDe(a)).not.toBe(validacionDe(b));
  });
});
