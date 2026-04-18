import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvoiceBusinessPayload } from "@/app/api/admin/settings/invoice-business/route";
import { bookingToMergeVars, type BookingMergeVars } from "@/lib/agreement-merge";

function gbp(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return "—";
  return `£${(cents / 100).toFixed(2)}`;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "pending",
  partial: "partial",
  paid: "paid",
  refunded: "refunded",
  waived: "waived",
};

export type AgreementAppendixRow = { label: string; value: string };

export async function loadAgreementMergeVars(
  supabase: SupabaseClient,
  booking: Record<string, unknown>,
  business: Pick<InvoiceBusinessPayload, "venueName"> | null,
  event_slot_label: string,
): Promise<{ vars: Record<string, string>; appendix: AgreementAppendixRow[] }> {
  const base = bookingToMergeVars(
    booking as Parameters<typeof bookingToMergeVars>[0],
    business,
    event_slot_label,
  ) as BookingMergeVars & Record<string, string>;
  const bookingId = String(booking.id || "");
  const extras = String(booking.extras || "").trim();
  const spec = String(booking.special_requirements || "").trim();
  const event_type = String(booking.event_type || "").trim() || "—";
  const package_name = String(booking.package_name || "").trim() || "—";

  const rawEventDate = booking.event_date as string | null | undefined;
  let event_date_formatted = rawEventDate || "—";
  if (rawEventDate && /^\d{4}-\d{2}-\d{2}$/.test(rawEventDate)) {
    event_date_formatted = new Date(rawEventDate + "T12:00:00").toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  const deposit_cents = booking.deposit_cents as number | null | undefined;
  let balance_cents = booking.balance_cents as number | null | undefined;
  const total_cents = booking.total_cents as number | null | undefined;
  if (
    (balance_cents == null || !Number.isFinite(balance_cents)) &&
    total_cents != null &&
    deposit_cents != null &&
    Number.isFinite(total_cents) &&
    Number.isFinite(deposit_cents)
  ) {
    balance_cents = Math.max(0, total_cents - deposit_cents);
  }
  if (
    (balance_cents == null || !Number.isFinite(balance_cents)) &&
    total_cents != null &&
    Number.isFinite(total_cents) &&
    (deposit_cents == null || !Number.isFinite(deposit_cents))
  ) {
    balance_cents = total_cents;
  }

  const [{ data: bvRows }, { data: wd }, { data: ms }] = await Promise.all([
    bookingId
      ? supabase.from("booking_vendors").select("role, vendors(name)").eq("booking_id", bookingId)
      : Promise.resolve({ data: [] as unknown[] }),
    bookingId
      ? supabase.from("booking_wedding_details").select("guest_count").eq("booking_id", bookingId).maybeSingle()
      : Promise.resolve({ data: null }),
    bookingId
      ? supabase.from("booking_payment_milestones").select("label, amount_cents, status, due_date, sort_order").eq("booking_id", bookingId).order("sort_order")
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  type BVRow = { role: string | null; vendors: { name: string } | null };
  const vendors: BVRow[] = Array.isArray(bvRows) ? (bvRows as BVRow[]) : [];
  const vendors_list =
    vendors.length === 0
      ? "   (No suppliers linked yet — add in booking workspace.)"
      : vendors
          .map((r) => {
            const name = r.vendors?.name || "Supplier";
            const role = r.role?.trim() ? ` (${r.role})` : "";
            return `   • ${name}${role}`;
          })
          .join("\n");

  type MsRow = { label: string; amount_cents: number | null; status: string; due_date: string | null };
  const milestones: MsRow[] = Array.isArray(ms) ? (ms as MsRow[]) : [];
  const payment_schedule =
    milestones.length === 0
      ? "   (No milestones — set deposit & balance in booking workspace.)"
      : milestones
          .map((m) => {
            const st = STATUS_LABEL[m.status] || m.status;
            const due = m.due_date || "TBC";
            return `   • ${m.label}: ${gbp(m.amount_cents)} — ${st} — due ${due}`;
          })
          .join("\n");

  const guest_count =
    wd?.guest_count != null && Number.isFinite(wd.guest_count) ? String(wd.guest_count) : "—";

  const vars: Record<string, string> = {
    ...base,
    event_date: event_date_formatted,
    event_type,
    package_name,
    guest_count,
    vendors_list,
    payment_schedule,
    deposit_gbp: gbp(deposit_cents ?? null),
    balance_gbp: gbp(balance_cents ?? null),
    extras_block: extras ? `Extras & add-ons:\n${extras}` : "Extras: None recorded.",
    special_requirements_block: spec ? `Special requirements:\n${spec}` : "Special requirements: None recorded.",
  };

  const appendix: AgreementAppendixRow[] = [
    { label: "Event type", value: event_type },
    { label: "Package / hire", value: package_name },
    { label: "Guest count", value: guest_count },
    { label: "Deposit", value: vars.deposit_gbp },
    { label: "Balance", value: vars.balance_gbp },
    { label: "Agreed total", value: vars.total_gbp },
    {
      label: "Linked suppliers",
      value: vendors.length ? vendors.map((r) => `${r.vendors?.name || "?"}${r.role ? ` (${r.role})` : ""}`).join("; ") : "—",
    },
    {
      label: "Payment schedule",
      value: milestones.length
        ? milestones.map((m) => `${m.label} ${gbp(m.amount_cents)} [${m.status}]`).join(" · ")
        : "—",
    },
  ];
  if (extras) appendix.push({ label: "Extras", value: extras.slice(0, 500) });
  if (spec) appendix.push({ label: "Special requirements", value: spec.slice(0, 500) });

  return { vars, appendix };
}
