import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  ADDITIONAL_HOURS_DEFAULT,
  ADDITIONAL_OPTIONS_DEFAULT,
  EVENT_SUPERVISION_SUB_BULLETS,
  INCLUDE_BULLET_LABELS,
  tableLinenParagraph,
  type RoundhouseContractData,
  type RoundhouseIncludeBullets,
} from "@/lib/roundhouse-contract-types";
import { resolveContractPaymentSummary } from "@/lib/build-banqueting-contract";
import { resolveTermsSections } from "@/lib/banqueting-terms-render";
import { formatGbp, hasContractBankDetails } from "@/lib/build-banqueting-contract";
import {
  PDF,
  PdfAccentLine,
  PdfMetaField,
  PdfPageFooter,
  PdfSectionTitle,
  PdfTopBand,
  TermsPageHeader,
  theme,
  type BanquetingTermsCompany,
} from "@/lib/banqueting-pdf-theme";
import { PdfTermsSectionsBody } from "@/lib/banqueting-terms-render";

function companyFromData(data: RoundhouseContractData): BanquetingTermsCompany {
  return {
    legalName: data.company.legalName,
    companyNumber: data.company.companyNumber,
    address: data.company.address,
  };
}

function ContractHeader({ data, compact = false }: { data: RoundhouseContractData; compact?: boolean }) {
  const c = data.company;
  if (compact) {
    return (
      <>
        <PdfTopBand />
        <View style={theme.compactHeaderRow}>
          <Text style={theme.companyName}>{c.legalName}</Text>
          <Text
            style={theme.pageNum}
            render={({ pageNumber }) => `Page ${pageNumber}`}
            fixed
          />
        </View>
        <PdfAccentLine />
      </>
    );
  }
  return (
    <>
      <PdfTopBand />
      <Text style={theme.sigLine}>Signature of Hirer _________________________ Date___________</Text>
      <View style={theme.headerRow}>
        <View style={theme.headerLeft}>
          <Text style={theme.companyName}>{c.legalName}</Text>
          <Text>Company Number {c.companyNumber}</Text>
          {c.phone ? <Text>Tel: {c.phone}</Text> : null}
          {c.website ? <Text>{c.website}</Text> : null}
          {c.email ? <Text>{c.email}</Text> : null}
        </View>
        <View style={theme.headerRight}>
          <Text>Registered Address:</Text>
          <Text>{c.legalName}</Text>
          <Text>{c.address}</Text>
        </View>
      </View>
      <PdfAccentLine />
      <Text style={theme.pageNum} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
    </>
  );
}

function ContractFooter({ data }: { data: RoundhouseContractData }) {
  return (
    <PdfPageFooter
      left={`${data.company.legalName} · Ref ${data.enquiry.enquiryRef}`}
      renderPage={(n) => `${data.company.legalName} · Ref ${data.enquiry.enquiryRef} · Page ${n}`}
    />
  );
}

function IncludesSection({ data }: { data: RoundhouseContractData }) {
  if (data.includeItems?.length) {
    const items = data.includeItems.filter((i) => i.included);
    return (
      <>
        {items.map((item) => (
          <React.Fragment key={item.id}>
            <Text style={theme.bullet}>• {item.label}</Text>
            {item.subBullets?.map((sub) => (
              <Text key={sub} style={theme.subBullet}>
                - {sub}
              </Text>
            ))}
          </React.Fragment>
        ))}
      </>
    );
  }

  const bullets = (Object.keys(data.includeBullets) as (keyof RoundhouseIncludeBullets)[]).filter(
    (k) => data.includeBullets[k],
  );

  return (
    <>
      {bullets.map((k) => {
        if (k === "tables_chairs") {
          return (
            <React.Fragment key={k}>
              <Text style={theme.bullet}>• Tables</Text>
              <Text style={theme.bullet}>• Chiavari Chairs (subject to number of guests)</Text>
            </React.Fragment>
          );
        }
        if (k === "event_supervision") {
          return (
            <React.Fragment key={k}>
              <Text style={theme.bullet}>• {INCLUDE_BULLET_LABELS.event_supervision}</Text>
              {EVENT_SUPERVISION_SUB_BULLETS.map((sub) => (
                <Text key={sub} style={theme.subBullet}>
                  - {sub}
                </Text>
              ))}
            </React.Fragment>
          );
        }
        return (
          <Text key={k} style={theme.bullet}>
            • {INCLUDE_BULLET_LABELS[k]}
          </Text>
        );
      })}
    </>
  );
}

function PaymentSummaryBox({ data }: { data: RoundhouseContractData }) {
  if (data.showPaymentSummaryOnCover === false) return null;
  const { paidCents, balanceDueCents } = resolveContractPaymentSummary(data);
  return (
    <View style={theme.paymentSummaryBox} wrap={false}>
      <Text style={theme.paymentSummaryTitle}>Payment summary</Text>
      <View style={theme.paymentSummaryRow}>
        <Text style={theme.paymentSummaryLabel}>Contract sum</Text>
        <Text style={theme.paymentSummaryVal}>{formatGbp(data.contractSumCents)}</Text>
      </View>
      <View style={theme.paymentSummaryRow}>
        <Text style={theme.paymentSummaryLabel}>Amount paid to date</Text>
        <Text style={theme.paymentSummaryVal}>{formatGbp(paidCents)}</Text>
      </View>
      <View style={theme.paymentSummaryRow}>
        <Text style={theme.paymentSummaryLabel}>Balance due</Text>
        <Text style={theme.paymentSummaryDue}>{formatGbp(balanceDueCents)}</Text>
      </View>
    </View>
  );
}

function LineItemsTable({ data }: { data: RoundhouseContractData }) {
  const included = data.lineItems.filter((r) => r.included);
  return (
    <>
      <View style={theme.tableHead}>
        <Text style={[theme.th, theme.thDesc]}>Description</Text>
        <Text style={[theme.th, theme.thQty]}>Qty</Text>
        <Text style={[theme.th, theme.thUnit]}>Unit cost</Text>
        <Text style={[theme.th, theme.thDisc]}>Discount</Text>
        <Text style={[theme.th, theme.thPrice]}>Price</Text>
      </View>
      {included.map((row) => {
        const lineTotal = Math.max(0, row.qty * row.unitCostCents - row.discountCents);
        return (
          <View key={row.id} style={theme.tableRow} wrap={false}>
            <Text style={[theme.td, theme.thDesc]}>{row.description}</Text>
            <Text style={[theme.td, theme.thQty]}>{row.qty}</Text>
            <Text style={[theme.td, theme.thUnit]}>{formatGbp(row.unitCostCents)}</Text>
            <Text style={[theme.td, theme.thDisc]}>{row.discountCents ? `−${formatGbp(row.discountCents)}` : "—"}</Text>
            <Text style={[theme.td, theme.thPrice, { fontFamily: "Helvetica-Bold" }]}>{formatGbp(lineTotal)}</Text>
          </View>
        );
      })}
      <View style={theme.totalRow} wrap={false}>
        <Text style={theme.totalLabel}>Subtotal</Text>
        <Text style={theme.totalSub}>{formatGbp(data.subtotalCents)}</Text>
        {data.discountTotalCents ? (
          <>
            <Text style={theme.totalLabel}>Discounts</Text>
            <Text style={theme.totalSub}>−{formatGbp(data.discountTotalCents)}</Text>
          </>
        ) : null}
        <Text style={theme.totalLabel}>Contract sum</Text>
        <Text style={theme.totalVal}>{formatGbp(data.contractSumCents)}</Text>
      </View>
      <PaymentSummaryBox data={data} />
    </>
  );
}

function TermsAppendix({ data }: { data: RoundhouseContractData }) {
  const company = companyFromData(data);
  const sections = resolveTermsSections(data.termsSections);

  return (
    <Page size="A4" style={theme.termsPage} wrap>
      <TermsPageHeader company={company} />
      <PdfTermsSectionsBody sections={sections} clientName={data.client.name} eventDate={data.event.dateLabel} />
      <PdfPageFooter
        left={`${data.company.legalName} · Ref ${data.enquiry.enquiryRef} · Terms & Conditions`}
        renderPage={(n) =>
          `${data.company.legalName} · Ref ${data.enquiry.enquiryRef} · T&C · Page ${n}`
        }
      />
    </Page>
  );
}

export function BanquetingContractPdfDocument({ data }: { data: RoundhouseContractData }) {
  const additionalOptions = data.additionalOptions?.length ? data.additionalOptions : ADDITIONAL_OPTIONS_DEFAULT;
  const additionalHours = data.additionalHours?.length ? data.additionalHours : ADDITIONAL_HOURS_DEFAULT;
  const additionalHoursIntro =
    data.additionalHoursIntro ||
    "Additional hours are charged when a client exceeds their hire period or wishes to extend after midnight.";
  const alcoholNote =
    data.alcoholCorkageNote ||
    `If alcohol is being served at the function, either drinks or corkage must be purchased as an additional option from ${data.company.legalName}.`;
  const linenNote = data.tableLinenNote || tableLinenParagraph(data.company.legalName);

  return (
    <Document title={`Hire Contract — ${data.client.name}`} author={data.company.legalName}>
      <Page size="A4" style={theme.page} wrap>
        <ContractHeader data={data} />
        <Text style={theme.docKind}>Venue hire contract</Text>
        <View style={theme.metaBox}>
          <View style={theme.grid2}>
            <PdfMetaField label="EB Enquiry Reference" value={data.enquiry.enquiryRef} />
            <PdfMetaField label="Sales Representative" value={data.enquiry.salesRep} />
            <PdfMetaField label="Date of Quote" value={data.enquiry.quoteDate} />
            <PdfMetaField label="Validity" value={data.enquiry.validity} />
            <PdfMetaField label="Name of Enquirer(s)" value={data.client.name} />
            <PdfMetaField label="Telephone Number" value={data.client.phone || "—"} />
            <PdfMetaField label="Email Address" value={data.client.email || "—"} />
            <PdfMetaField label="Address" value={data.client.address || "—"} />
            <PdfMetaField label="Date of Function" value={data.event.dateLabel} />
            <PdfMetaField label="Type of Function" value={data.event.type} />
            <PdfMetaField label="Period of Hire" value={data.event.hirePeriod} />
            <PdfMetaField label="Access From" value={data.event.accessFrom} />
            <PdfMetaField label="Start time of Function" value={data.event.startTime} />
            <PdfMetaField label="End time of Function" value={data.event.endTime} />
            <PdfMetaField label="Suite(s) for function" value={data.event.suites} />
            <PdfMetaField label="Exclusivity" value={data.event.exclusivity} />
            <PdfMetaField label="Number of Guests" value={data.event.guestCount} />
          </View>
        </View>
        <Text style={theme.intro}>{data.introParagraph}</Text>
        <LineItemsTable data={data} />
        <ContractFooter data={data} />
      </Page>

      {data.sections.includes ? (
        <Page size="A4" style={theme.page} wrap>
          <ContractHeader data={data} compact />
          <PdfSectionTitle>INCLUDES</PdfSectionTitle>
          <IncludesSection data={data} />
          {data.sections.table_linen_note ? (
            <View style={{ marginTop: 14 }}>
              <PdfSectionTitle>TABLE LINEN</PdfSectionTitle>
              <Text style={theme.intro}>{linenNote}</Text>
            </View>
          ) : null}
          {data.editableNotes ? (
            <View style={{ marginTop: 12, padding: 10, backgroundColor: PDF.cream, borderWidth: 1, borderColor: PDF.line }}>
              <PdfSectionTitle>ADDITIONAL NOTES</PdfSectionTitle>
              <Text style={theme.intro}>{data.editableNotes}</Text>
            </View>
          ) : null}
          <ContractFooter data={data} />
        </Page>
      ) : null}

      {data.sections.additional_options ? (
        <Page size="A4" style={theme.page} wrap>
          <ContractHeader data={data} compact />
          <PdfSectionTitle>ADDITIONAL OPTIONS</PdfSectionTitle>
          {additionalOptions.map((o) => (
            <View key={o.label} style={theme.optionRow}>
              <Text>{o.label}</Text>
              <Text style={theme.optionPrice}>{o.price}</Text>
            </View>
          ))}
          <PdfSectionTitle>ADDITIONAL HOURS</PdfSectionTitle>
          <Text style={[theme.intro, { marginTop: 0, marginBottom: 8 }]}>{additionalHoursIntro}</Text>
          {additionalHours.map((o) => (
            <View key={o.label} style={theme.optionRow}>
              <Text>{o.label}</Text>
              <Text style={theme.optionPrice}>{o.price}</Text>
            </View>
          ))}
          <PdfSectionTitle>ALCOHOL &amp; CORKAGE</PdfSectionTitle>
          <Text style={theme.intro}>{alcoholNote}</Text>
          <ContractFooter data={data} />
        </Page>
      ) : null}

      {data.sections.payment_terms ? (
        <Page size="A4" style={theme.page} wrap>
          <ContractHeader data={data} compact />
          <PdfSectionTitle>PAYMENT TERMS</PdfSectionTitle>
          {data.paymentTerms.schedule.map((m, i) => (
            <Text key={i} style={theme.bullet}>
              • {m.label}: {formatGbp(m.amountCents)} — {m.dueNote}
            </Text>
          ))}
          <Text style={[theme.bullet, { fontFamily: "Helvetica-Bold", color: PDF.gold }]}>
            + {formatGbp(data.paymentTerms.damageDepositCents)} refundable damage deposit
          </Text>
          <Text style={{ fontSize: 8, marginTop: 8, marginBottom: 14, color: PDF.muted, lineHeight: 1.4 }}>
            {data.paymentTerms.damageDepositNote ||
              "The damage deposit is refunded two weeks after your function, subject to breakages / deviations from contract."}
          </Text>
          <PdfSectionTitle>METHODS OF PAYMENT</PdfSectionTitle>
          <Text style={theme.bullet}>
            {data.paymentTerms.paymentMethodsNote ||
              "Payments can be made via bank transfer, debit card, credit card, cheque or cash."}
          </Text>
          <PdfSectionTitle>BANK DETAILS</PdfSectionTitle>
          {hasContractBankDetails(data.paymentTerms) ? (
            <View style={theme.bankBox}>
              {data.paymentTerms.bankName && data.paymentTerms.bankName !== "—" ? (
                <Text style={theme.bullet}>Bank: {data.paymentTerms.bankName}</Text>
              ) : null}
              {data.paymentTerms.sortCode && data.paymentTerms.sortCode !== "—" ? (
                <Text style={theme.bullet}>Sort code: {data.paymentTerms.sortCode}</Text>
              ) : null}
              {data.paymentTerms.accountName && data.paymentTerms.accountName !== "—" ? (
                <Text style={theme.bullet}>Account name: {data.paymentTerms.accountName}</Text>
              ) : null}
              {data.paymentTerms.accountNumber && data.paymentTerms.accountNumber !== "—" ? (
                <Text style={theme.bullet}>Account number: {data.paymentTerms.accountNumber}</Text>
              ) : null}
              {data.paymentTerms.chequePayable && data.paymentTerms.chequePayable !== "—" ? (
                <Text style={theme.bullet}>Cheques payable to: {data.paymentTerms.chequePayable}</Text>
              ) : null}
              {data.paymentTerms.paymentReference ? (
                <Text style={theme.bullet}>Payment reference: {data.paymentTerms.paymentReference}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={{ fontSize: 8, lineHeight: 1.45, color: PDF.muted, fontFamily: "Helvetica-Oblique", marginBottom: 10 }}>
              Bank details not configured — add them in Settings → Business & bank, then refresh on the contract
              before generating the PDF.
            </Text>
          )}
          <View style={theme.acceptBlock} wrap={false} minPresenceAhead={100}>
            <PdfSectionTitle>ACCEPTANCE</PdfSectionTitle>
            <Text style={{ fontSize: 9, lineHeight: 1.45, marginBottom: 8 }}>
              I have read and accepted the Terms and Conditions and agree to pay the above.
            </Text>
            {!data.include_terms ? (
              <Text style={{ fontSize: 8, marginBottom: 8, color: PDF.muted }}>
                Full Terms &amp; Conditions are available on request or as a separate document from {data.company.legalName}.
              </Text>
            ) : null}
            <Text style={{ fontSize: 8, color: PDF.muted }}>Print Name:</Text>
            <View style={theme.acceptLine} />
            <Text style={{ fontSize: 8, color: PDF.muted, marginTop: 8 }}>Signature:</Text>
            <View style={theme.acceptLine} />
            <Text style={{ fontSize: 8, color: PDF.muted, marginTop: 8 }}>Date:</Text>
            <View style={theme.acceptLine} />
          </View>
          <ContractFooter data={data} />
        </Page>
      ) : null}

      {data.include_terms ? <TermsAppendix data={data} /> : null}
    </Document>
  );
}
