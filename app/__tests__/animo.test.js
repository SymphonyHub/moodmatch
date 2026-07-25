import fs from 'fs';
import path from 'path';
import { animoDeMascota, TONOS_FONDO } from '../mascota/animation/animo';
import { expresiones } from '../mascota/animation/movimiento';

const racha = (viva, cuidadaHoy = false, dias = 1) => ({ dias: viva ? dias : 0, viva, cuidadaHoy });

describe('la cara de fondo sale del cuidado de la mascota', () => {
  test('sin racha viva, serena', () => {
    expect(animoDeMascota({ nivelCarino: 12, racha: racha(false) })).toBe('serena');
  });

  test('con racha viva, contenta', () => {
    expect(animoDeMascota({ nivelCarino: 12, racha: racha(true) })).toBe('contenta');
  });

  test('cuidada hoy y con vínculo de etapa adulta, radiante', () => {
    expect(animoDeMascota({ nivelCarino: 40, racha: racha(true, true) })).toBe('radiante');
  });

  test('cuidada hoy pero con poco cariño todavía no es radiante', () => {
    expect(animoDeMascota({ nivelCarino: 10, racha: racha(true, true) })).toBe('contenta');
  });

  test('si hace rato que nadie pasa, adormilada — y eso gana sobre todo lo demás', () => {
    expect(animoDeMascota({
      nivelCarino: 99, racha: racha(true, true), necesitaAtencion: true,
    })).toBe('adormilada');
  });

  test('sin datos no explota: cae en serena', () => {
    expect(animoDeMascota()).toBe('serena');
    expect(animoDeMascota({})).toBe('serena');
    expect(animoDeMascota({ nivelCarino: null, racha: null })).toBe('serena');
  });
});

describe('tono: descuidar a la mascota nunca se convierte en un reproche', () => {
  // La racha "nunca culpabiliza" (backend/lib/interaccionesSociales.js) y la
  // mascota sin cuidados "nunca se ve enferma o triste, solo más calmada"
  // (FASE17, Bloque 2). Este test recorre TODA combinación de cuidado posible y
  // exige que ninguna produzca una cara difícil.
  const CARAS_DIFICILES = ['enfurrunada'];

  test('ninguna combinación de cuidado produce una cara difícil', () => {
    for (const nivelCarino of [0, 1, 15, 35, 36, 120]) {
      for (const viva of [true, false]) {
        for (const cuidadaHoy of [true, false]) {
          for (const necesitaAtencion of [true, false]) {
            const tono = animoDeMascota({
              nivelCarino, racha: racha(viva, cuidadaHoy), necesitaAtencion,
            });
            expect(TONOS_FONDO).toContain(tono);
            expect(CARAS_DIFICILES).not.toContain(tono);
          }
        }
      }
    }
  });

  test('lo peor que le puede pasar a una mascota olvidada es dormitar', () => {
    const olvidada = animoDeMascota({ nivelCarino: 0, racha: racha(false), necesitaAtencion: true });
    expect(olvidada).toBe('adormilada');
    // Y dormitar la mueve MENOS, no más: el tratamiento anterior la agitaba, que
    // se leía ansiosa en vez de tranquila.
    expect(expresiones.adormilada.energia).toBeLessThan(expresiones.serena.energia);
  });

  test('la escala de fondo va de apagada a despierta, sin caras difíciles', () => {
    const energias = TONOS_FONDO.map((t) => expresiones[t].energia);
    expect(energias).toEqual([...energias].sort((a, b) => a - b));
    expect(TONOS_FONDO.every((t) => expresiones[t].parpado !== 'ceno')).toBe(true);
  });
});

describe('la mascota no mira el historial de ánimo del usuario', () => {
  // Regla del proyecto: lo que la persona registra sobre cómo se siente solo se
  // refleja donde lo registró explícitamente, sin inferencias (FASE15,
  // CONTRATO-GEMINI.md). La mascota vive del cuidado, no del ánimo de su dueño.

  test('pasarle datos de ánimo no cambia nada de lo que decide', () => {
    const base = { nivelCarino: 20, racha: racha(true) };
    const conAnimo = {
      ...base,
      moodReciente: 'TRISTE',
      historialAnimo: ['TRISTE', 'ANSIOSO', 'ENOJADO'],
      ultimoRegistro: { mood: 'ENOJADO' },
    };
    expect(animoDeMascota(conAnimo)).toBe(animoDeMascota(base));
  });

  test('el módulo no importa nada del historial de ánimo', () => {
    const fuentes = ['../mascota/animation/animo.js', '../mascota/animation/movimiento.js']
      .map((rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8'))
      // Los comentarios explican justamente esta regla y nombran las palabras.
      .map((src) => src.replace(/\/\/.*$/gm, ''));

    for (const src of fuentes) {
      expect(src).not.toMatch(/features\/wellness/);
      expect(src).not.toMatch(/historial/i);
      expect(src).not.toMatch(/\bmood\b/i);
      expect(src).not.toMatch(/CATEGORIAS|FELIZ|TRISTE|ANSIOSO/);
    }
  });
});
