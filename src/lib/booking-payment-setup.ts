import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildPaymentScheduleFromTemplate,
  HIRE_CONTRACT_SETTINGS_DEFAULTS,
  loadHireContractSettingsFromDb,
  type HireContractSettingsPayload,
} from "@/lib/hire-contract-settings";

export type SetupBookingPaymentsInput = {
  total_cents: number | null;
  deposit_cents: number | null;
  balance_cents: number | null;
  received_cents?: number | null;
  received_label?: string;
  /** When false, ledger entry is created but instalments are not marked paid. Default true. */
  sync_milestones?: boolean;
};

export type BookingMoneyFields = {
  total_cents?: number | null;
  deposit_cents?: number | null;
  balance_cents?: number | null;
};

/** Contract sum for hire schedule — matches buildBanquetingContract logic. */
export function contractSumFromBooking(booking: BookingMoneyFields): number {
  if (booking.total_cents != null && booking.total_cents > 0) return booking.total_cents;
  const deposit = booking.deposit_cents ?? 0;
  const balance = booking.balance_cents ?? 0;
  if (deposit + balance > 0) return deposit + balance;
  if (deposit > 0) return deposit;
  return 0;
}

/** One hire-contract instalment (25% × 4 by default). */
export async function seedBookingPaymentMilestones(
  supabase: SupabaseClient,
  bookingId: string,
  booking: BookingMoneyFields,
  hireSettings?: HireContractSettingsPayload,
): Promise<{ id: string; label: string; amount_cents: number | null; sort_order: number }[]> {
  const settings = hireSettings ?? (await loadHireContractSettingsFromDb(supabase));
  const contractSum = contractSumFromBooking(booking);

  const schedule =
    contractSum > 0
      ? buildPaymentScheduleFromTemplate(contractSum, settings.paymentSchedule)
      : settings.paymentSchedule.map((t) => ({ label: t.label, amountCents: 0, dueNote: t.dueNote }));

  const rows = schedule.map((m, i) => ({
    sort_order: i,
    label: m.label,
    amount_cents: m.amountCents > 0 ? m.amountCents : null,
    status: "pending" as const,
    notes: m.dueNote || null,
  }));

  const { data, error } = await supabase
    .from("booking_payment_milestones")
    .insert(rows.map((r) => ({ ...r, booking_id: bookingId })))
    .select("id, label, amount_cents, sort_order");

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Create hire-contract instalments when missing (existing bookings + before recording payments). */
export async function ensureBookingPaymentMilestones(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<{ created: boolean; count: number }> {
  const { data: booking } = await supabase
    .from("bookings")
    .select("total_cents, deposit_cents, balance_cents")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { created: false, count: 0 };

  const { count: existing } = await supabase
    .from("booking_payment_milestones")
    .select("*", { count: "exact", head: true })
    .eq("booking_id", bookingId);

  if ((existing ?? 0) > 0) return { created: false, count: existing ?? 0 };

  const contractSum = contractSumFromBooking(booking);
  if (contractSum <= 0) return { created: false, count: 0 };

  await seedBookingPaymentMilestones(supabase, bookingId, booking);
  const { count } = await supabase
    .from("booking_payment_milestones")
    .select("*", { count: "exact", head: true })
    .eq("booking_id", bookingId);

  return { created: true, count: count ?? 0 };
}

export async function recordBookingCustomerPayment(
  supabase: SupabaseClient,
  bookingId: string,
  amount_cents: number,
  label: string,
  notes?: string | null,
): Promise<void> {
  if (amount_cents <= 0) return;
  const { error } = await supabase.from("payment_records").insert({
    booking_id: bookingId,
    flow: "customer_in",
    amount_cents,
    label: label.trim() || "Payment",
    notes: notes?.trim() || null,
    paid_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

/** Apply received money to instalments in order (matches hire contract schedule). */
export async function applyReceivedToMilestones(
  supabase: SupabaseClient,
  bookingId: string,
  received_cents: number,
): Promise<void> {
  if (received_cents <= 0) return;

  const { data: milestones } = await supabase
    .from("booking_payment_milestones")
    .select("id, label, amount_cents, status, sort_order")
    .eq("booking_id", bookingId)
    .order("sort_order");

  if (!milestones?.length) return;

  let remaining = received_cents;
  const today = new Date().toISOString().slice(0, 10);

  for (const m of milestones) {
    if (remaining <= 0) break;
    if (m.status === "paid" || m.status === "waived" || m.status === "refunded") continue;

    const due = m.amount_cents ?? 0;
    if (due <= 0) continue;

    if (remaining >= due) {
      await supabase
        .from("booking_payment_milestones")
        .update({ status: "paid", paid_at: today })
        .eq("id", m.id);
      remaining -= due;
    } else {
      await supabase
        .from("booking_payment_milestones")
        .update({ status: "partial", paid_at: today })
        .eq("id", m.id);
      remaining = 0;
    }
  }
}

export async function setupBookingPayments(
  supabase: SupabaseClient,
  bookingId: string,
  input: SetupBookingPaymentsInput,
): Promise<void> {
  const hasMoney =
    (input.total_cents != null && input.total_cents > 0) ||
    (input.deposit_cents != null && input.deposit_cents > 0) ||
    (input.received_cents != null && input.received_cents > 0);

  if (!hasMoney) return;

  await ensureBookingPaymentMilestones(supabase, bookingId);

  const received = input.received_cents ?? 0;
  if (received > 0) {
    await recordBookingCustomerPayment(
      supabase,
      bookingId,
      received,
      input.received_label?.trim() || "Deposit",
    );
    if (input.sync_milestones !== false) {
      await applyReceivedToMilestones(supabase, bookingId, received);
    }
  }
}

/** Default 25% instalment amount from booking total (for quick-fill UI). */
export function defaultInstalmentCents(booking: BookingMoneyFields): number | null {
  const sum = contractSumFromBooking(booking);
  if (sum <= 0) return null;
  const pct =
    HIRE_CONTRACT_SETTINGS_DEFAULTS.paymentSchedule.find((t) => t.percentOfContract > 0)?.percentOfContract ?? 25;
  return Math.round((sum * pct) / 100);
}
