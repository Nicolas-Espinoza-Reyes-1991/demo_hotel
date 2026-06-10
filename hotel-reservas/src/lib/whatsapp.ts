export function getWhatsAppNumber(): string {
  return (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "15556563871").replace(/\D/g, "");
}

export function buildWhatsAppUrl(message?: string): string {
  const defaultMessage =
    "Hola, tengo una duda o problema con mi reserva. ¿Me pueden ayudar?";
  const text = encodeURIComponent(message ?? defaultMessage);
  return `https://wa.me/${getWhatsAppNumber()}?text=${text}`;
}

export function buildReservationWhatsAppMessage(params?: {
  confirmationCode?: string;
  guestName?: string;
  roomName?: string;
}): string {
  const parts = ["Hola, tengo una duda o problema con mi reserva. ¿Me pueden ayudar?"];
  if (params?.confirmationCode) parts.push(`Código: ${params.confirmationCode}`);
  if (params?.guestName) parts.push(`Nombre: ${params.guestName}`);
  if (params?.roomName) parts.push(`Habitación: ${params.roomName}`);
  return parts.join("\n");
}
