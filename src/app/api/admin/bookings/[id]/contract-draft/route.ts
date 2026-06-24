import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { buildBanquetingContract } from "@/lib/build-banqueting-contract";
import type { InvoiceBusinessPayload } from "@/lib/invoice-business";
import { parseInvoiceBusinessValue } from "@/lib/invoice-business";
import { loadHireContractSettingsFromDb } from "@/lib/hire-contract-settings";
import {
  loadBookingContractDraft,
  normalizeContractDraftPayload,
  saveBookingContractDraft,
} from "@/lib/booking-contract-draft";

async function defaultSalesRepName(supabase: NonNullable<ReturnType<typeof getAdminClient>>, userId: string) {
  const { data: st } = await supabase.from("staff").select("display_name").eq("user_id", userId).maybeSingle();
  return st?.display_name?.trim() || "";
}

async function loadBusiness(supabase: NonNullable<ReturnType<typeof getAdminClient>>): Promise<InvoiceBusinessPayload | null> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", "invoice_business").maybeSingle();
  if (!data?.value) return null;
  return parseInvoiceBusinessValue(data.value);
}

async function buildFreshDraft(
  supabase: NonNullable<ReturnType<typeof getAdminClient>>,
  booking: Record<string, unknown>,
  userId: string | undefined,
) {
  const business = await loadBusiness(supabase);
  const hireSettings = await loadHireContractSettingsFromDb(supabase);
  const salesRep = userId ? await defaultSalesRepName(supabase, userId) : "";
  return buildBanquetingContract(
    supabase,
    booking,
    business,
    salesRep ? { salesRep } : {},
    hireSettings,
  );
}

/** Load saved hire contract configuration, or build a fresh draft from the booking. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data: booking, error } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const saved = await loadBookingContractDraft(supabase, bookingId);
    if (saved) {
      return NextResponse.json({
        draft: saved,
        saved: true,
        saved_at: booking.hire_contract_draft_updated_at ?? null,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (!msg.includes("hire_contract_draft") && !msg.includes("does not exist")) {
      return NextResponse.json({ error: msg || "Could not load saved draft" }, { status: 500 });
    }
  }

  const user = await getAuthUserFromRequest(request);
  const draft = await buildFreshDraft(supabase, booking as Record<string, unknown>, user?.id);
  return NextResponse.json({ draft, saved: false, saved_at: null });
}

/** Rebuild draft from booking + settings (discards unsaved UI changes). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await getAuthUserFromRequest(request);
  const draft = await buildFreshDraft(supabase, booking as Record<string, unknown>, user?.id);
  return NextResponse.json({ draft, saved: false, saved_at: booking.hire_contract_draft_updated_at ?? null });
}

/** Persist hire contract configuration for this booking (auto-save from Configure panel). */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId } = await params;
  const body = await request.json().catch(() => ({}));
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const draft = normalizeContractDraftPayload(body.contract ?? body.draft);
  if (!draft) return NextResponse.json({ error: "Invalid contract data" }, { status: 400 });

  const { data: booking } = await supabase.from("bookings").select("id").eq("id", bookingId).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const saved = await saveBookingContractDraft(supabase, bookingId, draft, user);
    return NextResponse.json({
      draft: saved,
      saved: true,
      saved_at: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    if (msg.includes("hire_contract_draft") || msg.includes("does not exist")) {
      return NextResponse.json(
        { error: "Contract save requires migration 047_booking_contract_draft.sql in Supabase." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
