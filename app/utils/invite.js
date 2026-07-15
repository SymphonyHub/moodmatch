// Construcción del link/mensaje de invitación que se comparte por el share sheet.
// Separado de la pantalla para poder testearlo como lógica pura.

export const buildInviteLink = (apiUrl, qrCode) =>
  `${apiUrl.replace(/\/+$/, '')}/invite/${encodeURIComponent(qrCode)}`;

export const buildInviteMessage = (nombre, apiUrl, qrCode) =>
  `${nombre} te invita a MoodMatch 💙 Acompáñense en el día a día: ` +
  `comparte cómo te sientes y envíense mensajes de ánimo.\n\n` +
  `Únete aquí: ${buildInviteLink(apiUrl, qrCode)}`;
