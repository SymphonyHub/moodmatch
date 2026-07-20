import { clasificar } from './invitacionSalida';

export function normalizarBusqueda(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();
}

export function buscarEnMensajes(mensajes, consulta) {
  const aguja = normalizarBusqueda(consulta);
  if (!aguja) return [];
  return mensajes.reduce((indices, mensaje, index) => {
    const textoVisible = clasificar(mensaje.message).texto;
    if (normalizarBusqueda(textoVisible).includes(aguja)) indices.push(index);
    return indices;
  }, []);
}

export function moverResultado(total, actual, delta) {
  if (total <= 0) return 0;
  return (actual + delta + total) % total;
}
