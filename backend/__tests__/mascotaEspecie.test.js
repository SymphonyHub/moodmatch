const { presentarMascota } = require('../lib/mascota');
const { derivarEspecie } = require('../lib/especies');

// La especie negociada por ambos amigos (Agente A) es la fuente de verdad; la
// derivación determinista solo aplica como fallback a mascotas previas a Fase 14.
const base = {
  id: 'pet-1',
  amistadId: 7,
  nombre: 'Lumi',
  nivelCarino: 0,
  historialHitos: [],
  retoCooperativo: null,
  nombrePropuesto: null,
  invitacionEstado: 'aceptada',
  activa: true,
  invitadaPor: 2,
  accesorioCabeza: null,
  accesorioColor: null,
};
const amistad = { userId: 2, friendId: 1 };

describe('especie en presentarMascota', () => {
  test('usa la especie persistida (negociada) cuando existe', () => {
    const otraEspecie = derivarEspecie(7) === 'perro' ? 'huevo' : 'perro';
    const res = presentarMascota({ ...base, especie: otraEspecie }, amistad, 1, 'curiosa');
    expect(res.especie).toBe(otraEspecie);
  });

  test('cae al fallback determinista solo si especie es null (mascota legada)', () => {
    const res = presentarMascota({ ...base, especie: null }, amistad, 1, 'curiosa');
    expect(res.especie).toBe(derivarEspecie(7));
  });

  test('también cae al fallback si el campo no viene (undefined)', () => {
    const res = presentarMascota(base, amistad, 1, 'curiosa');
    expect(res.especie).toBe(derivarEspecie(7));
  });
});
