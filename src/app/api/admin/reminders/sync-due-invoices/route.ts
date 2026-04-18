import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";

/**
 * Create reminders for sent invoices that are due or overdue (no open reminder yet).
 */
export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);
  const weekAhead = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

  const { data: invoices, error: e1 } = await supabase
    .from("invoices")
    .select("id, invoice_number, due_date, client_name, amount_cents, status")
    .eq("status", "sent")
    .not("due_date", "is", null)
    .lte("due_date", weekAhead);

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const { data: existing, error: e2 } = await supabase
    .from("reminders")
    .select("invoice_id")
    .eq("done", false)
    .not("invoice_id", "is", null);

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const seen = new Set((existing || []).map((r: { invoice_id: string }) => r.invoice_id).filter(Boolean));
  let created = 0;
  const gbp = (c: number) => `£${(c / 100).toFixed(2)}`;

  for (const inv of invoices || []) {
    if (seen.has(inv.id)) continue;
    const due = inv.due_date as string;
    if (due > weekAhead) continue;
    const overdue = due < today;
    const title = overdue
      ? `Overdue: ${inv.invoice_number} (${gbp(inv.amount_cents as number)})`
      : due === today
        ? `Due today: ${inv.invoice_number} (${gbp(inv.amount_cents as number)})`
        : `Invoice due ${due}: ${inv.invoice_number} (${gbp(inv.amount_cents as number)})`;
    const body = `${inv.client_name || "Client"} · due ${due}`;
    const remindAt = `${due}T09:00:00.000Z`;
    const { error: ins } = await supabase.from("reminders").insert({
      created_by: user.id,
      title,
      body,
      remind_at: remindAt,
      invoice_id: inv.id,
      updated_at: new Date().toISOString(),
    });
    if (!ins) {
      created++;
      seen.add(inv.id);
    }
  }

  return NextResponse.json({ created, checked: (invoices || []).length });
}
