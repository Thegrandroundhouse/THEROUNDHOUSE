import type { PaymentSchedulePreview } from "@/lib/booking-payment-setup";

function gbp(cents: number): string {
  return `£${(cents / 100).toFixed(2)}`;
}

/** Human-readable confirm copy for creating / updating the 4-instalment plan. */
export function formatPaymentScheduleConfirmMessage(preview: PaymentSchedulePreview): string {
  const lines: string[] = [];

  if (preview.hasExisting && preview.changed) {
    lines.push(
      "The contract total or line items changed since the instalment plan was set. Confirm the updated 4-payment schedule:",
    );
  } else if (preview.hasExisting) {
    lines.push("Rebuild the 4-payment schedule from the current contract sum?");
  } else {
    lines.push("Create the standard 4-instalment payment plan from this contract?");
  }
  lines.push("");

  if (preview.lineItems.length > 0) {
    lines.push("Breakdown:");
    for (const row of preview.lineItems) {
      if (!row.included) {
        lines.push(`• (excluded) ${row.description}`);
        continue;
      }
      const disc = row.discountCents > 0 ? ` − discount ${gbp(row.discountCents)}` : "";
      lines.push(
        `• ${row.description} × ${row.qty} @ ${gbp(row.unitCostCents)}${disc} = ${gbp(row.lineTotalCents)}`,
      );
    }
    if (preview.discountTotalCents > 0) {
      lines.push(`Discounts total: −${gbp(preview.discountTotalCents)}`);
    }
    lines.push("");
  }

  if (preview.hasExisting && preview.previousMilestoneSumCents !== preview.contractSumCents) {
    lines.push(
      `Contract sum: ${gbp(preview.contractSumCents)} (plan was based on ${gbp(preview.previousMilestoneSumCents)})`,
    );
  } else {
    lines.push(`Contract sum: ${gbp(preview.contractSumCents)}`);
  }
  lines.push("");
  lines.push("4 payments:");
  preview.proposed.forEach((m, i) => {
    const prev =
      m.previous_amount_cents != null && m.previous_amount_cents !== m.amount_cents
        ? ` (was ${gbp(m.previous_amount_cents)})`
        : "";
    const status = m.status && m.status !== "pending" ? ` [${m.status}]` : "";
    lines.push(`${i + 1}. ${m.label} — ${gbp(m.amount_cents)}${prev}${status}`);
  });
  lines.push("");
  lines.push("Paid / partial instalments keep their status; amounts update to match the new total.");

  return lines.join("\n");
}
