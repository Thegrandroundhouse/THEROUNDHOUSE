"use client";

import { useMemo } from "react";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function AgreementLivePreview({
  venueName,
  venueTagline,
  agreementTitle,
  clientName,
  clientEmail,
  eventDate,
  eventSlotLabel,
  bookingCode,
  totalGbp,
  bodyText,
}: {
  venueName: string;
  venueTagline: string;
  agreementTitle: string;
  clientName: string;
  clientEmail: string;
  eventDate: string;
  eventSlotLabel: string;
  bookingCode: string;
  totalGbp: string;
  bodyText: string;
}) {
  const html = useMemo(() => {
    const paras = (bodyText || "—")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p class="agpv-p">${esc(p).replace(/\n/g, "<br/>")}</p>`)
      .join("");
    const v = esc(venueName || "Venue");
    const tag = venueTagline ? `<p class="agpv-tag">${esc(venueTagline)}</p>` : "";
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
      *{box-sizing:border-box}
      body{margin:0;padding:28px 40px 48px;background:#fff;color:#1c1917;font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:1.55}
      .agpv-band{height:5px;background:#78350f;margin:-28px -40px 22px}
      .agpv-accent{width:48px;height:3px;background:#b45309;margin-bottom:14px}
      .agpv-venuelab{font-size:7px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#57534e;font-family:system-ui,sans-serif}
      .agpv-venue{font-size:20px;font-weight:700;margin:4px 0 6px;font-family:Georgia,serif}
      .agpv-tag{font-size:9px;color:#57534e;font-style:italic;margin:0 0 18px}
      .agpv-kind{font-size:7px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#92400e;font-family:system-ui,sans-serif;margin-bottom:5px}
      .agpv-title{font-size:18px;font-weight:700;margin:0 0 4px}
      .agpv-sub{font-size:10px;color:#57534e;margin:0 0 16px}
      .agpv-meta{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;padding:14px;background:#faf8f5;border:1px solid #e7e5e4;margin-bottom:20px}
      .agpv-meta dt{font-size:6.5px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:#57534e;margin:0 0 3px;font-family:system-ui,sans-serif}
      .agpv-meta dd{margin:0;font-size:10px}
      .agpv-rule{height:1px;background:#e7e5e4;margin-bottom:16px}
      .agpv-intro{font-size:9px;color:#57534e;margin:0 0 12px;line-height:1.45}
      .agpv-p{margin:0 0 10px;text-align:justify;line-height:1.62}
      .agpv-foot{margin-top:28px;padding-top:10px;border-top:1px solid #e7e5e4;font-size:7px;color:#78716c;text-align:center;font-family:system-ui,sans-serif}
    </style></head><body>
      <div class="agpv-band"></div>
      <div class="agpv-accent"></div>
      <p class="agpv-venuelab">Venue</p>
      <p class="agpv-venue">${v}</p>
      ${tag}
      <p class="agpv-kind">Legal schedule</p>
      <p class="agpv-title">Hire agreement</p>
      <p class="agpv-sub">${esc(agreementTitle || "Agreement")}</p>
      <dl class="agpv-meta">
        <div><dt>Client</dt><dd>${esc(clientName)}</dd></div>
        <div><dt>Email</dt><dd>${esc(clientEmail)}</dd></div>
        <div><dt>Event date</dt><dd>${esc(eventDate)}</dd></div>
        <div><dt>Venue use</dt><dd>${esc(eventSlotLabel)}</dd></div>
        <div><dt>Booking reference</dt><dd>${esc(bookingCode)}</dd></div>
        <div><dt>Agreed total</dt><dd>${esc(totalGbp)}</dd></div>
      </dl>
      <div class="agpv-rule"></div>
      <p class="agpv-intro">The terms below form part of the contract between the client named above and the venue. Please read carefully before signing.</p>
      ${paras}
      <p class="agpv-foot">Live preview — PDF matches this layout</p>
    </body></html>`;
  }, [
    venueName,
    venueTagline,
    agreementTitle,
    clientName,
    clientEmail,
    eventDate,
    eventSlotLabel,
    bookingCode,
    totalGbp,
    bodyText,
  ]);

  return (
    <div className="admin-agreement-preview-iframe-wrap">
      <iframe
        title="Agreement preview"
        className="admin-agreement-preview-iframe"
        srcDoc={html}
        sandbox="allow-same-origin"
      />
    </div>
  );
}
