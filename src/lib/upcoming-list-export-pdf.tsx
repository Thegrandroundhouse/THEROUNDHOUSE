import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { UpcomingListExportColumns } from "@/lib/upcoming-export-columns";

const C = { ink: "#1a1a1e", muted: "#5c5c66", gold: "#8b6914", line: "#e5e3df" };

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
  cellCode: { padding: 4, width: 64 },
  cellDate: { padding: 4, width: 68 },
  cellAmt: { padding: 4, width: 48 },
  cellStatus: { padding: 4, width: 52 },
  cellPhone: { padding: 4, width: 72 },
  cellSlot: { padding: 4, width: 64 },
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

type Row = {
  booking_code: string | null;
  client_name: string | null;
  client_email: string;
  client_phone: string | null;
  event_date: string;
  event_slot_key: string | null;
  event_type: string | null;
  package_name: string | null;
  total_cents: number | null;
  status: string;
};

const DEF: UpcomingListExportColumns = {
  code: true,
  client: true,
  phone: true,
  eventDate: true,
  slot: true,
  eventType: true,
  package: true,
  total: true,
  status: true,
};

export function UpcomingListPdfDocument({
  venueName,
  generatedAt,
  rows,
  columns = DEF,
  title = "Upcoming bookings",
}: {
  venueName: string;
  generatedAt: string;
  rows: Row[];
  columns?: Partial<UpcomingListExportColumns>;
  title?: string;
}) {
  const col = { ...DEF, ...columns };
  const headers: { label: string; key: keyof UpcomingListExportColumns; style: Record<string, unknown> }[] = [];
  if (col.code) headers.push({ label: "Code", key: "code", style: styles.cellCode });
  if (col.client) headers.push({ label: "Client", key: "client", style: styles.cell });
  if (col.phone) headers.push({ label: "Phone", key: "phone", style: styles.cellPhone });
  if (col.eventDate) headers.push({ label: "Event", key: "eventDate", style: styles.cellDate });
  if (col.slot) headers.push({ label: "Slot", key: "slot", style: styles.cellSlot });
  if (col.eventType) headers.push({ label: "Type", key: "eventType", style: styles.cell });
  if (col.package) headers.push({ label: "Pkg", key: "package", style: styles.cell });
  if (col.total) headers.push({ label: "Total", key: "total", style: styles.cellAmt });
  if (col.status) headers.push({ label: "St", key: "status", style: styles.cellStatus });

  const slotLabel = (k: string | null) => {
    if (k == null || String(k).trim() === "") return "Whole day";
    return String(k).replace(/_/g, " ");
  };

  const getCell = (row: Row, key: keyof UpcomingListExportColumns) => {
    switch (key) {
      case "code":
        return row.booking_code || "—";
      case "client":
        return [row.client_name || row.client_email, row.client_name ? row.client_email : ""].filter(Boolean).join(" · ") || "—";
      case "phone":
        return row.client_phone?.trim() || "—";
      case "eventDate":
        return row.event_date;
      case "slot":
        return slotLabel(row.event_slot_key);
      case "eventType":
        return row.event_type || "—";
      case "package":
        return row.package_name || "—";
      case "total":
        return gbp(row.total_cents);
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
          {venueName} · Generated {generatedAt} · {rows.length} booking{rows.length !== 1 ? "s" : ""}
        </Text>
        <View style={styles.table}>
          <View style={styles.tableRowHead}>
            {headers.map((h) => (
              <Text key={h.key} style={[h.style as never, styles.thText]}>
                {h.label}
              </Text>
            ))}
          </View>
          {rows.map((row, i) => (
            <View key={i} style={styles.tableRow}>
              {headers.map((h) => (
                <Text key={h.key} style={h.style as never}>
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
