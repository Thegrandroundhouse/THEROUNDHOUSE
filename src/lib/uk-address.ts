/** UK postal address helpers for bookings / hire contracts. */

export type UkAddressParts = {
  line1: string;
  line2: string;
  town: string;
  postcode: string;
};

const EMPTY: UkAddressParts = { line1: "", line2: "", town: "", postcode: "" };

/** Full Royal Mail–style outward+inward postcode (e.g. RM8 2HY). */
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export function looksLikeUkPostcode(value: string): boolean {
  return UK_POSTCODE_RE.test(value.trim());
}

/** Uppercase and insert the standard space before the inward code. */
export function normalizeUkPostcode(raw: string): string {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  if (compact.length < 5) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

/**
 * Compose a multi-line UK address for storage and PDF:
 * street → optional line 2 → town → postcode
 */
export function formatUkAddress(parts: UkAddressParts): string {
  const line1 = parts.line1.trim();
  const line2 = parts.line2.trim();
  const town = parts.town.trim().toUpperCase();
  const postcodeRaw = parts.postcode.trim();
  const postcode = postcodeRaw
    ? looksLikeUkPostcode(postcodeRaw)
      ? normalizeUkPostcode(postcodeRaw)
      : postcodeRaw.toUpperCase()
    : "";
  return [line1, line2, town, postcode].filter(Boolean).join("\n");
}

/** Split a stored multi-line (or comma-separated) address back into fields. */
export function parseUkAddress(raw: string | null | undefined): UkAddressParts {
  if (!raw?.trim()) return { ...EMPTY };

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { ...EMPTY };

  // Single-line legacy: try comma split
  if (lines.length === 1 && lines[0]!.includes(",")) {
    return parseUkAddress(lines[0]!.split(",").map((s) => s.trim()).join("\n"));
  }

  const rest = [...lines];
  let postcode = "";
  let town = "";

  const last = rest[rest.length - 1] ?? "";
  if (looksLikeUkPostcode(last) || /^[A-Z]{1,2}\d/i.test(last)) {
    postcode = looksLikeUkPostcode(last) ? normalizeUkPostcode(last) : last.toUpperCase();
    rest.pop();
  }

  if (rest.length) {
    town = rest.pop()!;
  }

  return {
    line1: rest[0] ?? "",
    line2: rest.slice(1).join(", "),
    town,
    postcode,
  };
}

/** Re-parse + reformat any stored address (APIs, PDF builders). Empty → null. */
export function normalizeStoredUkAddress(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const formatted = formatUkAddress(parseUkAddress(trimmed));
  return formatted || null;
}
