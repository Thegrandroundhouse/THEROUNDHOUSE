import type { SupabaseClient } from "@supabase/supabase-js";
import { BANQUETING_HIRE_SLUG, BANQUETING_TERMS_SLUG } from "@/lib/roundhouse-contract-types";
import { ROUNDHOUSE_BANQUETING_TERMS_TEXT } from "@/lib/roundhouse-terms-text";
import {
  BANQUETING_HIRE_TEMPLATE_LABEL,
  BANQUETING_TERMS_TEMPLATE_LABEL,
  VENUE_BRAND_NAME,
} from "@/lib/venue-constants";

const HIRE_BODY = `${VENUE_BRAND_NAME} hire contract — generated as a structured PDF from booking data (line items, totals, includes, payment terms).

Use "Generate contract" on a booking to pick sections and edit costs before creating the PDF.
Merge fields below are for reference only; the PDF layout matches the official ${VENUE_BRAND_NAME} contract pack.

Client: {{client_name}}
Event: {{event_date}} · {{event_type}}
Reference: {{booking_code}}
Contract sum: {{total_gbp}}`;

export async function ensureBanquetingTemplates(supabase: SupabaseClient): Promise<void> {
  const rows = [
    {
      name: BANQUETING_HIRE_TEMPLATE_LABEL,
      slug: BANQUETING_HIRE_SLUG,
      body: HIRE_BODY,
      is_preferred: true,
      sort_order: 0,
    },
    {
      name: BANQUETING_TERMS_TEMPLATE_LABEL,
      slug: BANQUETING_TERMS_SLUG,
      body: ROUNDHOUSE_BANQUETING_TERMS_TEXT,
      is_preferred: false,
      sort_order: 1,
    },
  ];

  for (const row of rows) {
    await supabase.from("agreement_templates").upsert(
      {
        ...row,
        custom_fields: [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    );
  }
}

export function isBanquetingHireSlug(slug: string | null | undefined): boolean {
  return slug === BANQUETING_HIRE_SLUG;
}

export function isBanquetingTermsSlug(slug: string | null | undefined): boolean {
  return slug === BANQUETING_TERMS_SLUG;
}
