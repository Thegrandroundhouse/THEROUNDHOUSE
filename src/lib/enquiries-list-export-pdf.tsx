import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { EnquiriesListExportColumns } from "@/lib/enquiries-export-columns";
import { ENQUIRIES_EXPORT_COLUMNS_DEFAULT } from "@/lib/enquiries-export-columns";

const C = {
  ink: "#1a1a1e",
  muted: "#5c5c66",
  gold: "#8b6914",
  line: "#e5e3df",
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 7, fontFamily: "Helvetica", color: C.ink, paddingBottom: 28 },
  bar: { height: 3, backgroundColor: C.gold, marginBottom: 12, marginHorizontal: -36, marginTop: -36 },
  h1: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  sub: { fontSize: 7, color: C.muted, marginBottom: 12 },
  table: { width: "100%", borderWidth: 1, borderColor: C.line },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.line },
  tableRowHead: { flexDirection: "row", backgroundColor: C.line, fontFamily: "Helvetica-Bold", fontSize: 6 },
  cell: { padding: 3, flex: 1, maxWidth: 120 },
  cellWide: { padding: 3, flex: 1.4, maxWidth: 140 },
  cellNarrow: { padding: 3, width: 52 },
  cellDate: { padding: 3, width: 58 },
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

export type EnquiryExportRow = {
  name: string;
  email: string;
  phone: string | null;
  function_type: string | null;
  hear_about: string | null;
  message: string | null;
  status: string;
  notes: string | null;
  follow_up_notes: string | null;
  last_contact_at: string | null;
  created_at: string;
  event_date: string | null;
  event_slot_key: string | null;
};

function trunc(s: string, n: number) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : t.slice(0, n - 1) + "…";
}

export function EnquiriesListPdfDocument({
  venueName,
  generatedAt,
  enquiries,
  title = "Enquiries export",
  columns = ENQUIRIES_EXPORT_COLUMNS_DEFAULT,
}: {
  venueName: string;
  generatedAt: string;
  enquiries: EnquiryExportRow[];
  title?: string;
  columns?: Partial<EnquiriesListExportColumns>;
}) {
  const col = { ...ENQUIRIES_EXPORT_COLUMNS_DEFAULT, ...columns };
  const headers: { label: string; key: keyof EnquiriesListExportColumns; style: Record<string, unknown> }[] = [];
  const add = (label: string, key: keyof EnquiriesListExportColumns, style: Record<string, unknown>) => {
    if (col[key]) headers.push({ label, key, style });
  };
  add("Name", "name", { ...styles.cell });
  add("Email", "email", { ...styles.cellWide });
  add("Phone", "phone", { ...styles.cellNarrow });
  add("Function", "functionType", { ...styles.cellNarrow });
  add("Event", "eventDate", { ...styles.cellDate });
  add("Slot", "slot", { ...styles.cellNarrow });
  add("Via", "hearAbout", { ...styles.cellNarrow });
  add("Msg", "message", { ...styles.cellWide });
  add("St", "status", { ...styles.cellNarrow });
  add("Notes", "notes", { ...styles.cell });
  add("FU", "followUp", { ...styles.cell });
  add("Last", "lastContact", { ...styles.cellDate });
  add("In", "created", { ...styles.cellDate });

  const slotLabel = (k: string | null) =>
    k == null || String(k).trim() === "" ? "—" : String(k).replace(/_/g, " ");

  const get = (row: EnquiryExportRow, key: keyof EnquiriesListExportColumns): string => {
    switch (key) {
      case "name":
        return row.name || "—";
      case "email":
        return row.email || "—";
      case "phone":
        return row.phone?.trim() || "—";
      case "functionType":
        return row.function_type || "—";
      case "eventDate":
        return row.event_date || "—";
      case "slot":
        return slotLabel(row.event_slot_key);
      case "hearAbout":
        return trunc(row.hear_about || "—", 40);
      case "message":
        return trunc(row.message || "—", 80);
      case "status":
        return row.status;
      case "notes":
        return trunc(row.notes || "—", 50);
      case "followUp":
        return trunc(row.follow_up_notes || "—", 50);
      case "lastContact":
        return row.last_contact_at ? String(row.last_contact_at).slice(0, 10) : "—";
      case "created":
        return row.created_at ? row.created_at.slice(0, 10) : "—";
      default:
        return "—";
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="landscape">
        <View style={styles.bar} />
        <Text style={styles.h1}>{title}</Text>
        <Text style={styles.sub}>
          {venueName} · Generated {generatedAt} · {enquiries.length} enquiry{enquiries.length !== 1 ? "ies" : ""}
        </Text>
        <View style={styles.table}>
          <View style={styles.tableRowHead}>
            {headers.map((h) => (
              <Text key={h.key} style={[h.style, { fontFamily: "Helvetica-Bold" }] as never}>
                {h.label}
              </Text>
            ))}
          </View>
          {enquiries.map((row, i) => (
            <View key={i} style={styles.tableRow}>
              {headers.map((h) => (
                <Text key={h.key} style={h.style as never}>
                  {get(row, h.key)}
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
