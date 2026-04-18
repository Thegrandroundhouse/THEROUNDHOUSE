import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";

function safeLike(q: string) {
  const t = q.replace(/%/g, "").replace(/_/g, "").trim().slice(0, 64);
  return t.length >= 2 ? `%${t}%` : null;
}

export async function GET(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const like = safeLike(new URL(request.url).searchParams.get("q") || "");
  if (!like) {
    return NextResponse.json({ bookings: [], invoices: [], staff: [], enquiries: [] });
  }

  const [bc, be, bn, inv, pe, pn, en] = await Promise.all([
    supabase.from("bookings").select("id, booking_code, client_name, client_email, event_date, status").ilike("booking_code", like).limit(6),
    supabase.from("bookings").select("id, booking_code, client_name, client_email, event_date, status").ilike("client_email", like).limit(6),
    supabase.from("bookings").select("id, booking_code, client_name, client_email, event_date, status").ilike("client_name", like).limit(6),
    supabase.from("invoices").select("id, invoice_number, status, booking_id").ilike("invoice_number", like).limit(8),
    supabase.from("profiles").select("id, email, display_name, role").in("role", ["admin", "staff"]).ilike("email", like).limit(6),
    supabase.from("profiles").select("id, email, display_name, role").in("role", ["admin", "staff"]).ilike("display_name", like).limit(6),
    supabase.from("enquiries").select("id, name, email, event_date, status").ilike("email", like).limit(6),
  ]);
  const en2 = await supabase.from("enquiries").select("id, name, email, event_date, status").ilike("name", like).limit(6);

  const bMap = new Map<string, Record<string, unknown>>();
  for (const row of [...(bc.data || []), ...(be.data || []), ...(bn.data || [])]) {
    bMap.set(row.id as string, row as Record<string, unknown>);
  }
  const sMap = new Map<string, Record<string, unknown>>();
  for (const row of [...(pe.data || []), ...(pn.data || [])]) {
    sMap.set(row.id as string, row as Record<string, unknown>);
  }
  const eMap = new Map<string, Record<string, unknown>>();
  for (const row of [...(en.data || []), ...(en2.data || [])]) {
    eMap.set(row.id as string, row as Record<string, unknown>);
  }

  return NextResponse.json({
    bookings: [...bMap.values()].slice(0, 8),
    invoices: inv.data ?? [],
    staff: [...sMap.values()].slice(0, 8),
    enquiries: [...eMap.values()].slice(0, 8),
  });
}
