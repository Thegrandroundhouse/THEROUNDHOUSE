import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import {
  PdfPageFooter,
  TermsPageHeader,
  theme,
  type BanquetingTermsCompany,
} from "@/lib/banqueting-pdf-theme";
import { PdfTermsSectionsBody, resolveTermsSections } from "@/lib/banqueting-terms-render";
import {
  VENUE_ADDRESS,
  VENUE_COMPANY_NUMBER,
  VENUE_LEGAL_NAME,
} from "@/lib/venue-constants";

export type { BanquetingTermsCompany };

export function BanquetingTermsPdfDocument({
  company,
  clientName,
  eventDate,
  termsSections,
}: {
  company?: Partial<BanquetingTermsCompany>;
  clientName?: string;
  eventDate?: string;
  termsSections?: string[];
}) {
  const c: BanquetingTermsCompany = {
    legalName: company?.legalName?.trim() || VENUE_LEGAL_NAME,
    companyNumber: company?.companyNumber?.trim() || VENUE_COMPANY_NUMBER,
    address: company?.address?.trim() || VENUE_ADDRESS,
  };

  const sections = resolveTermsSections(termsSections);

  return (
    <Document title={`Terms & Conditions — ${c.legalName}`} author={c.legalName}>
      <Page size="A4" style={theme.termsPage} wrap>
        <TermsPageHeader company={c} />
        <PdfTermsSectionsBody sections={sections} clientName={clientName} eventDate={eventDate} />
        <PdfPageFooter
          left={`${c.legalName} · Terms & Conditions`}
          renderPage={(n) => `${c.legalName} · Terms & Conditions · Page ${n}`}
        />
      </Page>
    </Document>
  );
}

export function termsCompanyFromBusiness(business: {
  venueName?: string;
  venueAddress?: string;
} | null): BanquetingTermsCompany {
  return {
    legalName: business?.venueName?.trim() || VENUE_LEGAL_NAME,
    companyNumber: VENUE_COMPANY_NUMBER,
    address: business?.venueAddress?.trim() || VENUE_ADDRESS,
  };
}

export { TermsPageHeader };
