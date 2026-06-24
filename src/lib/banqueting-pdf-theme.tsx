import React from "react";
import { StyleSheet, Text, View } from "@react-pdf/renderer";

export type BanquetingTermsCompany = {
  legalName: string;
  companyNumber: string;
  address: string;
};

export const PDF = {
  ink: "#1c1917",
  muted: "#57534e",
  gold: "#92400e",
  goldAccent: "#b45309",
  band: "#78350f",
  cream: "#faf8f5",
  line: "#e7e5e4",
  tableHead: "#f5f0ea",
  white: "#ffffff",
} as const;

export const PAGE_PAD = { h: 44, v: 44, bottom: 68 } as const;

export const theme = StyleSheet.create({
  page: {
    paddingHorizontal: PAGE_PAD.h,
    paddingTop: PAGE_PAD.v,
    paddingBottom: PAGE_PAD.bottom,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: PDF.ink,
    backgroundColor: PDF.white,
  },
  termsPage: {
    paddingHorizontal: PAGE_PAD.h,
    paddingTop: 128,
    paddingBottom: PAGE_PAD.bottom,
    fontSize: 7.5,
    fontFamily: "Helvetica",
    color: PDF.ink,
    backgroundColor: PDF.white,
  },
  topBand: {
    height: 5,
    backgroundColor: PDF.band,
    marginHorizontal: -PAGE_PAD.h,
    marginTop: -PAGE_PAD.v,
    marginBottom: 14,
  },
  accentLine: {
    width: 44,
    height: 2.5,
    backgroundColor: PDF.goldAccent,
    marginBottom: 10,
  },
  sigLine: {
    fontSize: 7,
    marginBottom: 8,
    color: PDF.muted,
    fontFamily: "Helvetica",
  },
  compactHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: PDF.line,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: PDF.line,
  },
  headerLeft: { width: "48%", fontSize: 8, color: PDF.muted, lineHeight: 1.45 },
  headerRight: { width: "48%", fontSize: 8, textAlign: "right", color: PDF.muted, lineHeight: 1.45 },
  companyName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: PDF.ink, marginBottom: 3 },
  pageNum: {
    fontSize: 7,
    color: PDF.muted,
    textAlign: "right",
    marginBottom: 12,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.3,
  },
  docKind: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: PDF.gold,
    marginBottom: 4,
  },
  metaBox: {
    padding: 12,
    backgroundColor: PDF.cream,
    borderWidth: 1,
    borderColor: PDF.line,
    marginBottom: 12,
  },
  grid2: { flexDirection: "row", flexWrap: "wrap" },
  gridCell: { width: "50%", paddingRight: 10, marginBottom: 8 },
  label: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: PDF.muted,
    marginBottom: 2,
  },
  value: { fontSize: 9, color: PDF.ink, lineHeight: 1.35 },
  intro: { fontSize: 8, lineHeight: 1.5, marginVertical: 10, textAlign: "justify", color: PDF.ink },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 14,
    marginBottom: 10,
    letterSpacing: 1.2,
    color: PDF.ink,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: PDF.goldAccent,
  },
  bullet: { fontSize: 8, marginBottom: 5, paddingLeft: 10, lineHeight: 1.45, color: PDF.ink },
  subBullet: { fontSize: 8, marginBottom: 4, paddingLeft: 22, lineHeight: 1.4, color: PDF.muted },
  tableHead: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: PDF.line,
    paddingVertical: 6,
    backgroundColor: PDF.tableHead,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: PDF.line,
    paddingVertical: 5,
    minHeight: 20,
    alignItems: "flex-start",
  },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7, color: PDF.gold, textTransform: "uppercase", letterSpacing: 0.3 },
  td: { fontSize: 7.5, color: PDF.ink, lineHeight: 1.35 },
  thDesc: { width: "38%", paddingRight: 4 },
  thQty: { width: "8%", textAlign: "center" },
  thUnit: { width: "16%", textAlign: "right", paddingLeft: 2 },
  thDisc: { width: "16%", textAlign: "right", paddingLeft: 2 },
  thPrice: { width: "18%", textAlign: "right", paddingLeft: 2 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: PDF.goldAccent,
  },
  totalLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, color: PDF.ink },
  totalSub: { fontSize: 8, color: PDF.muted, textAlign: "right" },
  totalVal: { fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "right", color: PDF.gold },
  paymentSummaryBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: PDF.cream,
    borderWidth: 1,
    borderColor: PDF.line,
  },
  paymentSummaryTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: PDF.gold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  paymentSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    fontSize: 8,
  },
  paymentSummaryLabel: { color: PDF.muted },
  paymentSummaryVal: { fontFamily: "Helvetica-Bold", color: PDF.ink },
  paymentSummaryDue: { fontFamily: "Helvetica-Bold", color: PDF.gold, fontSize: 9 },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    fontSize: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: PDF.line,
  },
  optionPrice: { fontFamily: "Helvetica-Bold", color: PDF.gold },
  bankBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: PDF.cream,
    borderWidth: 1,
    borderColor: PDF.line,
  },
  acceptBlock: { marginTop: 14, paddingTop: 10, paddingBottom: 4, borderTopWidth: 1, borderTopColor: PDF.line },
  acceptLine: { marginTop: 10, borderBottomWidth: 1, borderBottomColor: PDF.muted, width: 200, height: 12 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: PAGE_PAD.h,
    right: PAGE_PAD.h,
    fontSize: 7,
    textAlign: "center",
    color: PDF.muted,
    borderTopWidth: 1,
    borderTopColor: PDF.line,
    paddingTop: 6,
    fontFamily: "Helvetica",
  },
  termsSection: { marginBottom: 10 },
  termsTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", marginBottom: 5, color: PDF.ink, letterSpacing: 0.2 },
  termsMainTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 10, color: PDF.ink, letterSpacing: 0.3 },
  termsPara: { fontSize: 7.5, lineHeight: 1.45, textAlign: "justify", marginBottom: 5, color: PDF.ink },
  fixedHeader: { position: "absolute", top: PAGE_PAD.v, left: PAGE_PAD.h, right: PAGE_PAD.h },
});

export function PdfTopBand() {
  return <View style={theme.topBand} fixed />;
}

export function PdfAccentLine() {
  return <View style={theme.accentLine} />;
}

export function PdfPageFooter({
  left,
  renderPage,
}: {
  left: string;
  renderPage?: (pageNumber: number, totalPages: number) => string;
}) {
  if (renderPage) {
    return (
      <Text style={theme.footer} fixed render={({ pageNumber, totalPages }) => renderPage(pageNumber, totalPages)} />
    );
  }
  return <Text style={theme.footer} fixed>{left}</Text>;
}

export function TermsPageHeader({ company }: { company: BanquetingTermsCompany }) {
  return (
    <View style={theme.fixedHeader} fixed>
      <PdfTopBand />
      <Text style={theme.sigLine}>Signature…………………………………………………………………  Date…………….…………………………………</Text>
      <View style={theme.headerRow}>
        <View style={theme.headerLeft}>
          <Text style={theme.companyName}>{company.legalName}</Text>
          <Text>Company Number: {company.companyNumber}</Text>
        </View>
        <View style={theme.headerRight}>
          <Text>Registered Address:</Text>
          <Text>{company.legalName}</Text>
          <Text>{company.address}</Text>
        </View>
      </View>
      <PdfAccentLine />
    </View>
  );
}

export function PdfSectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={theme.sectionTitle}>{children}</Text>;
}

export function PdfMetaField({ label, value }: { label: string; value: string }) {
  return (
    <View style={theme.gridCell}>
      <Text style={theme.label}>{label}</Text>
      <Text style={theme.value}>{value || "—"}</Text>
    </View>
  );
}
