// Compositor de la escena de la mascota. Recibe la ESPECIE como parámetro (más
// etapa y accesorios) y arma los grupos que consumen tanto el sprite estático
// (MascotaSprite) como el rig de animación (MascotaAnimada). No contiene
// geometría por-especie: delega en especies.js y accesorios.js.
//
// Grupos devueltos (orden de dibujo shadow → apendice → cuerpo → cara → frente):
//   shadow   → sombra de contacto (estática)
//   apendice → parte blandita que el rig balancea (detrás del cuerpo)
//   cuerpo   → masa principal + patrón de color equipado (respira/salta junta)
//   cara     → { ojos, resto } (ojos parpadean)
//   frente   → accesorio de cabeza equipado (encima de todo)

import { paletaEtapa } from './paletas';
import { dibujarEspecie } from './especies';
import { dibujarAccesorios } from './accesorios';

export function escenaMascota({
  especie, etapa, accesorioCabeza = null, accesorioColor = null,
}) {
  const paleta = paletaEtapa(etapa);
  const base = dibujarEspecie(especie, etapa, paleta);
  const acc = dibujarAccesorios({
    especie, etapa, paleta, cabeza: accesorioCabeza, color: accesorioColor,
  });

  return {
    shadow: base.shadow,
    apendice: base.apendice,
    cuerpo: [...base.cuerpo, ...acc.color],
    cara: base.cara,
    frente: acc.cabeza,
  };
}

// Lista plana en orden de dibujo (para el sprite estático).
export function escenaPlana(opciones) {
  const e = escenaMascota(opciones);
  return [...e.shadow, ...e.apendice, ...e.cuerpo, ...e.cara.resto, ...e.cara.ojos, ...e.frente];
}
