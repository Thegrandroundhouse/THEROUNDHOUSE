import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const { supabase } = auth;
  const { searchParams } = new URL(request.url);
  const done = searchParams.get("done");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const remindFrom = searchParams.get("remind_from");
  const remindTo = searchParams.get("remind_to");
  const q = searchParams.get("q")?.replace(/%/g, "").replace(/_/g, "").trim().slice(0, 80) || "";
  const link = searchParams.get("link");

  let qb = supabase
    .from("reminders")
    .select("id, created_by, title, body, remind_at, done, booking_id, invoice_id, enquiry_id, created_at", { count: "exact" });

  if (done === "true") qb = qb.eq("done", true);
  if (done === "false") qb = qb.eq("done", false);

  if (remindFrom && /^\d{4}-\d{2}-\d{2}$/.test(remindFrom)) {
    qb = qb.gte("remind_at", `${remindFrom}T00:00:00`);
  }
  if (remindTo && /^\d{4}-\d{2}-\d{2}$/.test(remindTo)) {
    qb = qb.lte("remind_at", `${remindTo}T23:59:59.999`);
  }

  if (q.length >= 2) {
    const like = `%${q}%`;
    qb = qb.or(`title.ilike.${like},body.ilike.${like}`);
  }

  if (link === "booking") qb = qb.not("booking_id", "is", null);
  else if (link === "invoice") qb = qb.not("invoice_id", "is", null);
  else if (link === "enquiry") qb = qb.not("enquiry_id", "is", null);
  else if (link === "standalone") {
    qb = qb.is("booking_id", null).is("invoice_id", null).is("enquiry_id", null);
  }

  const { data, error, count } = await qb.order("remind_at", { ascending: true }).range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = count ?? 0;
  return NextResponse.json({
    rows: data ?? [],
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const { user, supabase } = auth;
  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  const remindAt = body.remind_at;
  if (!remindAt || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(remindAt)))
    return NextResponse.json({ error: "Valid remind_at (ISO datetime) is required" }, { status: 400 });
  const { data, error } = await supabase
    .from("reminders")
    .insert({
      created_by: user.id,
      title,
      body: typeof body.body === "string" ? body.body.trim() || null : null,
      remind_at: remindAt,
      booking_id: body.booking_id || null,
      invoice_id: body.invoice_id || null,
      enquiry_id: body.enquiry_id || null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
