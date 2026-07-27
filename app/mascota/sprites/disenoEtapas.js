// Compositor de la escena de la mascota. Recibe la ESPECIE como parámetro (más
// etapa, accesorios y la forma de párpado de la expresión) y arma los grupos que
// consumen tanto el sprite estático (MascotaSprite) como el rig de animación
// (MascotaAnimada). No contiene geometría por-especie: delega en especies.js y
// accesorios.js.
//
// Grupos devueltos (orden de dibujo defs → shadow → apendice → cuerpo → cara →
// contorno → frente):
//   defs     → definiciones referenciadas por los demás nodos (el gradiente de
//              sombreado de la especie); no dibuja nada por sí mismo
//   shadow   → sombra de contacto (estática)
//   apendice → parte blandita que el rig balancea (detrás del cuerpo)
//   cuerpo   → masa principal + patrón de color equipado (respira/salta junta)
//   cara     → { rubor, resto, ojos, gesto } en ese orden de dibujo:
//              rubor parpadea de intensidad con la expresión, ojos parpadean, y
//              gesto son los párpados/cejas de la expresión, que van por encima
//   contorno → trazo exterior opcional, encima del rostro y sin líneas internas
//   frente   → accesorio de cabeza equipado (encima de todo)
//
// El rubor sale separado del resto de la cara justamente para que el rig pueda
// subirlo o bajarlo sin tocar narices, picos ni bocas: se lo reconoce por el
// `rol` que le pone geometria.js, no por su posición en la lista.

import { paletaEtapa } from './paletas';
import { dibujarEspecie } from './especies';
import { dibujarAccesorios } from './accesorios';
import { parpados, ROL_RUBOR } from './geometria';

export function escenaMascota({
  especie, etapa, accesorioCabeza = null, accesorioColor = null, parpado = 'ninguno',
}) {
  const paleta = paletaEtapa(etapa);
  const base = dibujarEspecie(especie, etapa, paleta);
  const acc = dibujarAccesorios({
    especie, etapa, paleta, cabeza: accesorioCabeza, color: accesorioColor,
  });

  const cara = base.cara.resto ?? [];
  return {
    defs: base.defs,
    shadow: base.shadow,
    apendice: base.apendice,
    cuerpo: [...base.cuerpo, ...acc.color],
    cara: {
      rubor: cara.filter((n) => n.rol === ROL_RUBOR),
      resto: cara.filter((n) => n.rol !== ROL_RUBOR),
      ojos: base.cara.ojos,
      gesto: parpados(base.cara.ojos, parpado, paleta),
    },
    contorno: base.contorno ?? [],
    frente: acc.cabeza,
  };
}

// Lista plana en orden de dibujo (para el sprite estático).
export function escenaPlana(opciones) {
  const e = escenaMascota(opciones);
  return [
    ...e.defs, ...e.shadow, ...e.apendice, ...e.cuerpo,
    ...e.cara.rubor, ...e.cara.resto, ...e.cara.ojos, ...e.cara.gesto,
    ...e.contorno, ...e.frente,
  ];
}
