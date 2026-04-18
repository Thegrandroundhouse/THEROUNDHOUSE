import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";

const STATUSES = new Set(["pending", "partial", "paid", "refunded", "waived"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ milestoneId: string }> }) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { milestoneId } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const { data: row, error: fetchErr } = await supabase
    .from("booking_payment_milestones")
    .select("*")
    .eq("id", milestoneId)
    .maybeSingle();
  if (fetchErr || !row) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });

  const patch: Record<string, unknown> = {};

  if (body.status !== undefined) {
    const status = String(body.status || "").trim();
    if (!STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid status (pending | partial | paid | refunded | waived)" }, { status: 400 });
    }
    patch.status = status;
    if (status === "paid") {
      patch.paid_at = body.paid_at ? String(body.paid_at) : new Date().toISOString().slice(0, 10);
    } else {
      patch.paid_at = body.paid_at === null ? null : body.paid_at ? String(body.paid_at) : null;
    }
  }

  if (body.amount_cents !== undefined) {
    if (body.amount_cents === null || body.amount_cents === "") {
      patch.amount_cents = null;
    } else {
      const n = Number(body.amount_cents);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }
      patch.amount_cents = Math.round(n);
    }
  }

  if (body.due_date !== undefined) {
    const d = body.due_date;
    patch.due_date = d === null || d === "" ? null : String(d).slice(0, 10);
  }

  if (body.label !== undefined) {
    const lab = String(body.label || "").trim();
    if (!lab) return NextResponse.json({ error: "Label cannot be empty" }, { status: 400 });
    patch.label = lab;
  }

  if (body.notes !== undefined) patch.notes = body.notes === null ? null : String(body.notes);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Send status, amount_cents, due_date, label, and/or notes" }, { status: 400 });
  }

  const { data, error } = await supabase.from("booking_payment_milestones").update(patch).eq("id", milestoneId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
