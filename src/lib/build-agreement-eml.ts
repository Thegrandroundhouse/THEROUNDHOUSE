const CRLF = "\r\n";

function wrapBase64(b64: string, lineLength = 76): string {
  const clean = b64.replace(/\s/g, "");
  const lines: string[] = [];
  for (let i = 0; i < clean.length; i += lineLength) {
    lines.push(clean.slice(i, i + lineLength));
  }
  return lines.join(CRLF);
}

function safeAttachmentFilename(name: string): string {
  const trimmed = name.trim() || "hire-agreement.pdf";
  return trimmed.endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
}

export function buildAgreementEml(params: {
  to: string;
  from?: string;
  subject: string;
  body: string;
  attachment?: { filename: string; contentBase64: string };
}): string {
  const to = params.to.trim();
  const subject = params.subject.trim();
  const body = params.body.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, CRLF);

  if (!params.attachment) {
    return [
      params.from?.trim() ? `From: ${params.from.trim()}` : null,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      body,
    ]
      .filter(Boolean)
      .join(CRLF);
  }

  const boundary = `----=_Agreement_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const filename = safeAttachmentFilename(params.attachment.filename);

  return [
    params.from?.trim() ? `From: ${params.from.trim()}` : null,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    body,
    "",
    `--${boundary}`,
    `Content-Type: application/pdf; name="${filename}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${filename}"`,
    "",
    wrapBase64(params.attachment.contentBase64),
    "",
    `--${boundary}--`,
    "",
  ]
    .filter((line) => line !== null)
    .join(CRLF);
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export type OpenEmlResult = "shared" | "opened" | "downloaded";

/** Open a draft email in Mail, Outlook, or another local client with optional attachment. */
export async function openEmlDraft(eml: string, filename: string): Promise<OpenEmlResult> {
  const blob = new Blob([eml], { type: "message/rfc822" });
  const file = new File([blob], filename, { type: "message/rfc822" });

  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") throw e;
    }
  }

  const url = URL.createObjectURL(blob);

  try {
    const opened = window.open(url, "_blank");
    if (opened) {
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      return "opened";
    }
  } catch {
    // fall through to download
  }

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
