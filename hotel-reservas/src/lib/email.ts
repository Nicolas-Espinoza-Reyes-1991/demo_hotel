import { getHotelName } from "@/lib/brand";
import { hotelConfig } from "@/config/hotel";
import type { BankTransferConfig } from "@/types/payments";
import {
  buildCtaButton,
  buildEmailShell,
  buildGuestIntro,
  buildInfoBox,
  buildReservationDetailsCard,
  buildStatusBadge,
  escapeHtml,
  formatStayDate,
  getReservationLinks,
} from "@/lib/email-layout";

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

function buildDetailsText(payload: ReservationEmailPayload, totalLabel = "Total"): string[] {
  return [
    `Código: ${payload.confirmationCode}`,
    `Habitación: ${payload.roomName}`,
    `Check-in: ${formatStayDate(payload.checkIn)}`,
    `Check-out: ${formatStayDate(payload.checkOut)}`,
    `${totalLabel}: ${formatMoney(payload.totalAmount)}`,
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
    html,
  });
  return true;
}

function buildReservationEmailHtml(
  payload: ReservationEmailPayload,
  options: {
    title: string;
    eyebrow: string;
    intro: string;
    badge: { label: string; tone: "pending" | "success" };
    totalLabel?: string;
    extraHtml?: string;
    footerNote?: string;
    showLookupCta?: boolean;
  }
): string {
  const links = getReservationLinks(payload.confirmationCode);
  const details = buildReservationDetailsCard({
    confirmationCode: payload.confirmationCode,
    roomName: payload.roomName,
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    totalAmount: formatMoney(payload.totalAmount),
    totalLabel: options.totalLabel,
  });

  const ctas = [
    options.showLookupCta === false ? "" : buildCtaButton(links.miReserva, "Consultar mi reserva"),
    buildCtaButton(links.whatsapp, "Escribir por WhatsApp", false),
  ].join("");

  const body = `
    ${buildGuestIntro(payload.guestName)}
    <p style="margin:0 0 16px;">${options.intro}</p>
    <p style="margin:0 0 8px;">${buildStatusBadge(options.badge.label, options.badge.tone)}</p>
    ${details}
    ${options.extraHtml ?? ""}
    ${ctas}
  `;

  return buildEmailShell({
    title: options.title,
    eyebrow: options.eyebrow,
    body,
    variant: "guest",
    footerNote: options.footerNote,
  });
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
    `Consulta tu reserva en: ${getReservationLinks(payload.confirmationCode).miReserva}`,
  ].join("\n");

  const html = buildReservationEmailHtml(payload, {
    title: "Reserva registrada",
    eyebrow: "Gracias por elegirnos",
    intro:
      "Recibimos tu solicitud de reserva. <strong>Completa el pago</strong> para confirmar tu estadía en nuestro hotel.",
    badge: { label: "Pendiente de pago", tone: "pending" },
    footerNote: "Si ya transferiste, envía el comprobante indicando tu código de reserva.",
  });

  await sendMail(payload.to, subject, text, html);
}

export async function sendReservationPaidEmail(payload: ReservationEmailPayload): Promise<void> {
  const subject = `Reserva confirmada · ${payload.confirmationCode}`;
  const text = [
    `Hola ${payload.guestName},`,
    "",
    "¡Tu pago fue confirmado! Tu estadía está reservada.",
    "",
    ...buildDetailsText(payload, "Total pagado"),
    "",
    "Te esperamos. Guarda este correo como comprobante.",
  ].join("\n");

  const html = buildReservationEmailHtml(payload, {
    title: "¡Reserva confirmada!",
    eyebrow: "Todo listo para tu llegada",
    intro:
      "<strong>¡Tu pago fue confirmado!</strong> Tu habitación quedó reservada. Te esperamos con la mejor hospitalidad del sur.",
    badge: { label: "Pago confirmado", tone: "success" },
    totalLabel: "Total pagado",
    footerNote: `Recuerda: check-in desde las ${hotelConfig.seo.checkinTime} y check-out hasta las ${hotelConfig.seo.checkoutTime}.`,
  });

  await sendMail(payload.to, subject, text, html);
}

export async function sendBankTransferInstructionsEmail(
  payload: ReservationEmailPayload,
  bank: BankTransferConfig
): Promise<void> {
  const subject = `Instrucciones de transferencia · ${payload.confirmationCode}`;
  const contact = bank.contactEmail ?? hotelConfig.contact.email;

  const bankLines = [
    `Banco: ${bank.bankName}`,
    `Titular: ${bank.accountHolder}`,
    bank.taxId ? `RUT: ${bank.taxId}` : null,
    bank.accountType ? `Tipo: ${bank.accountType}` : null,
    `Cuenta: ${bank.accountNumber}`,
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

  const bankBox = buildInfoBox("Datos para transferir", bankLines, "success");
  const contactBox = buildInfoBox("Después de transferir", [
    `Envía el comprobante a ${contact}`,
    `Indica tu código ${payload.confirmationCode}`,
    `Tienes ${bank.deadlineHours} horas para completar el pago`,
  ]);

  const html = buildReservationEmailHtml(payload, {
    title: "Instrucciones de transferencia",
    eyebrow: "Un paso más para confirmar",
    intro:
      "Tu reserva está registrada y queda <strong>pendiente de pago por transferencia bancaria</strong>. Usa los datos a continuación.",
    badge: { label: "Transferencia pendiente", tone: "pending" },
    extraHtml: `${bankBox}${contactBox}`,
    footerNote: "Si necesitas ayuda, responde este correo o escríbenos por WhatsApp.",
    showLookupCta: true,
  });

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

/** Asunto único por mensaje (evita que Gmail agrupe todo en un solo hilo). */
export function buildContactMailSubject(payload: ContactEmailPayload): string {
  const subjectLabel = CONTACT_SUBJECT_LABELS[payload.subject] ?? payload.subject;
  const name = payload.name.trim().slice(0, 48) || "Sin nombre";
  const stamp = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  return `[URGENTE] Contacto · ${subjectLabel} · ${name} · ${stamp}`;
}

function getContactInboxEmail(): string {
  return (
    process.env.CONTACT_INBOX_EMAIL?.trim() ||
    process.env.SMTP_BCC?.trim() ||
    process.env.BANK_CONTACT_EMAIL?.trim() ||
    hotelConfig.contact.email
  );
}

export async function sendContactEmail(payload: ContactEmailPayload): Promise<boolean> {
  const inbox = getContactInboxEmail();
  const subjectLabel = CONTACT_SUBJECT_LABELS[payload.subject] ?? payload.subject;
  const subject = buildContactMailSubject(payload);
  const phoneLine = payload.phone ? `Teléfono: ${payload.phone}` : null;

  const text = [
    "⚠ URGENTE — Nuevo mensaje desde el formulario de contacto:",
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

  const contactDetails = buildInfoBox(
    "Datos del contacto",
    [
      `Nombre: ${payload.name}`,
      `Email: ${payload.email}`,
      ...(payload.phone ? [`Teléfono: ${payload.phone}`] : []),
      `Motivo: ${subjectLabel}`,
    ],
    "urgent"
  );

  const messageBox = `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0 8px;background:#ffffff;border:1px solid #f0caca;border-radius:16px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#9f2d2d;">Mensaje</p>
          <p style="margin:0;white-space:pre-wrap;font-size:14px;line-height:1.65;color:#4a3428;">${escapeHtml(payload.message)}</p>
        </td>
      </tr>
    </table>`;

  const body = `
    <p style="margin:0 0 14px;font-size:16px;">Recibiste un nuevo mensaje desde la web de <strong>${escapeHtml(getHotelName())}</strong>.</p>
    <p style="margin:0 0 12px;">${buildStatusBadge("Prioridad alta", "urgent")}</p>
    ${contactDetails}
    ${messageBox}
    ${buildCtaButton(`mailto:${payload.email}`, `Responder a ${payload.name}`)}
  `;

  const html = buildEmailShell({
    title: subjectLabel,
    eyebrow: "⚠ Nuevo contacto web",
    body,
    variant: "contact",
    footerNote: `Podés responder directamente a ${payload.email}.`,
  });

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
    priority: "high",
    subject: `[${getHotelName()}] ${subject}`,
    text,
    html,
    headers: {
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
      Importance: "high",
    },
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
