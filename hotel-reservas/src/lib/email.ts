import { ADKINIQ_NAME, ADKINIQ_URL } from "@/lib/adkiniq";
import { getHotelName } from "@/lib/brand";
import type { BankTransferConfig } from "@/types/payments";
export type ReservationEmailPayload = {
  to: string;
  guestName: string;
  confirmationCode: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  paymentStatus: string;
};

function getBccRecipients(): string | undefined {
  const bcc = process.env.SMTP_BCC?.trim();
  return bcc || undefined;
}

function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim());
}

/** Indica si el sistema puede enviar correos transaccionales al huésped. */
export function isEmailNotificationsEnabled(): boolean {
  return isEmailConfigured();
}

function formatMoney(amount: number): string {
  const currency = process.env.MERCADOPAGO_CURRENCY?.trim() || "USD";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount);
}

function buildDetailsList(payload: ReservationEmailPayload): string {
  return [
    `<li><strong>Código:</strong> ${payload.confirmationCode}</li>`,
    `<li><strong>Habitación:</strong> ${payload.roomName}</li>`,
    `<li><strong>Check-in:</strong> ${payload.checkIn}</li>`,
    `<li><strong>Check-out:</strong> ${payload.checkOut}</li>`,
    `<li><strong>Total:</strong> ${formatMoney(payload.totalAmount)}</li>`,
  ].join("");
}

function buildDetailsText(payload: ReservationEmailPayload): string[] {
  return [
    `Código: ${payload.confirmationCode}`,
    `Habitación: ${payload.roomName}`,
    `Check-in: ${payload.checkIn}`,
    `Check-out: ${payload.checkOut}`,
    `Total: ${formatMoney(payload.totalAmount)}`,
  ];
}

async function sendMail(to: string, subject: string, text: string, html: string): Promise<boolean> {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[email:demo]", subject, "→", to);
    }
    return false;
  }

  const host = process.env.SMTP_HOST!.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM!.trim();
  const bcc = getBccRecipients();

  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transport.sendMail({
    from,
    to,
    bcc,
    subject: `[${getHotelName()}] ${subject}`,
    text,
    html: wrapHtml(html, subject),
  });
  return true;
}

function wrapHtml(body: string, title: string): string {
  const hotel = getHotelName();
  return `
<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background:#eef2f6;font-family:Arial,sans-serif;color:#1e293b;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #cbd5e1;">
      <tr>
        <td style="background:linear-gradient(135deg,#0f766e,#059669);padding:20px 24px;color:#ffffff;">
          <p style="margin:0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.9;">${hotel}</p>
          <h1 style="margin:8px 0 0;font-size:20px;line-height:1.3;">${title}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;font-size:15px;line-height:1.6;">${body}</td>
      </tr>
      <tr>
        <td style="padding:16px 24px;background:#f8fafc;font-size:12px;color:#64748b;line-height:1.5;">
          Este correo fue enviado automáticamente por el sistema de reservas de ${hotel}.<br />
          Plataforma desarrollada por <a href="${ADKINIQ_URL}" style="color:#64748b;text-decoration:underline;">${ADKINIQ_NAME}</a>.
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendReservationCreatedEmail(payload: ReservationEmailPayload): Promise<void> {
  const subject = `Reserva registrada · ${payload.confirmationCode}`;
  const text = [
    `Hola ${payload.guestName},`,
    "",
    "Tu reserva fue registrada. Completa el pago para confirmar tu estadía.",
    "",
    ...buildDetailsText(payload),
    "",
    "Si tienes dudas, contáctanos por WhatsApp desde la web de reservas.",
  ].join("\n");

  const html = `
    <p>Hola <strong>${payload.guestName}</strong>,</p>
    <p>Tu reserva fue registrada. <strong>Completa el pago</strong> para confirmar tu estadía.</p>
    <ul style="padding-left:18px;">${buildDetailsList(payload)}</ul>
    <p style="margin-top:16px;color:#64748b;font-size:14px;">Si tienes dudas, contáctanos por WhatsApp desde la web de reservas.</p>
  `;

  await sendMail(payload.to, subject, text, html);
}

export async function sendReservationPaidEmail(payload: ReservationEmailPayload): Promise<void> {
  const subject = `Reserva confirmada · ${payload.confirmationCode}`;
  const text = [
    `Hola ${payload.guestName},`,
    "",
    "¡Tu pago fue confirmado! Tu estadía está reservada.",
    "",
    ...buildDetailsText(payload).map((line) => line.replace("Total:", "Total pagado:")),
    "",
    "Te esperamos. Guarda este correo como comprobante.",
  ].join("\n");

  const html = `
    <p>Hola <strong>${payload.guestName}</strong>,</p>
    <p><strong>¡Tu pago fue confirmado!</strong> Tu estadía está reservada.</p>
    <ul style="padding-left:18px;">${buildDetailsList(payload)}</ul>
    <p style="margin-top:16px;">Te esperamos. Guarda este correo como comprobante.</p>
  `;

  await sendMail(payload.to, subject, text, html);
}

export async function sendBankTransferInstructionsEmail(
  payload: ReservationEmailPayload,
  bank: BankTransferConfig
): Promise<void> {
  const subject = `Instrucciones de transferencia · ${payload.confirmationCode}`;
  const contact = bank.contactEmail ?? "recepción del hotel";

  const bankLines = [
    `Banco: ${bank.bankName}`,
    `Titular: ${bank.accountHolder}`,
    `Cuenta: ${bank.accountNumber}`,
    bank.accountType ? `Tipo: ${bank.accountType}` : null,
    bank.cbu ? `CBU/CVU: ${bank.cbu}` : null,
    bank.alias ? `Alias: ${bank.alias}` : null,
    bank.swift ? `SWIFT: ${bank.swift}` : null,
    `Referencia obligatoria: ${payload.confirmationCode}`,
    `Monto a transferir: ${formatMoney(payload.totalAmount)}`,
    `Plazo: ${bank.deadlineHours} horas`,
    bank.notes ?? null,
  ].filter(Boolean) as string[];

  const text = [
    `Hola ${payload.guestName},`,
    "",
    "Tu reserva está pendiente de pago por transferencia bancaria.",
    "",
    ...buildDetailsText(payload),
    "",
    "Datos para transferir:",
    ...bankLines.map((line) => `- ${line}`),
    "",
    `Envía el comprobante a ${contact} indicando tu código ${payload.confirmationCode}.`,
  ].join("\n");

  const bankHtml = bankLines.map((line) => `<li>${line}</li>`).join("");

  const html = `
    <p>Hola <strong>${payload.guestName}</strong>,</p>
    <p>Tu reserva está <strong>pendiente de pago por transferencia bancaria</strong>.</p>
    <ul style="padding-left:18px;">${buildDetailsList(payload)}</ul>
    <h2 style="margin:20px 0 8px;font-size:16px;color:#0f766e;">Datos para transferir</h2>
    <ul style="padding-left:18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 16px 16px 32px;">${bankHtml}</ul>
    <p style="margin-top:16px;">Envía el comprobante a <strong>${contact}</strong> con tu código <strong>${payload.confirmationCode}</strong>.</p>
  `;

  await sendMail(payload.to, subject, text, html);
}

export type ContactEmailPayload = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
};

const CONTACT_SUBJECT_LABELS: Record<string, string> = {
  reserva: "Consulta de reserva",
  consulta: "Consulta general",
  eventos: "Eventos y grupos",
  otro: "Otro",
};

function getContactInboxEmail(): string {
  return (
    process.env.CONTACT_INBOX_EMAIL?.trim() ||
    process.env.SMTP_BCC?.trim() ||
    process.env.BANK_CONTACT_EMAIL?.trim() ||
    "reservas@hotelboyehouse.cl"
  );
}

export async function sendContactEmail(payload: ContactEmailPayload): Promise<boolean> {
  const inbox = getContactInboxEmail();
  const subjectLabel = CONTACT_SUBJECT_LABELS[payload.subject] ?? payload.subject;
  const subject = `Contacto web · ${subjectLabel}`;
  const phoneLine = payload.phone ? `Teléfono: ${payload.phone}` : null;

  const text = [
    "Nuevo mensaje desde el formulario de contacto:",
    "",
    `Nombre: ${payload.name}`,
    `Email: ${payload.email}`,
    phoneLine,
    `Asunto: ${subjectLabel}`,
    "",
    payload.message,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>Recibiste un nuevo mensaje desde la web de <strong>${getHotelName()}</strong>.</p>
    <ul style="padding-left:18px;">
      <li><strong>Nombre:</strong> ${payload.name}</li>
      <li><strong>Email:</strong> <a href="mailto:${payload.email}">${payload.email}</a></li>
      ${payload.phone ? `<li><strong>Teléfono:</strong> ${payload.phone}</li>` : ""}
      <li><strong>Asunto:</strong> ${subjectLabel}</li>
    </ul>
    <p style="margin:16px 0 8px;font-weight:700;">Mensaje</p>
    <p style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;">${payload.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
    <p style="margin-top:16px;color:#64748b;font-size:14px;">Podés responder directamente a ${payload.email}.</p>
  `;

  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[email:demo]", subject, "→", inbox, `(reply-to: ${payload.email})`);
    }
    return false;
  }

  const host = process.env.SMTP_HOST!.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM!.trim();
  const bcc = getBccRecipients();

  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transport.sendMail({
    from,
    to: inbox,
    replyTo: payload.email,
    bcc,
    subject: `[${getHotelName()}] ${subject}`,
    text,
    html: wrapHtml(html, subject),
  });
  return true;
}

export function buildReservationEmailPayload(reservation: {
  confirmationCode: string;
  guestFullName?: string | null;
  checkIn: Date;
  checkOut: Date;
  totalAmount: unknown;
  paymentStatus: string;
  room: { name: string };
  guest: { fullName: string; email: string };
}): ReservationEmailPayload {
  return {
    to: reservation.guest.email,
    guestName: reservation.guestFullName || reservation.guest.fullName,
    confirmationCode: reservation.confirmationCode,
    roomName: reservation.room.name,
    checkIn: reservation.checkIn.toISOString().slice(0, 10),
    checkOut: reservation.checkOut.toISOString().slice(0, 10),
    totalAmount: Number(reservation.totalAmount),
    paymentStatus: reservation.paymentStatus,
  };
}
