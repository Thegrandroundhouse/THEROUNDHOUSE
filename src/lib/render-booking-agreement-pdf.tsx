import React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AgreementPdfDocument } from "@/lib/agreement-pdf-document";
import { BanquetingContractPdfDocument } from "@/lib/banqueting-contract-pdf";
import { BanquetingTermsPdfDocument, termsCompanyFromBusiness } from "@/lib/banqueting-terms-pdf";
import { isBanquetingHireSlug, isBanquetingTermsSlug } from "@/lib/banqueting-templates-seed";
import { getBookingSlotsConfig } from "@/lib/booking-slots";
import { loadAgreementMergeVars } from "@/lib/agreement-merge-load";
import { mergeAgreementBody } from "@/lib/agreement-merge";
import {
  buildBanquetingContract,
  applyLineItemTotalsToContract,
  parseContractData,
  type BuildContractOptions,
} from "@/lib/build-banqueting-contract";
import type { RoundhouseContractData } from "@/lib/roundhouse-contract-types";
import type { InvoiceBusinessPayload } from "@/lib/invoice-business";
import { loadHireContractSettingsFromDb, applyLegalNameTemplate } from "@/lib/hire-contract-settings";
import { VENUE_LEGAL_NAME } from "@/lib/venue-constants";

export type RenderAgreementPdfInput = {
  booking: Record<string, unknown>;
  business: InvoiceBusinessPayload | null;
  templateSlug?: string | null;
  templateBody?: string | null;
  agreementTitle?: string | null;
  renderedBody?: string | null;
  customValues?: unknown;
  contractOverride?: RoundhouseContractData | null;
  contractOptions?: BuildContractOptions;
};

function formatEventDate(booking: Record<string, unknown>): string {
  const eventDate = booking.event_date as string | null;
  if (eventDate && /^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return new Date(eventDate + "T12:00:00").toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return String(eventDate || "—");
}

/** Build the react-pdf Document element for a booking agreement (saved or preview). */
export async function buildBookingAgreementPdfDocument(
  supabase: SupabaseClient,
  input: RenderAgreementPdfInput,
): Promise<React.ReactElement> {
  const { booking, business } = input;
  const bookingId = String(booking.id || "");
  const eventDate = formatEventDate(booking);
  const slug = input.templateSlug || "";

  let contractData: RoundhouseContractData | null =
    parseContractData(input.contractOverride) || parseContractData(input.customValues);

  if (!contractData && isBanquetingHireSlug(slug)) {
    const hireSettings = await loadHireContractSettingsFromDb(supabase);
    contractData = await buildBanquetingContract(
      supabase,
      booking,
      business,
      input.contractOptions || {},
      hireSettings,
    );
  }

  if (contractData) {
    contractData = applyLineItemTotalsToContract(contractData);
    return <BanquetingContractPdfDocument data={contractData} />;
  }

  if (isBanquetingTermsSlug(slug)) {
    const hireSettings = await loadHireContractSettingsFromDb(supabase);
    const legalName = business?.venueName?.trim() || VENUE_LEGAL_NAME;
    return (
      <BanquetingTermsPdfDocument
        company={termsCompanyFromBusiness(business)}
        clientName={String(booking.client_name || "")}
        eventDate={eventDate}
        termsSections={hireSettings.termsSections.map((s) => applyLegalNameTemplate(s, legalName))}
      />
    );
  }

  const config = await getBookingSlotsConfig(supabase);
  const slotKey = booking.event_slot_key as string | null;
  const event_slot_label =
    slotKey && String(slotKey).trim()
      ? (() => {
          const def = config.slots.find((s) => s.key === slotKey);
          return def ? `${def.label}${def.timeLabel ? ` · ${def.timeLabel}` : ""}` : slotKey;
        })()
      : "Full venue (whole day)";

  const totalGbp =
    booking.total_cents != null && Number.isFinite(booking.total_cents as number)
      ? `£${((booking.total_cents as number) / 100).toFixed(2)}`
      : "—";

  const generatedAt = new Date().toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const { appendix, vars: mergeVars } = await loadAgreementMergeVars(
    supabase,
    booking,
    business ? { venueName: business.venueName } : null,
    event_slot_label,
  );

  const bodyText =
    input.renderedBody ||
    (input.templateBody ? mergeAgreementBody(input.templateBody, mergeVars as Record<string, string>) : "—");

  return (
    <AgreementPdfDocument
      venueName={business?.venueName || "Venue"}
      venueTagline={business?.venueTagline || ""}
      agreementTitle={input.agreementTitle || "Hire agreement"}
      clientName={String(booking.client_name || booking.client_email || "—")}
      clientEmail={String(booking.client_email || "")}
      eventDate={eventDate}
      eventSlotLabel={event_slot_label}
      bookingCode={String(booking.booking_code || bookingId.slice(0, 8).toUpperCase())}
      totalGbp={totalGbp}
      bodyText={bodyText}
      generatedAt={generatedAt}
      appendix={appendix}
    />
  );
}
