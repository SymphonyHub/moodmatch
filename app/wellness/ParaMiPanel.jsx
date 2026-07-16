import ParaMiTab from '../components/wellness/ParaMiTab';

// Pestaña "Para mí" del Wellness Hub — dominio del Agente B (Emociones).
// El contenido real vive en ParaMiTab (autosuficiente: fetch propio del
// último ánimo registrado, estados cargando/vacío/error/contenido); este
// panel solo lo monta dentro del marco que define actividades.jsx.
export default function ParaMiPanel() {
  return <ParaMiTab />;
}
