import {
  crearInvitacion,
  crearRespuesta,
  clasificar,
  estaRespondida,
} from '../friends/invitacionSalida';

describe('crear / clasificar', () => {
  test('la invitación se clasifica como invitacion y su texto no lleva sentinel', () => {
    const msg = crearInvitacion();
    const { tipo, texto } = clasificar(msg);
    expect(tipo).toBe('invitacion');
    expect(texto).not.toContain('[[mm');
    expect(texto.length).toBeGreaterThan(0);
  });

  test('respuesta aceptar / rechazar se clasifican con su tipo', () => {
    expect(clasificar(crearRespuesta(true)).tipo).toBe('aceptar');
    expect(clasificar(crearRespuesta(false)).tipo).toBe('rechazar');
  });

  test('un mensaje normal es texto y se muestra tal cual', () => {
    expect(clasificar('hola qué tal')).toEqual({ tipo: 'texto', texto: 'hola qué tal' });
  });

  test('entrada no-string no rompe', () => {
    expect(clasificar(undefined)).toEqual({ tipo: 'texto', texto: '' });
  });
});

describe('estaRespondida', () => {
  // La invitación la envía el usuario A (mine:true en su hilo); el receptor B
  // responde. Aquí modelamos el hilo del RECEPTOR: la invitación es entrante
  // (mine:false) y su respuesta es propia (mine:true).
  const invitacion = { id: 1, mine: false, message: crearInvitacion() };

  test('sin respuesta todavía → false (se muestran los botones)', () => {
    const mensajes = [invitacion, { id: 2, mine: false, message: 'otra cosa' }];
    expect(estaRespondida(mensajes, invitacion)).toBe(false);
  });

  test('respuesta propia posterior → true', () => {
    const mensajes = [invitacion, { id: 2, mine: true, message: crearRespuesta(true) }];
    expect(estaRespondida(mensajes, invitacion)).toBe(true);
  });

  test('un texto normal posterior NO cuenta como respuesta', () => {
    const mensajes = [invitacion, { id: 2, mine: true, message: 'jaja gracias' }];
    expect(estaRespondida(mensajes, invitacion)).toBe(false);
  });

  test('una respuesta anterior a la invitación no cuenta (orden temporal)', () => {
    const mensajes = [
      { id: 0, mine: true, message: crearRespuesta(false) },
      invitacion,
    ];
    expect(estaRespondida(mensajes, invitacion)).toBe(false);
  });

  test('en el hilo del EMISOR (invitación propia), la respuesta entrante cuenta', () => {
    const propia = { id: 5, mine: true, message: crearInvitacion() };
    const mensajes = [propia, { id: 6, mine: false, message: crearRespuesta(false) }];
    expect(estaRespondida(mensajes, propia)).toBe(true);
  });

  test('invitación ausente de la lista → false', () => {
    expect(estaRespondida([{ id: 9, mine: true, message: 'x' }], invitacion)).toBe(false);
  });
});
