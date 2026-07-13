import { hotelConfig } from "@/config/hotel";

export function getWhatsAppNumber(): string {
  return (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? hotelConfig.contact.whatsapp).replace(/\D/g, "");
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

export function buildMenuWhatsAppMessage(params?: {
  itemName?: string;
  categoryName?: string;
}): string {
  if (params?.itemName) {
    const parts = [`Hola, me interesa pedir o consultar por: ${params.itemName}.`];
    if (params.categoryName) parts.push(`Categoría: ${params.categoryName}`);
    parts.push("¿Me pueden ayudar?");
    return parts.join("\n");
  }
  return "Hola, quiero consultar por algo de la carta del hotel. ¿Me pueden ayudar?";
}

export function buildExperienceWhatsAppMessage(params: {
  experienceTitle: string;
  partnerName: string;
  hotelName?: string;
}): string {
  const parts = [
    `Hola ${params.partnerName}, vi la experiencia «${params.experienceTitle}»`,
  ];
  if (params.hotelName) {
    parts[0] += ` desde ${params.hotelName}`;
  }
  parts[0] += ".";
  parts.push("Me gustaría consultar disponibilidad y valores. ¿Me pueden ayudar?");
  return parts.join("\n");
}

/** Abre WhatsApp hacia un número específico (partner) o el del hotel como fallback. */
export function buildWhatsAppUrlTo(number: string | null | undefined, message?: string): string {
  const digits = (number ?? "").replace(/\D/g, "") || getWhatsAppNumber();
  const text = encodeURIComponent(message ?? "Hola, ¿me pueden ayudar?");
  return `https://wa.me/${digits}?text=${text}`;
}
