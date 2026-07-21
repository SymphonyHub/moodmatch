import { clasificarSeccion } from '../mascota/seccionMascota';

const mascotaActiva = (amistadId, extra = {}) => ({
  amistadId, nombre: 'Lumi', nivelCarino: 10, etapa: { numero: 1, nombre: 'Cachorro' }, ...extra,
});
const invite = (amistadId, nombre) => ({ amistadId, nombre });

describe('clasificarSeccion', () => {
  test('sin amigos en ninguna categoría → estado vacío', () => {
    expect(clasificarSeccion({}).modo).toBe('sin-amigos');
    expect(clasificarSeccion({
      mascotas: [], invitaciones: { recibidas: [], enviadas: [] }, amigosElegibles: [],
    }).modo).toBe('sin-amigos');
  });

  test('una sola mascota y nada más → salta directo al detalle', () => {
    const res = clasificarSeccion({ mascotas: [mascotaActiva(7)], amigosElegibles: [] });
    expect(res.modo).toBe('detalle-directo');
    expect(res.amistadId).toBe(7);
  });

  test('una mascota pero con amigos por invitar → muestra la lista, no salta', () => {
    const res = clasificarSeccion({
      mascotas: [mascotaActiva(7)],
      amigosElegibles: [invite(9, 'Dani')],
    });
    expect(res.modo).toBe('lista');
  });

  test('una mascota pero con una invitación pendiente → muestra la lista', () => {
    const res = clasificarSeccion({
      mascotas: [mascotaActiva(7)],
      invitaciones: { recibidas: [invite(9, 'Dani')], enviadas: [] },
    });
    expect(res.modo).toBe('lista');
  });

  test('dos o más mascotas → lista', () => {
    const res = clasificarSeccion({ mascotas: [mascotaActiva(7), mascotaActiva(8)] });
    expect(res.modo).toBe('lista');
    expect(res.mascotas).toHaveLength(2);
  });

  test('solo invitaciones recibidas (sin mascotas) → lista con esas invitaciones', () => {
    const res = clasificarSeccion({
      invitaciones: { recibidas: [invite(3, 'Beto')], enviadas: [] },
    });
    expect(res.modo).toBe('lista');
    expect(res.recibidas).toHaveLength(1);
    expect(res.mascotas).toHaveLength(0);
  });

  test('la lista conserva las cuatro categorías tal cual', () => {
    const res = clasificarSeccion({
      mascotas: [mascotaActiva(7)],
      invitaciones: { recibidas: [invite(3, 'Beto')], enviadas: [invite(4, 'Cami')] },
      amigosElegibles: [invite(5, 'Dani')],
    });
    expect(res.modo).toBe('lista');
    expect(res.mascotas).toHaveLength(1);
    expect(res.recibidas).toHaveLength(1);
    expect(res.enviadas).toHaveLength(1);
    expect(res.amigosElegibles).toHaveLength(1);
  });
});
