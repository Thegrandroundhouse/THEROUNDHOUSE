import { siteConfig } from "@/data/site";

export type AgreementEmailContext = {
  clientName: string;
  clientEmail: string;
  eventDateLabel: string;
  bookingCode?: string | null;
  agreementTitle: string;
  venueName?: string;
  venuePhone?: string;
  venueEmail?: string;
  salesRep?: string;
  totalGbp?: string;
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function composeAgreementEmail(ctx: AgreementEmailContext): {
  subject: string;
  html: string;
  text: string;
} {
  const venue = ctx.venueName?.trim() || siteConfig.venueName;
  const phone = ctx.venuePhone?.trim() || siteConfig.phone;
  const email = ctx.venueEmail?.trim() || siteConfig.email;
  const client = ctx.clientName.trim() || "there";
  const rep = ctx.salesRep?.trim();
  const ref = ctx.bookingCode ? ` (ref ${ctx.bookingCode})` : "";

  const subject = `Your hire agreement — ${venue}${ref}`;

  const text = [
    `Dear ${client},`,
    "",
    `Thank you for choosing ${venue}. Please find your ${ctx.agreementTitle} attached for your event on ${ctx.eventDateLabel}${ref}.`,
    "",
    ctx.totalGbp ? `Contract total: ${ctx.totalGbp}` : "",
    "",
    "Please review the document carefully. If everything looks correct, sign and return a copy at your earliest convenience. If you have any questions about payment instalments or the event details, reply to this email and we will be happy to help.",
    "",
    rep ? `Your sales representative: ${rep}` : "",
    "",
    "Kind regards,",
    rep || venue,
    venue,
    phone ? `Tel: ${phone}` : "",
    email,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const html = `
<div style="font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6; max-width: 560px;">
  <p style="margin: 0 0 1rem;">Dear ${esc(client)},</p>
  <p style="margin: 0 0 1rem;">Thank you for choosing <strong>${esc(venue)}</strong>. Please find your <strong>${esc(ctx.agreementTitle)}</strong> attached for your event on <strong>${esc(ctx.eventDateLabel)}</strong>${esc(ref)}.</p>
  ${ctx.totalGbp ? `<p style="margin: 0 0 1rem;">Contract total: <strong>${esc(ctx.totalGbp)}</strong></p>` : ""}
  <p style="margin: 0 0 1rem;">Please review the document carefully. If everything looks correct, sign and return a copy at your earliest convenience. If you have any questions about payment instalments or the event details, reply to this email and we will be happy to help.</p>
  ${rep ? `<p style="margin: 0 0 1rem;">Your sales representative: <strong>${esc(rep)}</strong></p>` : ""}
  <p style="margin: 1.25rem 0 0;">Kind regards,<br/><strong>${esc(rep || venue)}</strong><br/>${esc(venue)}<br/>${phone ? `Tel: ${esc(phone)}<br/>` : ""}${esc(email)}</p>
</div>`.trim();

  return { subject, html, text };
}

export function mailtoAgreementLink(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
