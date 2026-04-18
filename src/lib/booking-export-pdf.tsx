/**
 * Full booking dossier PDF — sections toggled by export checklist.
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const C = {
  ink: "#1a1a1e",
  muted: "#5c5c66",
  gold: "#8b6914",
  line: "#e5e3df",
  bg: "#faf9f7",
};

const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 9, fontFamily: "Helvetica", color: C.ink, paddingBottom: 36 },
  bar: { height: 3, backgroundColor: C.gold, marginBottom: 20, marginHorizontal: -44, marginTop: -44 },
  h1: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  sub: { fontSize: 8, color: C.muted, marginBottom: 16 },
  section: { marginBottom: 14 },
  h2: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.gold,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 92, color: C.muted, fontSize: 8 },
  val: { flex: 1, fontSize: 9 },
  para: { fontSize: 8, lineHeight: 1.45, marginBottom: 4, color: C.ink },
  bullet: { fontSize: 8, marginBottom: 2, paddingLeft: 8 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    fontSize: 7,
    color: C.muted,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 8,
  },
});

function gbp(c: number | null) {
  if (c == null) return "—";
  return `£${(c / 100).toFixed(2)}`;
}

export type ExportSections = {
  client: boolean;
  event: boolean;
  money: boolean;
  notes: boolean;
  wedding: boolean;
  payments: boolean;
  tasks: boolean;
  vendors: boolean;
  documents: boolean;
  comms: boolean;
  record: boolean;
};

export type InvoiceBusinessBlock = {
  venueName: string;
  venueTagline: string;
  venueAddress: string;
  venuePhone: string;
  venueEmail: string;
  bankName: string;
  sortCode: string;
  accountNumber: string;
  accountName: string;
  paymentReference: string;
};

export type BookingExportPdfProps = {
  venueName: string;
  business: InvoiceBusinessBlock | null;
  generatedAt: string;
  bookingId: string;
  bookingCode: string | null;
  sections: ExportSections;
  booking: {
    client_name: string | null;
    client_email: string;
    client_phone: string | null;
    event_date: string;
    event_type: string | null;
    package_name: string | null;
    status: string;
    total_cents: number | null;
    deposit_cents: number | null;
    balance_cents: number | null;
    special_requirements: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    enquiry_id: string | null;
    /** Human-readable slot, e.g. "Evening · 17:00 – 22:00" */
    event_slot_label?: string | null;
  };
  workspace: {
    wedding: Record<string, unknown> | null;
    milestones: { label: string; amount_cents: number | null; due_date: string | null; status: string }[];
    tasks: { title: string; done: boolean; due_date: string | null }[];
    documents: { name: string; file_url: string | null }[];
    communications: { channel: string | null; body: string | null; sent_at: string }[];
    bookingVendors: { vendors: { name: string; vendor_type: string } | null }[];
    spaces: { id: string; name: string }[];
  } | null;
  spaceName: string | null;
};

function Field({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.val}>{value}</Text>
    </View>
  );
}

export function BookingExportPdfDocument(props: BookingExportPdfProps) {
  const { venueName, business, generatedAt, bookingId, bookingCode, sections, booking, workspace, spaceName } = props;
  const biz = business;
  const w = workspace?.wedding || {};
  const milestones = workspace?.milestones ?? [];
  const tasks = workspace?.tasks ?? [];
  const docs = workspace?.documents ?? [];
  const comms = workspace?.communications ?? [];
  const vendors = workspace?.bookingVendors ?? [];

  const pages: React.ReactNode[] = [];

  const cover = (
    <Page key="cover" size="A4" style={styles.page}>
      <View style={styles.bar} />
      {biz ? (
        <View style={[styles.section, { marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.line }]}>
          <Text style={[styles.h1, { fontSize: 13, marginBottom: 2 }]}>{biz.venueName || venueName}</Text>
          {biz.venueTagline ? <Text style={[styles.sub, { marginBottom: 4 }]}>{biz.venueTagline}</Text> : null}
          {biz.venueAddress ? (
            <Text style={[styles.para, { fontSize: 8, lineHeight: 1.35 }]}>{biz.venueAddress.replace(/\n/g, " · ")}</Text>
          ) : null}
          <View style={[styles.row, { marginTop: 4 }]}>
            {biz.venuePhone ? <Text style={styles.val}>Tel {biz.venuePhone}  </Text> : null}
            {biz.venueEmail ? <Text style={styles.val}>{biz.venueEmail}</Text> : null}
          </View>
          {biz.bankName && biz.sortCode ? (
            <View style={{ marginTop: 8, padding: 8, backgroundColor: "#f5f3ef" }}>
              <Text style={[styles.h2, { marginBottom: 4, fontSize: 8 }]}>Bank (payments)</Text>
              <Text style={styles.para}>{biz.bankName}</Text>
              <Text style={styles.para}>
                Sort {biz.sortCode} · Acc {biz.accountNumber} · {biz.accountName}
              </Text>
              {biz.paymentReference ? <Text style={styles.para}>Ref: {biz.paymentReference}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={[styles.h1, { fontSize: 12 }]}>{venueName}</Text>
      )}
      <Text style={styles.h1}>Booking dossier</Text>
      <Text style={styles.sub}>
        Generated {generatedAt}
        {bookingCode ? ` · ${bookingCode}` : ` · Ref ${bookingId.slice(0, 8)}`}
      </Text>
      <Text style={[styles.para, { fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 8 }]}>
        {booking.client_name || booking.client_email}
      </Text>
      <Text style={styles.para}>
        Event {booking.event_date}
        {booking.event_slot_label ? ` · ${booking.event_slot_label}` : " · Full venue (whole day)"}
      </Text>
      {sections.client && (
        <View style={styles.section}>
          <Text style={styles.h2}>Client</Text>
          <Field label="Name" value={booking.client_name || ""} />
          <Field label="Email" value={booking.client_email} />
          <Field label="Phone" value={booking.client_phone || ""} />
        </View>
      )}
      {sections.event && (
        <View style={styles.section}>
          <Text style={styles.h2}>Event</Text>
          <Field label="Date" value={booking.event_date} />
          <Field label="Time slot" value={booking.event_slot_label || ""} />
          <Field label="Type" value={booking.event_type || ""} />
          <Field label="Package" value={booking.package_name || ""} />
          <Field label="Status" value={booking.status} />
        </View>
      )}
      {sections.money && (
        <View style={styles.section}>
          <Text style={styles.h2}>Money</Text>
          <Field label="Total" value={gbp(booking.total_cents)} />
          <Field label="Deposit" value={gbp(booking.deposit_cents)} />
          <Field label="Balance" value={gbp(booking.balance_cents)} />
        </View>
      )}
      {sections.notes && (booking.special_requirements || booking.notes) && (
        <View style={styles.section}>
          <Text style={styles.h2}>Notes</Text>
          {booking.special_requirements ? (
            <Text style={styles.para}>Special requirements: {booking.special_requirements}</Text>
          ) : null}
          {booking.notes ? <Text style={styles.para}>Internal: {booking.notes}</Text> : null}
        </View>
      )}
      <Text style={styles.footer} fixed>
        Confidential — {venueName} · Page 1
      </Text>
    </Page>
  );
  pages.push(cover);

  const page2Content: React.ReactNode[] = [];
  if (sections.wedding && workspace && Object.keys(w).length > 0) {
    page2Content.push(
      <View key="wedding" style={styles.section} wrap={false}>
        <Text style={styles.h2}>Wedding details</Text>
        <Field label="Guests" value={w.guest_count != null ? String(w.guest_count) : ""} />
        {spaceName ? <Field label="Space" value={spaceName} /> : null}
        <Field label="Menu" value={String(w.menu_selection || "")} />
        <Field label="Decor" value={String(w.decoration_preferences || "")} />
        <Field label="Seating" value={String(w.seating_notes || "")} />
        {Array.isArray(w.timeline) && (w.timeline as { time?: string; label?: string }[]).length ? (
          <Text style={[styles.para, { marginTop: 4 }]}>Timeline:</Text>
        ) : null}
        {Array.isArray(w.timeline)
          ? (w.timeline as { time?: string; label?: string }[]).map((t, i) => (
              <Text key={i} style={styles.bullet}>
                • {t.time || ""} {t.label || ""}
              </Text>
            ))
          : null}
      </View>,
    );
  }
  if (sections.payments && milestones.length > 0) {
    page2Content.push(
      <View key="pay" style={styles.section} wrap={false}>
        <Text style={styles.h2}>Payment schedule</Text>
        {milestones.map((m, i) => (
          <Text key={i} style={styles.bullet}>
            • {m.label} — {gbp(m.amount_cents)} — due {m.due_date || "—"} — {m.status}
          </Text>
        ))}
      </View>,
    );
  }
  if (sections.tasks && tasks.length > 0) {
    page2Content.push(
      <View key="tasks" style={styles.section} wrap={false}>
        <Text style={styles.h2}>Tasks</Text>
        {tasks.map((t, i) => (
          <Text key={i} style={styles.bullet}>
            • [{t.done ? "x" : " "}] {t.title} {t.due_date ? `(due ${t.due_date})` : ""}
          </Text>
        ))}
      </View>,
    );
  }
  if (sections.vendors && vendors.length > 0) {
    page2Content.push(
      <View key="ven" style={styles.section} wrap={false}>
        <Text style={styles.h2}>Vendors</Text>
        {vendors.map((v, i) => (
          <Text key={i} style={styles.bullet}>
            • {v.vendors?.name} ({v.vendors?.vendor_type})
          </Text>
        ))}
      </View>,
    );
  }
  if (sections.documents && docs.length > 0) {
    page2Content.push(
      <View key="docs" style={styles.section} wrap={false}>
        <Text style={styles.h2}>Documents</Text>
        {docs.map((d, i) => (
          <Text key={i} style={styles.bullet}>
            • {d.name} {d.file_url ? d.file_url : ""}
          </Text>
        ))}
      </View>,
    );
  }
  if (sections.comms && comms.length > 0) {
    page2Content.push(
      <View key="comms" style={styles.section}>
        <Text style={styles.h2}>Communications</Text>
        {comms.map((c, i) => (
          <Text key={i} style={[styles.para, { marginBottom: 6 }]}>
            {new Date(c.sent_at).toLocaleString()} [{c.channel || "note"}] {c.body?.slice(0, 400)}
          </Text>
        ))}
      </View>,
    );
  }
  if (sections.record) {
    page2Content.push(
      <View key="rec" style={styles.section} wrap={false}>
        <Text style={styles.h2}>Record</Text>
        <Field label="Booking ID" value={bookingId} />
        <Field label="Created" value={new Date(booking.created_at).toLocaleString()} />
        <Field label="Updated" value={new Date(booking.updated_at).toLocaleString()} />
        {booking.enquiry_id ? <Field label="Enquiry" value={booking.enquiry_id} /> : null}
      </View>,
    );
  }

  if (page2Content.length > 0) {
    pages.push(
      <Page key="rest" size="A4" style={styles.page}>
        <View style={styles.bar} />
        <Text style={styles.h1}>Continued</Text>
        <Text style={styles.sub}>{booking.client_name || booking.client_email} · {booking.event_date}</Text>
        {page2Content}
        <Text style={styles.footer} fixed>
          Confidential — {venueName}
        </Text>
      </Page>,
    );
  }

  return <Document>{pages}</Document>;
}
