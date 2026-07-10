import { ADKINIQ_NAME, ADKINIQ_URL } from "@/lib/adkiniq";
import { LOGO_PATH, getHotelName } from "@/lib/brand";
import { publicAssetUrl } from "@/lib/api-path";
import { hotelConfig } from "@/config/hotel";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { getWebsiteUrl } from "@/lib/website";

const BRAND = {
  cream: "#faf6ef",
  creamDark: "#f0e6d8",
  wood: "#4a3428",
  woodSoft: "#6b5345",
  gold: "#b8922e",
  goldLight: "#d4b44a",
  honey: "#f5e6c8",
  border: "#d9c9b8",
  textMuted: "#7a6558",
  success: "#3d6b4f",
  successBg: "#edf5ef",
  pending: "#9a6b1f",
  pendingBg: "#faf3e3",
  urgent: "#9f2d2d",
  urgentBg: "#fdf0f0",
} as const;

export type EmailVariant = "guest" | "contact";

export type EmailShellOptions = {
  title: string;
  eyebrow?: string;
  body: string;
  variant?: EmailVariant;
  footerNote?: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getEmailBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return hotelConfig.urls.reservas.replace(/\/$/, "");
}

export function emailAssetUrl(path: string): string {
  const relative = publicAssetUrl(path) ?? path;
  if (/^https?:\/\//i.test(relative)) return relative;
  const base = getEmailBaseUrl();
  return `${base}${relative.startsWith("/") ? relative : `/${relative}`}`;
}

export function formatStayDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function buildCtaButton(href: string, label: string, primary = true): string {
  const bg = primary ? BRAND.wood : "#ffffff";
  const color = primary ? "#ffffff" : BRAND.wood;
  const border = primary ? BRAND.wood : BRAND.border;
  return `
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0 4px;">
      <tr>
        <td style="border-radius:999px;background:${bg};border:1px solid ${border};">
          <a href="${href}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:700;color:${color};text-decoration:none;letter-spacing:0.02em;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

export function buildStatusBadge(label: string, tone: "pending" | "success" | "urgent"): string {
  const styles = {
    pending: { bg: BRAND.pendingBg, color: BRAND.pending, border: "#e8d2a6" },
    success: { bg: BRAND.successBg, color: BRAND.success, border: "#c8ddd0" },
    urgent: { bg: BRAND.urgentBg, color: BRAND.urgent, border: "#f0caca" },
  }[tone];

  return `<span style="display:inline-block;padding:6px 12px;border-radius:999px;background:${styles.bg};border:1px solid ${styles.border};color:${styles.color};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(label)}</span>`;
}

type ReservationDetails = {
  confirmationCode: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  totalAmount: string;
  totalLabel?: string;
};

export function buildReservationDetailsCard(details: ReservationDetails): string {
  const rows = [
    ["Código de reserva", details.confirmationCode],
    ["Habitación", details.roomName],
    ["Check-in", formatStayDate(details.checkIn)],
    ["Check-out", formatStayDate(details.checkOut)],
    [details.totalLabel ?? "Total", details.totalAmount],
  ];

  const rowHtml = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:12px;font-weight:600;color:${BRAND.textMuted};width:38%;vertical-align:top;">
          ${escapeHtml(label)}
        </td>
        <td style="padding:10px 0 10px 12px;border-bottom:1px solid ${BRAND.border};font-size:14px;font-weight:700;color:${BRAND.wood};vertical-align:top;">
          ${escapeHtml(value)}
        </td>
      </tr>`
    )
    .join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:18px 0 8px;background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
      <tr>
        <td style="padding:14px 18px 4px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.gold};">
          Detalle de tu estadía
        </td>
      </tr>
      <tr>
        <td style="padding:4px 18px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${rowHtml}</table>
        </td>
      </tr>
    </table>`;
}

export function buildInfoBox(title: string, lines: string[], tone: "neutral" | "success" | "urgent" = "neutral"): string {
  const palette = {
    neutral: { bg: "#ffffff", border: BRAND.border, title: BRAND.wood },
    success: { bg: BRAND.successBg, border: "#c8ddd0", title: BRAND.success },
    urgent: { bg: BRAND.urgentBg, border: "#f0caca", title: BRAND.urgent },
  }[tone];

  const items = lines.map((line) => `<li style="margin:0 0 8px;">${escapeHtml(line)}</li>`).join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:18px 0 8px;background:${palette.bg};border:1px solid ${palette.border};border-radius:16px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:${palette.title};">${escapeHtml(title)}</p>
          <ul style="margin:0;padding-left:18px;color:${BRAND.wood};font-size:14px;line-height:1.55;">${items}</ul>
        </td>
      </tr>
    </table>`;
}

function buildHotelFooter(variant: EmailVariant): string {
  const hotel = getHotelName();
  const address = `${hotelConfig.address.street}, ${hotelConfig.address.locality}`;
  const phone = hotelConfig.contact.phoneDisplay;
  const email = hotelConfig.contact.email;
  const website = getWebsiteUrl();
  const reservas = getEmailBaseUrl();
  const whatsapp = buildWhatsAppUrl("Hola, tengo una consulta sobre mi reserva.");

  const links = [
    { href: website, label: "Sitio web" },
    { href: reservas, label: "Reservas" },
    { href: whatsapp, label: "WhatsApp" },
  ]
    .map(
      (link) =>
        `<a href="${link.href}" style="color:${BRAND.gold};text-decoration:none;font-weight:600;">${link.label}</a>`
    )
    .join(`<span style="color:${BRAND.border};padding:0 8px;">·</span>`);

  const note =
    variant === "contact"
      ? `Prioridad alta — responde pronto. Formulario de contacto de ${hotel}.`
      : `Este correo fue enviado automáticamente por el sistema de reservas de ${hotel}.`;

  return `
    <tr>
      <td style="padding:22px 28px 10px;background:${BRAND.creamDark};border-top:1px solid ${BRAND.border};">
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${BRAND.wood};">${escapeHtml(hotel)}</p>
        <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:${BRAND.woodSoft};">${escapeHtml(address)}</p>
        <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:${BRAND.woodSoft};">${escapeHtml(phone)} · <a href="mailto:${email}" style="color:${BRAND.gold};text-decoration:none;">${escapeHtml(email)}</a></p>
        <p style="margin:0;font-size:13px;line-height:1.8;">${links}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 28px 22px;background:${BRAND.creamDark};font-size:11px;line-height:1.6;color:${BRAND.textMuted};">
        ${escapeHtml(note)}<br />
        Check-in desde las ${hotelConfig.seo.checkinTime} · Check-out hasta las ${hotelConfig.seo.checkoutTime}.<br />
        Plataforma desarrollada por <a href="${ADKINIQ_URL}" style="color:${BRAND.textMuted};text-decoration:underline;">${ADKINIQ_NAME}</a>.
      </td>
    </tr>`;
}

export function buildEmailShell(options: EmailShellOptions): string {
  const hotel = getHotelName();
  const tagline = hotelConfig.brand.tagline;
  const hero = hotelConfig.hero.tagline;
  const variant = options.variant ?? "guest";
  const logoUrl = emailAssetUrl(LOGO_PATH);
  const headerAccent = variant === "contact" ? BRAND.urgent : BRAND.gold;
  const headerBg = variant === "contact"
    ? `linear-gradient(135deg, #6d2f2f 0%, ${BRAND.wood} 58%, #3f2d22 100%)`
    : `linear-gradient(135deg, ${BRAND.wood} 0%, #6a4a39 52%, #3f2d22 100%)`;

  const eyebrow =
    options.eyebrow ??
    (variant === "contact" ? "Nuevo mensaje desde la web" : tagline);

  return `<!DOCTYPE html>
<html lang="${hotelConfig.brand.htmlLang}">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(options.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.creamDark};font-family:Georgia,'Times New Roman',serif;color:${BRAND.wood};">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${BRAND.creamDark};padding:24px 12px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:620px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:24px;overflow:hidden;box-shadow:0 18px 48px -24px rgba(74,52,40,0.28);">
            <tr>
              <td style="padding:0;background:${headerBg};">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="padding:24px 28px 22px;">
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                          <td style="width:64px;vertical-align:middle;">
                            <img src="${logoUrl}" alt="${escapeHtml(hotel)}" width="56" height="56" style="display:block;width:56px;height:56px;border-radius:999px;border:2px solid rgba(255,255,255,0.28);background:#ffffff;" />
                          </td>
                          <td style="padding-left:14px;vertical-align:middle;">
                            <p style="margin:0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${headerAccent};font-family:Arial,sans-serif;">${escapeHtml(eyebrow)}</p>
                            <p style="margin:4px 0 0;font-size:22px;line-height:1.15;color:#ffffff;font-weight:700;">${escapeHtml(hotel)}</p>
                            <p style="margin:6px 0 0;font-size:13px;line-height:1.4;color:rgba(255,255,255,0.82);font-family:Arial,sans-serif;">${escapeHtml(hero)}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 28px 24px;">
                      <h1 style="margin:0;font-size:24px;line-height:1.25;color:#ffffff;font-weight:700;">${escapeHtml(options.title)}</h1>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:15px;line-height:1.7;color:${BRAND.wood};font-family:Arial,sans-serif;">
                ${options.body}
                ${options.footerNote ? `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:${BRAND.textMuted};">${options.footerNote}</p>` : ""}
              </td>
            </tr>
            ${buildHotelFooter(variant)}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildGuestIntro(name: string): string {
  return `<p style="margin:0 0 14px;font-size:16px;">Hola <strong>${escapeHtml(name)}</strong>,</p>`;
}

export function getReservationLinks(confirmationCode?: string) {
  const base = getEmailBaseUrl();
  return {
    reservas: base,
    miReserva: `${base}/mi-reserva`,
    whatsapp: buildWhatsAppUrl(
      confirmationCode
        ? `Hola, consulto por mi reserva ${confirmationCode}.`
        : "Hola, tengo una consulta sobre mi reserva."
    ),
  };
}
