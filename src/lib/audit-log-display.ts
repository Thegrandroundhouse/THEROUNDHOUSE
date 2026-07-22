/** Human-readable labels and formatting for admin audit log entries. */

import { normalizeStoredUkAddress } from "@/lib/uk-address";

export type AuditDisplayRow = { label: string; value: string };

const BOOKING_LABELS: Record<string, string> = {
  booking_code: "Booking code",
  client_name: "Client name",
  client_email: "Client email",
  client_phone: "Client phone",
  client_address: "Client address",
  event_date: "Event date",
  event_type: "Event type",
  package_name: "Package",
  status: "Status",
  total_gbp: "Contract total",
  deposit_gbp: "Deposit",
  balance_gbp: "Balance",
  special_requirements: "Client requests",
  notes: "Internal notes",
};

const ENQUIRY_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  status: "Status",
  event_date: "Event date",
  function_type: "Function type",
};

const VENDOR_LABELS: Record<string, string> = {
  name: "Vendor name",
  vendor_type: "Type",
  email: "Email",
  phone: "Phone",
};

const PAYMENT_LABELS: Record<string, string> = {
  amount_gbp: "Amount",
  label: "Label",
  method: "Method",
  booking_code: "Booking code",
  client_name: "Client",
};

const HIDDEN_KEYS = new Set(["id", "entity_id", "booking_id", "actor_user_id", "package_id", "enquiry_id"]);

function formatMoney(cents: unknown): string | null {
  if (cents == null || cents === "") return null;
  const n = Number(cents);
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n / 100);
}

function formatDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return String(value);
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatStatus(value: unknown): string {
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Snapshot stored in audit payloads — no internal UUIDs. */
export function bookingAuditSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const code = row.booking_code;
  if (code) out.booking_code = String(code);
  if (row.client_name) out.client_name = row.client_name;
  if (row.client_email) out.client_email = row.client_email;
  if (row.client_phone) out.client_phone = row.client_phone;
  if (row.client_address) {
    const raw = String(row.client_address);
    out.client_address = normalizeStoredUkAddress(raw) || raw;
  }
  if (row.event_date) out.event_date = row.event_date;
  if (row.event_type) out.event_type = row.event_type;
  if (row.package_name) out.package_name = row.package_name;
  if (row.status) out.status = row.status;
  const total = formatMoney(row.total_cents);
  if (total) out.total_gbp = total;
  const deposit = formatMoney(row.deposit_cents);
  if (deposit) out.deposit_gbp = deposit;
  const balance = formatMoney(row.balance_cents);
  if (balance) out.balance_gbp = balance;
  if (row.special_requirements) out.special_requirements = row.special_requirements;
  if (row.notes) out.notes = row.notes;
  return out;
}

export function extractBookingCode(summary: string | null | undefined, payload: Record<string, unknown> | null): string | null {
  if (payload?.booking_code && String(payload.booking_code).trim()) {
    return String(payload.booking_code).trim();
  }
  if (!summary) return null;
  const m = summary.match(/\b(TGRH-[A-Z0-9]{5})\b/i);
  return m ? m[1].toUpperCase() : null;
}

function labelMap(entityType: string): Record<string, string> {
  if (entityType === "booking") return BOOKING_LABELS;
  if (entityType === "enquiry") return ENQUIRY_LABELS;
  if (entityType === "vendor") return VENDOR_LABELS;
  if (entityType === "payment_record") return PAYMENT_LABELS;
  return {};
}

function formatValue(key: string, value: unknown, entityType: string): string {
  if (value == null || value === "") return "—";
  if (key === "status") return formatStatus(value);
  if (key === "event_date") return formatDate(value) ?? String(value);
  if (key.endsWith("_gbp") || key === "amount_gbp") return String(value);
  if (key.endsWith("_cents")) {
    const gbp = formatMoney(value);
    return gbp ?? String(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Turn stored JSON payloads into labelled rows for staff (skips UUIDs). */
export function payloadToDisplayRows(
  payload: Record<string, unknown> | null | undefined,
  entityType: string,
): AuditDisplayRow[] {
  if (!payload || typeof payload !== "object") return [];
  const labels = labelMap(entityType);
  const rows: AuditDisplayRow[] = [];

  const orderedKeys =
    entityType === "booking"
      ? [
          "booking_code",
          "client_name",
          "client_email",
          "client_phone",
          "client_address",
          "event_date",
          "event_type",
          "package_name",
          "status",
          "total_gbp",
          "deposit_gbp",
          "balance_gbp",
          "total_cents",
          "deposit_cents",
          "balance_cents",
          "special_requirements",
          "notes",
        ]
      : Object.keys(labels);

  const seen = new Set<string>();
  for (const key of orderedKeys) {
    if (!(key in payload) || HIDDEN_KEYS.has(key)) continue;
    const raw = payload[key];
    if (raw == null || raw === "") continue;
    seen.add(key);
    rows.push({
      label: labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: formatValue(key, raw, entityType),
    });
  }

  for (const [key, raw] of Object.entries(payload)) {
    if (seen.has(key) || HIDDEN_KEYS.has(key)) continue;
    if (raw == null || raw === "") continue;
    rows.push({
      label: labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: formatValue(key, raw, entityType),
    });
  }

  return rows;
}

export function bookingDeleteSummary(row: Record<string, unknown>): string {
  const code = row.booking_code ? String(row.booking_code) : "";
  const who = String(row.client_name || row.client_email || "Client");
  const date = row.event_date ? String(row.event_date).slice(0, 10) : "";
  const parts = ["Deleted booking"];
  if (code) parts.push(code);
  parts.push(`— ${who}`);
  if (date) parts.push(`· ${date}`);
  return parts.join(" ");
}
