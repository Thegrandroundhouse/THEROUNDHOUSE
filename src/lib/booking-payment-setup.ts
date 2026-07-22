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

export type PaymentSchedulePreviewMilestone = {
  label: string;
  amount_cents: number;
  dueNote: string;
  previous_amount_cents: number | null;
  status: string | null;
};

export type PaymentSchedulePreview = {
  contractSumCents: number;
  previousMilestoneSumCents: number;
  changed: boolean;
  hasExisting: boolean;
  lineItems: {
    description: string;
    qty: number;
    unitCostCents: number;
    discountCents: number;
    included: boolean;
    lineTotalCents: number;
  }[];
  discountTotalCents: number;
  proposed: PaymentSchedulePreviewMilestone[];
};

/** Preview how the 4-instalment plan would look for the current contract sum / line items. */
export async function previewBookingPaymentSchedule(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<PaymentSchedulePreview | null> {
  const { data: booking } = await supabase
    .from("bookings")
    .select("total_cents, deposit_cents, balance_cents, hire_contract_draft")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return null;

  const settings = await loadHireContractSettingsFromDb(supabase);
  const draft = booking.hire_contract_draft as {
    lineItems?: {
      description?: string;
      qty?: number;
      unitCostCents?: number;
      discountCents?: number;
      included?: boolean;
    }[];
    contractSumCents?: number;
    discountTotalCents?: number;
  } | null;

  let contractSum = contractSumFromBooking(booking);
  let discountTotalCents = 0;
  const lineItems: PaymentSchedulePreview["lineItems"] = [];

  if (draft && Array.isArray(draft.lineItems) && draft.lineItems.length > 0) {
    for (const row of draft.lineItems) {
      const qty = Math.max(1, Math.round(Number(row.qty) || 1));
      const unit = Math.max(0, Math.round(Number(row.unitCostCents) || 0));
      const disc = Math.max(0, Math.round(Number(row.discountCents) || 0));
      const included = row.included !== false;
      const lineTotal = included ? Math.max(0, qty * unit - disc) : 0;
      if (included) discountTotalCents += disc;
      lineItems.push({
        description: String(row.description || "Item"),
        qty,
        unitCostCents: unit,
        discountCents: disc,
        included,
        lineTotalCents: lineTotal,
      });
    }
    if (typeof draft.contractSumCents === "number" && draft.contractSumCents >= 0) {
      contractSum = draft.contractSumCents;
    } else {
      contractSum = lineItems.reduce((s, r) => s + r.lineTotalCents, 0);
    }
    if (typeof draft.discountTotalCents === "number") discountTotalCents = draft.discountTotalCents;
  }

  const schedule = buildPaymentScheduleFromTemplate(contractSum, settings.paymentSchedule);
  const { data: existing } = await supabase
    .from("booking_payment_milestones")
    .select("label, amount_cents, status, sort_order")
    .eq("booking_id", bookingId)
    .order("sort_order");

  const existingRows = existing ?? [];
  const previousMilestoneSumCents = existingRows.reduce((s, r) => s + (Number(r.amount_cents) || 0), 0);
  const proposed: PaymentSchedulePreviewMilestone[] = schedule.map((m, i) => {
    const prev = existingRows[i];
    return {
      label: m.label,
      amount_cents: m.amountCents,
      dueNote: m.dueNote,
      previous_amount_cents: prev?.amount_cents != null ? Number(prev.amount_cents) : null,
      status: prev?.status ? String(prev.status) : null,
    };
  });

  const amountsChanged =
    existingRows.length === 0 ||
    proposed.some((p, i) => (existingRows[i]?.amount_cents ?? null) !== p.amount_cents) ||
    previousMilestoneSumCents !== contractSum;

  return {
    contractSumCents: contractSum,
    previousMilestoneSumCents,
    changed: amountsChanged,
    hasExisting: existingRows.length > 0,
    lineItems,
    discountTotalCents,
    proposed,
  };
}

/**
 * Rebuild instalment amounts from the current contract sum.
 * Keeps paid/partial status on matching rows; updates amounts & labels from the hire schedule template.
 */
export async function rebuildBookingPaymentMilestones(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<{ rebuilt: boolean; count: number }> {
  const { data: booking } = await supabase
    .from("bookings")
    .select("total_cents, deposit_cents, balance_cents, hire_contract_draft")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) throw new Error("Booking not found");

  const draft = booking.hire_contract_draft as { contractSumCents?: number } | null;
  const money: BookingMoneyFields = {
    total_cents:
      typeof draft?.contractSumCents === "number" && draft.contractSumCents > 0
        ? draft.contractSumCents
        : booking.total_cents,
    deposit_cents: booking.deposit_cents,
    balance_cents: booking.balance_cents,
  };
  const contractSum = contractSumFromBooking(money);
  if (contractSum <= 0) throw new Error("Set a contract total first");

  // Keep booking.total_cents aligned with draft when rebuilding.
  if (booking.total_cents !== contractSum) {
    await supabase.from("bookings").update({ total_cents: contractSum }).eq("id", bookingId);
  }

  const settings = await loadHireContractSettingsFromDb(supabase);
  const schedule = buildPaymentScheduleFromTemplate(contractSum, settings.paymentSchedule);

  const { data: existing } = await supabase
    .from("booking_payment_milestones")
    .select("id, status, sort_order")
    .eq("booking_id", bookingId)
    .order("sort_order");

  const rows = existing ?? [];

  if (rows.length === 0) {
    await seedBookingPaymentMilestones(supabase, bookingId, money, settings);
    return { rebuilt: true, count: schedule.length };
  }

  for (let i = 0; i < schedule.length; i++) {
    const m = schedule[i]!;
    const row = rows[i];
    if (row) {
      const { error } = await supabase
        .from("booking_payment_milestones")
        .update({
          label: m.label,
          amount_cents: m.amountCents > 0 ? m.amountCents : null,
          notes: m.dueNote || null,
          sort_order: i,
        })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("booking_payment_milestones").insert({
        booking_id: bookingId,
        sort_order: i,
        label: m.label,
        amount_cents: m.amountCents > 0 ? m.amountCents : null,
        status: "pending",
        notes: m.dueNote || null,
      });
      if (error) throw new Error(error.message);
    }
  }

  for (let i = schedule.length; i < rows.length; i++) {
    const row = rows[i]!;
    if (row.status === "paid" || row.status === "partial") continue;
    await supabase.from("booking_payment_milestones").delete().eq("id", row.id);
  }

  return { rebuilt: true, count: schedule.length };
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

/** Sum of customer_in payments for a booking. */
export async function getBookingPaidCents(supabase: SupabaseClient, bookingId: string): Promise<number> {
  const { data } = await supabase
    .from("payment_records")
    .select("amount_cents")
    .eq("booking_id", bookingId)
    .eq("flow", "customer_in");
  return (data ?? []).reduce((sum, r) => sum + (r.amount_cents || 0), 0);
}

/**
 * Make ledger paid total equal targetCents (for list/table quick edit).
 * Adds an adjustment payment when increasing; trims newest payments when decreasing.
 */
export async function setBookingPaidToTarget(
  supabase: SupabaseClient,
  bookingId: string,
  targetCents: number,
): Promise<{ paidCents: number; adjusted: boolean }> {
  const target = Math.max(0, Math.round(Number(targetCents) || 0));
  const current = await getBookingPaidCents(supabase, bookingId);
  const diff = target - current;
  if (diff === 0) return { paidCents: current, adjusted: false };

  if (diff > 0) {
    await recordBookingCustomerPayment(
      supabase,
      bookingId,
      diff,
      "Paid total (list edit)",
      "Adjusted from bookings list",
    );
    return { paidCents: target, adjusted: true };
  }

  let remaining = -diff;
  const { data: rows } = await supabase
    .from("payment_records")
    .select("id, amount_cents")
    .eq("booking_id", bookingId)
    .eq("flow", "customer_in")
    .order("paid_at", { ascending: false });

  for (const row of rows ?? []) {
    if (remaining <= 0) break;
    const amt = row.amount_cents || 0;
    if (amt <= 0) continue;
    if (amt <= remaining) {
      const { error } = await supabase.from("payment_records").delete().eq("id", row.id);
      if (error) throw new Error(error.message);
      remaining -= amt;
    } else {
      const { error } = await supabase
        .from("payment_records")
        .update({ amount_cents: amt - remaining })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
      remaining = 0;
    }
  }

  const paidCents = await getBookingPaidCents(supabase, bookingId);
  return { paidCents, adjusted: true };
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
