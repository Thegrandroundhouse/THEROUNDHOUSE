/**
 * Server-safe PDF for invoices (@react-pdf/renderer).
 */
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

export type InvoiceLinePdf = {
  description: string;
  detail?: string;
  quantity: number;
  unit_cents: number;
  line_total_cents: number;
};

export type InvoicePdfProps = {
  invoiceNumber: string;
  issuedDate: string;
  dueDate: string | null;
  status: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string | null;
  venueName: string;
  venueTagline: string;
  venueAddress?: string;
  venuePhone?: string;
  venueEmail?: string;
  /** Bank details for payment (shown on PDF when provided). */
  bankName?: string;
  sortCode?: string;
  accountNumber?: string;
  accountName?: string;
  paymentReference?: string;
  lineItems: InvoiceLinePdf[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  notes?: string | null;
  bookingRef?: string | null;
  /** Logo URL (or preferred logo). Shown in header when set. */
  logoUrl?: string | null;
};

const palette = {
  ink: "#1a1a1e",
  muted: "#6b6b73",
  gold: "#9a7528",
  goldLight: "#c7a259",
  line: "#e8e6e3",
  paper: "#faf9f7",
};

const styles = StyleSheet.create({
  page: {
    padding: 48,
    paddingBottom: 56,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: palette.ink,
    backgroundColor: "#ffffff",
  },
  topBar: {
    height: 4,
    backgroundColor: palette.gold,
    marginBottom: 28,
    marginHorizontal: -48,
    marginTop: -48,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  brand: { flex: 1 },
  logo: { width: 120, height: 48, objectFit: "contain", marginBottom: 8 },
  brandName: { fontSize: 22, fontFamily: "Helvetica-Bold", color: palette.ink, marginBottom: 4 },
  brandTag: { fontSize: 9, color: palette.muted, letterSpacing: 1.2, textTransform: "uppercase" },
  invBox: { alignItems: "flex-end" },
  invLabel: { fontSize: 8, color: palette.muted, textTransform: "uppercase", letterSpacing: 0.8 },
  invNumber: { fontSize: 18, fontFamily: "Helvetica-Bold", color: palette.gold, marginTop: 2 },
  metaRow: { flexDirection: "row", marginTop: 8, gap: 24 },
  metaItem: { fontSize: 9, color: palette.muted },
  metaStrong: { fontFamily: "Helvetica-Bold", color: palette.ink },
  twoCol: { flexDirection: "row", marginBottom: 28, gap: 40 },
  col: { flex: 1 },
  sectionTitle: {
    fontSize: 8,
    color: palette.gold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    fontFamily: "Helvetica-Bold",
  },
  clientName: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  clientLine: { fontSize: 9, color: palette.muted, marginBottom: 2 },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: palette.ink,
    paddingBottom: 8,
    marginBottom: 6,
  },
  thDesc: { flex: 3, fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  thQty: { width: 40, fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "right" },
  thUnit: { width: 72, fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "right" },
  thTotal: { width: 72, fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "right" },
  row: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.line },
  tdDesc: { flex: 3, paddingRight: 8 },
  tdDescMain: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  tdDescSub: { fontSize: 8, color: palette.muted, marginTop: 2 },
  tdQty: { width: 40, fontSize: 9, textAlign: "right" },
  tdUnit: { width: 72, fontSize: 9, textAlign: "right" },
  tdTotal: { width: 72, fontSize: 9, textAlign: "right", fontFamily: "Helvetica-Bold" },
  totalsWrap: { alignItems: "flex-end", marginTop: 16 },
  totalRow: { flexDirection: "row", width: 200, justifyContent: "space-between", marginBottom: 6 },
  totalLabel: { fontSize: 9, color: palette.muted },
  totalVal: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  grandRow: {
    flexDirection: "row",
    width: 200,
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: palette.gold,
  },
  grandLabel: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  grandVal: { fontSize: 14, fontFamily: "Helvetica-Bold", color: palette.gold },
  notes: { marginTop: 28, padding: 14, backgroundColor: palette.paper, borderLeftWidth: 3, borderLeftColor: palette.goldLight },
  notesTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: palette.muted, marginBottom: 6, textTransform: "uppercase" },
  notesBody: { fontSize: 8, color: palette.muted, lineHeight: 1.5 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: 10,
  },
  footerText: { fontSize: 7, color: palette.muted, textAlign: "center" },
  paymentBox: {
    marginTop: 20,
    padding: 12,
    backgroundColor: palette.paper,
    borderLeftWidth: 3,
    borderLeftColor: palette.goldLight,
  },
  paymentTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: palette.muted, marginBottom: 6, textTransform: "uppercase" },
  paymentLine: { fontSize: 8, color: palette.ink, marginBottom: 2 },
});

function gbp(cents: number) {
  return `£${(cents / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InvoicePdfDocument(props: InvoicePdfProps) {
  const {
    invoiceNumber,
    issuedDate,
    dueDate,
    status,
    clientName,
    clientEmail,
    clientAddress,
    venueName,
    venueTagline,
    venueAddress,
    venuePhone,
    venueEmail,
    bankName,
    sortCode,
    accountNumber,
    accountName,
    paymentReference,
    lineItems,
    subtotalCents,
    taxCents,
    totalCents,
    notes,
    bookingRef,
    logoUrl,
  } = props;

  const hasBankDetails = !!(bankName || sortCode || accountNumber || accountName);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar} />
        <View style={styles.headerRow}>
          <View style={styles.brand}>
            {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
            <Text style={styles.brandName}>{venueName}</Text>
            <Text style={styles.brandTag}>{venueTagline}</Text>
            {venueAddress ? <Text style={[styles.clientLine, { marginTop: 6 }]}>{venueAddress}</Text> : null}
            {venuePhone ? <Text style={styles.clientLine}>{venuePhone}</Text> : null}
            {venueEmail ? <Text style={styles.clientLine}>{venueEmail}</Text> : null}
          </View>
      <View style={styles.invBox}>
            <Text style={styles.invLabel}>Invoice</Text>
            <Text style={styles.invNumber}>{invoiceNumber}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaItem}>
                <Text style={styles.metaStrong}>Date </Text>
                {issuedDate}
              </Text>
              {dueDate ? (
                <Text style={styles.metaItem}>
                  <Text style={styles.metaStrong}>Due </Text>
                  {dueDate}
                </Text>
              ) : null}
              <Text style={styles.metaItem}>
                <Text style={styles.metaStrong}>Status </Text>
                {status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Bill to</Text>
            <Text style={styles.clientName}>{clientName || "—"}</Text>
            <Text style={styles.clientLine}>{clientEmail}</Text>
            {clientAddress ? <Text style={styles.clientLine}>{clientAddress}</Text> : null}
            {bookingRef ? <Text style={[styles.clientLine, { marginTop: 6 }]}>Booking ref: {bookingRef}</Text> : null}
          </View>
        </View>

        <View style={styles.tableHead}>
          <Text style={styles.thDesc}>Description</Text>
          <Text style={styles.thQty}>Qty</Text>
          <Text style={styles.thUnit}>Unit</Text>
          <Text style={styles.thTotal}>Total</Text>
        </View>
        {lineItems.map((line, i) => (
          <View key={i} style={styles.row} wrap={false}>
            <View style={styles.tdDesc}>
              <Text style={styles.tdDescMain}>{line.description}</Text>
              {line.detail ? <Text style={styles.tdDescSub}>{line.detail}</Text> : null}
            </View>
            <Text style={styles.tdQty}>{line.quantity}</Text>
            <Text style={styles.tdUnit}>{gbp(line.unit_cents)}</Text>
            <Text style={styles.tdTotal}>{gbp(line.line_total_cents)}</Text>
          </View>
        ))}

        <View style={styles.totalsWrap}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalVal}>{gbp(subtotalCents)}</Text>
          </View>
          {taxCents > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalVal}>{gbp(taxCents)}</Text>
            </View>
          ) : null}
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Total due</Text>
            <Text style={styles.grandVal}>{gbp(totalCents)}</Text>
          </View>
        </View>

        {notes ? (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes & terms</Text>
            <Text style={styles.notesBody}>{notes}</Text>
          </View>
        ) : null}

        {hasBankDetails ? (
          <View style={styles.paymentBox}>
            <Text style={styles.paymentTitle}>Payment details</Text>
            {bankName ? <Text style={styles.paymentLine}>Bank: {bankName}</Text> : null}
            {accountName ? <Text style={styles.paymentLine}>Account name: {accountName}</Text> : null}
            {sortCode ? <Text style={styles.paymentLine}>Sort code: {sortCode}</Text> : null}
            {accountNumber ? <Text style={styles.paymentLine}>Account number: {accountNumber}</Text> : null}
            {paymentReference ? <Text style={styles.paymentLine}>Reference: {paymentReference} (e.g. invoice number)</Text> : null}
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Thank you for choosing {venueName}. Please remit payment by the due date. For billing queries, reply to the email that delivered this invoice.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
