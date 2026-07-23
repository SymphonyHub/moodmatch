// Textos de la pausa de una mascota compartida, aparte del render para poder
// verificar el tono sin montar componentes (mismo criterio que seccionMascota.js).
//
// Cualquiera de los dos puede pausar sin la aprobación del otro, así que estos
// textos tienen dos trabajos: no hacer sentir culpable a quien pausa (ni a quien
// recibe el aviso), y ser transparentes en que la otra persona se va a enterar.
// "Pausa" y no "eliminar" porque es lo que de verdad pasa con el dato: la
// mascota se archiva conservando su historial.

export const TEXTOS_PAUSA = {
  bloqueTitulo: 'Poner en pausa',
  bloqueTexto: 'Si ya no quieren seguir cuidándola, pueden ponerla en pausa. Sus recuerdos se guardan.',
  accion: (nombre) => `Poner en pausa a ${nombre}`,
  dialogoTitulo: (nombre) => `¿Poner en pausa a ${nombre}?`,
  dialogoTexto: 'Dejará de aparecer en su sección de mascota. Sus recuerdos se guardan y pueden retomarla cuando quieran. No necesitas la aprobación de tu amistad; le llegará un aviso.',
  cancelar: 'Mejor no',
  confirmar: 'Poner en pausa',
  enCurso: 'Poniendo en pausa…',
  error: 'No se pudo poner en pausa. Puedes intentarlo de nuevo.',
};

export default TEXTOS_PAUSA;
