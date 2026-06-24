import { VENUE_BRAND_NAME, VENUE_CONTACT_EMAIL } from "@/lib/venue-constants";

export type EmailAttachment = {
  filename: string;
  content: Buffer;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
};

export function isEmailSendingConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendTransactionalEmail(
  input: SendEmailInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string; configured: boolean }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "Email sending is not configured (set RESEND_API_KEY).", configured: false };
  }

  const fromName = process.env.EMAIL_FROM_NAME?.trim() || VENUE_BRAND_NAME;
  const fromEmail = process.env.EMAIL_FROM?.trim() || VENUE_CONTACT_EMAIL;
  const from = `${fromName} <${fromEmail}>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo || fromEmail,
      attachments: (input.attachments ?? []).map((a) => ({
        filename: a.filename,
        content: a.content.toString("base64"),
      })),
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) {
    return {
      ok: false,
      configured: true,
      error: data.message || `Email provider error (${res.status})`,
    };
  }
  return { ok: true, id: data.id || "sent" };
}
