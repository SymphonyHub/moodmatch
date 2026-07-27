const categoria = (datos) => Object.freeze(datos);
const producto = (datos) => Object.freeze({
  origen: 'tienda',
  ...datos,
  preview: Object.freeze(datos.preview),
});

export const CATEGORIAS_TIENDA = Object.freeze([
  categoria({ id: 'sombreros', etiqueta: 'Sombreros' }),
  categoria({ id: 'accesorios', etiqueta: 'Accesorios' }),
  categoria({ id: 'habitat', etiqueta: 'Hábitat' }),
]);

// Catálogo visual aislado: estos ids no forman parte de los accesorios que se
// desbloquean por nivel y todavía no se envían al backend.
export const CATALOGO_TIENDA = Object.freeze([
  producto({
    id: 'capucha-nube',
    categoria: 'sombreros',
    nombre: 'Capucha nube',
    descripcion: 'Suavecita y ligera',
    precio: 5,
    preview: {
      icono: 'cloud-outline',
      fondo: '#EEF0FF',
      superficie: '#FFFFFF',
      color: '#8E82D6',
      detalle: '#F6BCA8',
    },
  }),
  producto({
    id: 'boina-amanecer',
    categoria: 'sombreros',
    nombre: 'Boina amanecer',
    descripcion: 'Un rayito cálido',
    precio: 7,
    preview: {
      icono: 'sunny-outline',
      fondo: '#FFF1EB',
      superficie: '#FFF9F5',
      color: '#CE7459',
      detalle: '#F6C453',
    },
  }),
  producto({
    id: 'sombrero-brote',
    categoria: 'sombreros',
    nombre: 'Sombrero brote',
    descripcion: 'Con una hojita curiosa',
    precio: 9,
    preview: {
      icono: 'leaf-outline',
      fondo: '#EDF6EF',
      superficie: '#F8FCF8',
      color: '#6E9278',
      detalle: '#C6CEFF',
    },
  }),
  producto({
    id: 'panuelito-coral',
    categoria: 'accesorios',
    nombre: 'Pañuelito coral',
    descripcion: 'Un detalle acogedor',
    precio: 4,
    preview: {
      icono: 'ribbon-outline',
      fondo: '#FFF0EC',
      superficie: '#FFF9F7',
      color: '#D47B64',
      detalle: '#C6CEFF',
    },
  }),
  producto({
    id: 'mochilita-indigo',
    categoria: 'accesorios',
    nombre: 'Mochilita índigo',
    descripcion: 'Lista para pasear',
    precio: 8,
    preview: {
      icono: 'bag-handle-outline',
      fondo: '#ECEEFF',
      superficie: '#F8F8FF',
      color: '#6976C9',
      detalle: '#F6BCA8',
    },
  }),
  producto({
    id: 'medallon-amistad',
    categoria: 'accesorios',
    nombre: 'Medallón amistad',
    descripcion: 'Para llevarles cerquita',
    precio: 10,
    preview: {
      icono: 'heart-outline',
      fondo: '#FFF3E4',
      superficie: '#FFFBF4',
      color: '#B96B55',
      detalle: '#F6C453',
    },
  }),
  producto({
    id: 'rincon-sereno',
    categoria: 'habitat',
    nombre: 'Rincón sereno',
    descripcion: 'Lavanda y manta coral',
    precio: 8,
    preview: { variante: 'sereno' },
  }),
  producto({
    id: 'luz-amanecer',
    categoria: 'habitat',
    nombre: 'Luz de amanecer',
    descripcion: 'Tonos tibios y suaves',
    precio: 11,
    preview: { variante: 'amanecer' },
  }),
  producto({
    id: 'noche-acogedora',
    categoria: 'habitat',
    nombre: 'Noche acogedora',
    descripcion: 'Calma con luz dorada',
    precio: 12,
    preview: { variante: 'nocturno' },
  }),
]);
