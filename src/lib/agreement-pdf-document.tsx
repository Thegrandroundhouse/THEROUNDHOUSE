/**
 * Print-quality hire agreement PDF — @react-pdf/renderer (standard PDF fonts)
 */
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const C = {
  ink: "#1c1917",
  muted: "#57534e",
  gold: "#92400e",
  goldAccent: "#b45309",
  cream: "#faf8f5",
  line: "#e7e5e4",
  band: "#78350f",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingHorizontal: 48,
    paddingBottom: 52,
    fontSize: 10,
    fontFamily: "Times-Roman",
    color: C.ink,
    backgroundColor: "#ffffff",
  },
  topBand: {
    height: 6,
    backgroundColor: C.band,
    marginHorizontal: -48,
    marginBottom: 28,
  },
  accentLine: {
    width: 52,
    height: 3,
    backgroundColor: C.goldAccent,
    marginBottom: 16,
  },
  venue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 4,
  },
  venueMain: {
    fontSize: 22,
    fontFamily: "Times-Bold",
    color: C.ink,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 9,
    color: C.muted,
    fontFamily: "Times-Italic",
    marginBottom: 22,
  },
  docKind: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 6,
  },
  docTitle: {
    fontSize: 20,
    fontFamily: "Times-Bold",
    color: C.ink,
    marginBottom: 4,
  },
  agreementTitle: {
    fontSize: 11,
    color: C.muted,
    marginBottom: 20,
    fontFamily: "Times-Roman",
  },
  metaWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 24,
    padding: 14,
    backgroundColor: C.cream,
    borderWidth: 1,
    borderColor: C.line,
  },
  metaCell: {
    width: "50%",
    paddingRight: 12,
    marginBottom: 10,
  },
  metaLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: C.muted,
    marginBottom: 3,
  },
  metaVal: {
    fontSize: 10,
    fontFamily: "Times-Roman",
    color: C.ink,
  },
  rule: {
    height: 1,
    backgroundColor: C.line,
    marginBottom: 18,
  },
  bodyIntro: {
    fontSize: 9,
    color: C.muted,
    marginBottom: 14,
    lineHeight: 1.45,
    fontFamily: "Times-Roman",
  },
  para: {
    fontSize: 10,
    lineHeight: 1.62,
    marginBottom: 11,
    textAlign: "justify",
    color: C.ink,
    fontFamily: "Times-Roman",
  },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 48,
    right: 48,
    fontSize: 7,
    color: C.muted,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 8,
    fontFamily: "Helvetica",
  },
  appendixTitle: {
    fontSize: 14,
    fontFamily: "Times-Bold",
    color: C.ink,
    marginBottom: 6,
  },
  appendixSub: {
    fontSize: 9,
    color: C.muted,
    marginBottom: 20,
    fontFamily: "Times-Roman",
  },
  signBlock: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  signRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  signCell: { width: "45%" },
  signLabel: { fontSize: 8, color: C.muted, marginBottom: 24 },
  signLine: { borderBottomWidth: 1, borderBottomColor: C.muted, height: 1 },
  appRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  appLabel: {
    width: "28%",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.gold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingRight: 12,
  },
  appVal: {
    width: "72%",
    fontSize: 10,
    fontFamily: "Times-Roman",
    color: C.ink,
    lineHeight: 1.45,
  },
});

export type AgreementAppendixRow = { label: string; value: string };

export type AgreementPdfProps = {
  venueName: string;
  venueTagline: string;
  agreementTitle: string;
  clientName: string;
  clientEmail: string;
  eventDate: string;
  eventSlotLabel: string;
  bookingCode: string;
  totalGbp: string;
  bodyText: string;
  generatedAt: string;
  /** Second page — booking context (package, vendors, schedule) */
  appendix?: AgreementAppendixRow[];
};

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim().replace(/\n/g, " "))
    .filter(Boolean);
}

export function AgreementPdfDocument({
  venueName,
  venueTagline,
  agreementTitle,
  clientName,
  clientEmail,
  eventDate,
  eventSlotLabel,
  bookingCode,
  totalGbp,
  bodyText,
  generatedAt,
  appendix,
}: AgreementPdfProps) {
  const paragraphs = splitParagraphs(bodyText || "—");
  const displayVenue = venueName || "Venue";
  const appendixRows = (appendix || []).filter((r) => r.value && r.value !== "—");

  return (
    <Document title={agreementTitle || "Hire agreement"} author={displayVenue}>
      <Page size="A4" wrap style={styles.page}>
        <View style={styles.topBand} fixed />
        <View style={styles.accentLine} />
        <Text style={styles.venue}>Venue</Text>
        <Text style={styles.venueMain}>{displayVenue}</Text>
        {venueTagline ? <Text style={styles.tagline}>{venueTagline}</Text> : null}

        <Text style={styles.docKind}>Legal schedule</Text>
        <Text style={styles.docTitle}>Hire agreement</Text>
        <Text style={styles.agreementTitle}>{agreementTitle || "Agreement"}</Text>

        <View style={styles.metaWrap} wrap={false}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Client</Text>
            <Text style={styles.metaVal}>{clientName || "—"}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Email</Text>
            <Text style={styles.metaVal}>{clientEmail || "—"}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Event date</Text>
            <Text style={styles.metaVal}>{eventDate}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Venue use</Text>
            <Text style={styles.metaVal}>{eventSlotLabel}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Booking reference</Text>
            <Text style={styles.metaVal}>{bookingCode}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Agreed total</Text>
            <Text style={styles.metaVal}>{totalGbp}</Text>
          </View>
        </View>

        <View style={styles.rule} />
        <Text style={styles.bodyIntro}>
          The terms below form part of the contract between the client named above and the venue. Please read carefully
          before signing.
        </Text>

        {paragraphs.map((p, i) => (
          <Text key={i} style={styles.para}>
            {p}
          </Text>
        ))}

        <View style={styles.signBlock} wrap={false}>
          <Text style={{ fontSize: 9, fontFamily: "Times-Bold", marginBottom: 8 }}>Acceptance</Text>
          <Text style={styles.bodyIntro}>
            By signing below, the client confirms agreement to the terms above and the booking summary stated in this
            document.
          </Text>
          <View style={styles.signRow}>
            <View style={styles.signCell}>
              <Text style={styles.signLabel}>Client signature</Text>
              <View style={styles.signLine} />
            </View>
            <View style={styles.signCell}>
              <Text style={styles.signLabel}>Date</Text>
              <View style={styles.signLine} />
            </View>
          </View>
          <View style={styles.signRow}>
            <View style={styles.signCell}>
              <Text style={styles.signLabel}>Print name</Text>
              <View style={styles.signLine} />
            </View>
            <View style={styles.signCell}>
              <Text style={styles.signLabel}>Venue representative</Text>
              <View style={styles.signLine} />
            </View>
          </View>
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${displayVenue} · Ref ${bookingCode} · ${generatedAt} · Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
      {appendixRows.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.topBand} fixed />
          <View style={styles.accentLine} />
          <Text style={styles.docKind}>Schedule A</Text>
          <Text style={styles.appendixTitle}>Booking summary</Text>
          <Text style={styles.appendixSub}>
            Package, suppliers, and payment milestones for reference. Part of the agreement above.
          </Text>
          {appendixRows.map((row, i) => (
            <View key={i} style={styles.appRow} wrap={false}>
              <Text style={styles.appLabel}>{row.label}</Text>
              <Text style={styles.appVal}>{row.value}</Text>
            </View>
          ))}
          <Text
            style={styles.footer}
            fixed
            render={({ pageNumber, totalPages }) =>
              `${displayVenue} · Ref ${bookingCode} · ${generatedAt} · Page ${pageNumber} of ${totalPages}`
            }
          />
        </Page>
      ) : null}
    </Document>
  );
}
