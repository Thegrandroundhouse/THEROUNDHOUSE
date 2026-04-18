/**
 * Bookings list export PDF — table of bookings with chosen columns.
 */
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { BookingsListExportColumns } from "@/lib/bookings-export-columns";

const C = {
  ink: "#1a1a1e",
  muted: "#5c5c66",
  gold: "#8b6914",
  line: "#e5e3df",
  bg: "#faf9f7",
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 8, fontFamily: "Helvetica", color: C.ink, paddingBottom: 28 },
  bar: { height: 3, backgroundColor: C.gold, marginBottom: 12, marginHorizontal: -36, marginTop: -36 },
  h1: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  sub: { fontSize: 7, color: C.muted, marginBottom: 12 },
  table: { width: "100%", borderWidth: 1, borderColor: C.line },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.line },
  tableRowHead: { flexDirection: "row", backgroundColor: C.line, fontFamily: "Helvetica-Bold", fontSize: 7 },
  thText: { fontFamily: "Helvetica-Bold" },
  cell: { padding: 4, flex: 1 },
  cellCode: { padding: 4, width: 72 },
  cellDate: { padding: 4, width: 72 },
  cellAmt: { padding: 4, width: 52 },
  cellStatus: { padding: 4, width: 56 },
  cellPhone: { padding: 4, width: 76 },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 36,
    right: 36,
    fontSize: 6,
    color: C.muted,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 6,
  },
});

function gbp(c: number | null) {
  if (c == null) return "—";
  return `£${(c / 100).toFixed(2)}`;
}

export type ListExportColumns = BookingsListExportColumns;

const DEFAULT_COLUMNS: ListExportColumns = {
  code: true,
  client: true,
  phone: true,
  eventDate: true,
  eventType: true,
  package: true,
  total: true,
  deposit: true,
  status: true,
};

type BookingRow = {
  booking_code: string | null;
  client_name: string | null;
  client_email: string;
  client_phone: string | null;
  event_date: string;
  event_type: string | null;
  package_name: string | null;
  total_cents: number | null;
  deposit_cents: number | null;
  status: string;
};

export function BookingsListPdfDocument({
  venueName,
  generatedAt,
  bookings,
  columns = DEFAULT_COLUMNS,
  title = "Bookings export",
}: {
  venueName: string;
  generatedAt: string;
  bookings: BookingRow[];
  columns?: Partial<ListExportColumns>;
  title?: string;
}) {
  const col = { ...DEFAULT_COLUMNS, ...columns };
  const headers: { label: string; key: keyof ListExportColumns; style: Record<string, unknown> }[] = [];
  if (col.code) headers.push({ label: "Code", key: "code", style: styles.cellCode });
  if (col.client) headers.push({ label: "Client", key: "client", style: styles.cell });
  if (col.phone) headers.push({ label: "Phone", key: "phone", style: styles.cellPhone });
  if (col.eventDate) headers.push({ label: "Event date", key: "eventDate", style: styles.cellDate });
  if (col.eventType) headers.push({ label: "Type", key: "eventType", style: styles.cell });
  if (col.package) headers.push({ label: "Package", key: "package", style: styles.cell });
  if (col.total) headers.push({ label: "Total", key: "total", style: styles.cellAmt });
  if (col.deposit) headers.push({ label: "Deposit", key: "deposit", style: styles.cellAmt });
  if (col.status) headers.push({ label: "Status", key: "status", style: styles.cellStatus });

  const getCell = (row: BookingRow, key: keyof ListExportColumns) => {
    switch (key) {
      case "code":
        return row.booking_code || "—";
      case "client":
        return [row.client_name || row.client_email, row.client_name ? row.client_email : ""].filter(Boolean).join(" · ") || "—";
      case "phone":
        return row.client_phone?.trim() || "—";
      case "eventDate":
        return row.event_date;
      case "eventType":
        return row.event_type || "—";
      case "package":
        return row.package_name || "—";
      case "total":
        return gbp(row.total_cents);
      case "deposit":
        return gbp(row.deposit_cents);
      case "status":
        return row.status;
      default:
        return "—";
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.bar} />
        <Text style={styles.h1}>{title}</Text>
        <Text style={styles.sub}>
          {venueName} · Generated {generatedAt} · {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
        </Text>
        <View style={styles.table}>
          <View style={styles.tableRowHead}>
            {headers.map((h) => (
              // @ts-expect-error react-pdf Text style union is strict; array of styles is valid at runtime
              <Text key={h.key} style={[h.style, styles.thText]}>
                {h.label}
              </Text>
            ))}
          </View>
          {bookings.map((row, i) => (
            <View key={i} style={styles.tableRow}>
              {headers.map((h) => (
                // @ts-expect-error react-pdf Text style type is strict; StyleSheet styles are valid at runtime
                <Text key={h.key} style={h.style}>
                  {getCell(row, h.key)}
                </Text>
              ))}
            </View>
          ))}
        </View>
        <Text style={styles.footer} fixed>
          Confidential — {venueName} · Page 1
        </Text>
      </Page>
    </Document>
  );
}
