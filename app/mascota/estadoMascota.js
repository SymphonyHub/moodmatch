const ETAPAS = [
  { desde: 0, hasta: 4, etiqueta: 'Recién se conocen' },
  { desde: 4, hasta: 10, etiqueta: 'Tomando confianza' },
  { desde: 10, hasta: 20, etiqueta: 'Buenos compañeros' },
  { desde: 20, hasta: 40, etiqueta: 'Vínculo especial' },
  { desde: 40, hasta: null, etiqueta: 'Amistad inseparable' },
];

export function estadoMascota(nivelCarino) {
  const nivel = Math.max(0, Number.isFinite(nivelCarino) ? nivelCarino : 0);
  const etapa = ETAPAS.find(({ hasta }) => hasta === null || nivel < hasta) ?? ETAPAS[0];
  const progreso = etapa.hasta === null
    ? 1
    : Math.min(1, (nivel - etapa.desde) / (etapa.hasta - etapa.desde));

  return {
    etiqueta: etapa.etiqueta,
    progreso,
    siguienteNivel: etapa.hasta,
    sprite: nivel < 4 ? 0 : nivel < 10 ? 1 : nivel < 20 ? 2 : 3,
  };
}
