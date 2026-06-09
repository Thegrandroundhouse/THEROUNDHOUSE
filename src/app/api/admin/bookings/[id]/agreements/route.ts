import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { getBookingSlotsConfig } from "@/lib/booking-slots";
import { mergeAgreementBody } from "@/lib/agreement-merge";
import { loadAgreementMergeVars } from "@/lib/agreement-merge-load";
import type { InvoiceBusinessPayload } from "@/lib/invoice-business";
import { parseInvoiceBusinessValue } from "@/lib/invoice-business";
import {
  buildBanquetingContract,
  contractDataToSummaryText,
  applyLineItemTotalsToContract,
  parseContractData,
  type BuildContractOptions,
} from "@/lib/build-banqueting-contract";
import { ensureBanquetingTemplates, isBanquetingHireSlug } from "@/lib/banqueting-templates-seed";
import { loadHireContractSettingsFromDb } from "@/lib/hire-contract-settings";
import type { RoundhouseContractData } from "@/lib/roundhouse-contract-types";

async function loadBusiness(supabase: NonNullable<ReturnType<typeof getAdminClient>>): Promise<InvoiceBusinessPayload | null> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", "invoice_business").maybeSingle();
  if (!data?.value) return null;
  return parseInvoiceBusinessValue(data.value);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data, error } = await supabase
    .from("booking_agreements")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });
  if (error) {
    if (error.code === "42P01") return NextResponse.json({ rows: [], needsMigration: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId } = await params;
  const body = await request.json().catch(() => ({}));
  const templateId = String(body.template_id || "").trim();
  if (!templateId) return NextResponse.json({ error: "template_id required" }, { status: 400 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  await ensureBanquetingTemplates(supabase);

  const [{ data: booking }, { data: tmpl }] = await Promise.all([
    supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle(),
    supabase.from("agreement_templates").select("*").eq("id", templateId).maybeSingle(),
  ]);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (!tmpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const business = await loadBusiness(supabase);
  const slug = String(tmpl.slug || "");

  let rendered: string;
  let customValues: Record<string, unknown>;

  if (isBanquetingHireSlug(slug)) {
    let contractData: RoundhouseContractData;
    const parsed = parseContractData(body.contract);
    if (parsed) {
      contractData = parsed;
    } else {
      const opts = (body.options && typeof body.options === "object" ? body.options : {}) as BuildContractOptions;
      const hireSettings = await loadHireContractSettingsFromDb(supabase);
      contractData = await buildBanquetingContract(
        supabase,
        booking as Record<string, unknown>,
        business,
        opts,
        hireSettings,
      );
    }
    rendered = contractDataToSummaryText(contractData);
    customValues = applyLineItemTotalsToContract(contractData) as unknown as Record<string, unknown>;
  } else {
    const config = await getBookingSlotsConfig(supabase);
    const slotKey = booking.event_slot_key as string | null;
    const event_slot_label =
      slotKey && String(slotKey).trim()
        ? (() => {
            const def = config.slots.find((s) => s.key === slotKey);
            return def ? `${def.label}${def.timeLabel ? ` · ${def.timeLabel}` : ""}` : slotKey;
          })()
        : "Full venue (whole day)";

    const { vars: mergeVars } = await loadAgreementMergeVars(
      supabase,
      booking as Record<string, unknown>,
      business ? { venueName: business.venueName } : null,
      event_slot_label,
    );
    const vars = { ...mergeVars } as Record<string, string>;
    const customVals = (body.custom_values && typeof body.custom_values === "object" ? body.custom_values : {}) as Record<
      string,
      string
    >;
    for (const [k, v] of Object.entries(customVals)) {
      vars[k] = String(v);
    }
    rendered = mergeAgreementBody(tmpl.body as string, vars);
    customValues = customVals;
  }

  const title =
    String(body.title || "").trim() ||
    (isBanquetingHireSlug(slug)
      ? `Hire contract — ${(booking as { client_name?: string }).client_name || "Client"}`
      : String(tmpl.name));

  const { data, error } = await supabase
    .from("booking_agreements")
    .insert({
      booking_id: bookingId,
      template_id: templateId,
      title,
      rendered_body: rendered,
      custom_values: customValues,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
