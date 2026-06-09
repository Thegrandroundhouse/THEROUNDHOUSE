import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { buildBanquetingContract, type BuildContractOptions } from "@/lib/build-banqueting-contract";
import type { InvoiceBusinessPayload } from "@/lib/invoice-business";
import { parseInvoiceBusinessValue } from "@/lib/invoice-business";
import { loadHireContractSettingsFromDb } from "@/lib/hire-contract-settings";

async function loadBusiness(supabase: NonNullable<ReturnType<typeof getAdminClient>>): Promise<InvoiceBusinessPayload | null> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", "invoice_business").maybeSingle();
  if (!data?.value) return null;
  return parseInvoiceBusinessValue(data.value);
}

/** Draft structured hire contract from booking (for generate UI). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const business = await loadBusiness(supabase);
  const hireSettings = await loadHireContractSettingsFromDb(supabase);
  const draft = await buildBanquetingContract(supabase, booking as Record<string, unknown>, business, {}, hireSettings);
  return NextResponse.json({ draft });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId } = await params;
  const body = await request.json().catch(() => ({}));
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const business = await loadBusiness(supabase);
  const hireSettings = await loadHireContractSettingsFromDb(supabase);
  const overrides = (body.options && typeof body.options === "object" ? body.options : {}) as BuildContractOptions;
  const draft = await buildBanquetingContract(
    supabase,
    booking as Record<string, unknown>,
    business,
    overrides,
    hireSettings,
  );
  return NextResponse.json({ draft });
}
