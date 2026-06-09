import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { ADMIN_APP_NAME } from "@/lib/venue-constants";
import { PDF, PAGE_PAD, theme, PdfTopBand, PdfAccentLine, PdfPageFooter, PdfSectionTitle } from "@/lib/banqueting-pdf-theme";
import {
  CRM_GUIDE_CHECKLIST,
  CRM_GUIDE_CONNECTION_TABLE,
  CRM_GUIDE_INTRO,
  CRM_GUIDE_PIPELINE,
  CRM_GUIDE_SECTIONS,
  CRM_GUIDE_SETTINGS_HUB,
  CRM_GUIDE_TOC,
  CRM_GUIDE_WORKSPACE_TABS,
  type GuideSection,
} from "@/lib/admin-crm-guide-content";

const g = StyleSheet.create({
  coverPage: {
    paddingHorizontal: PAGE_PAD.h,
    paddingTop: 56,
    paddingBottom: PAGE_PAD.bottom,
    fontFamily: "Helvetica",
    backgroundColor: PDF.cream,
    color: PDF.ink,
  },
  coverBand: {
    height: 8,
    backgroundColor: PDF.band,
    marginHorizontal: -PAGE_PAD.h,
    marginTop: -56,
    marginBottom: 40,
  },
  coverKicker: {
    fontSize: 8,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: PDF.gold,
    marginBottom: 14,
    fontFamily: "Helvetica-Bold",
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    marginBottom: 10,
    lineHeight: 1.15,
    color: PDF.ink,
  },
  coverSub: {
    fontSize: 12,
    color: PDF.muted,
    marginBottom: 20,
    lineHeight: 1.5,
    maxWidth: 420,
  },
  coverMetaBox: {
    marginTop: 36,
    padding: 16,
    backgroundColor: PDF.white,
    borderWidth: 1,
    borderColor: PDF.line,
  },
  coverMetaLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: PDF.muted,
    marginBottom: 4,
  },
  coverMetaValue: { fontSize: 9, color: PDF.ink, lineHeight: 1.45 },
  docKind: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: PDF.gold,
    marginBottom: 6,
  },
  intro: { fontSize: 9, lineHeight: 1.55, marginBottom: 10, color: PDF.ink },
  tocItem: {
    flexDirection: "row",
    marginBottom: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: PDF.line,
  },
  tocNum: {
    width: 20,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: PDF.gold,
  },
  tocText: { flex: 1, fontSize: 9, color: PDF.ink },
  diagramTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: PDF.ink,
    marginBottom: 4,
  },
  diagramSub: { fontSize: 8, color: PDF.muted, marginBottom: 14, lineHeight: 1.4 },
  pipelineGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 8 },
  pipelineStep: {
    width: "23%",
    marginBottom: 10,
    padding: 8,
    backgroundColor: PDF.cream,
    borderWidth: 1,
    borderColor: PDF.line,
    alignItems: "center",
    minHeight: 72,
  },
  pipelineStepWide: {
    width: "48%",
    marginBottom: 10,
    padding: 10,
    backgroundColor: PDF.cream,
    borderWidth: 1,
    borderColor: PDF.line,
    flexDirection: "row",
    alignItems: "center",
  },
  pipelineNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PDF.band,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  pipelineNumText: { fontSize: 9, color: PDF.white, fontFamily: "Helvetica-Bold", textAlign: "center" },
  pipelineStepTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: PDF.ink, textAlign: "center", marginBottom: 2 },
  pipelineStepPath: { fontSize: 6.5, color: PDF.gold, textAlign: "center", marginBottom: 2 },
  pipelineStepShort: { fontSize: 6.5, color: PDF.muted, textAlign: "center", lineHeight: 1.3 },
  pipelineArrowRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 4,
    width: "100%",
  },
  pipelineArrow: { fontSize: 14, color: PDF.goldAccent, fontFamily: "Helvetica-Bold" },
  hubRoot: {
    padding: 12,
    backgroundColor: PDF.band,
    alignItems: "center",
    marginBottom: 12,
  },
  hubRootText: { fontSize: 11, fontFamily: "Helvetica-Bold", color: PDF.white, letterSpacing: 1 },
  hubRootSub: { fontSize: 7, color: "#fde68a", marginTop: 2 },
  hubRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  hubCard: {
    width: "31%",
    padding: 8,
    backgroundColor: PDF.cream,
    borderWidth: 1,
    borderColor: PDF.line,
    minHeight: 64,
  },
  hubCardTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: PDF.gold, marginBottom: 4 },
  hubCardFeed: { fontSize: 6.5, color: PDF.muted, lineHeight: 1.35, marginBottom: 2 },
  hubArrowDown: { textAlign: "center", fontSize: 12, color: PDF.goldAccent, marginVertical: 4 },
  hubCentre: {
    padding: 14,
    borderWidth: 2,
    borderColor: PDF.goldAccent,
    backgroundColor: PDF.white,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  hubCentreTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: PDF.ink },
  hubCentreSub: { fontSize: 7.5, color: PDF.muted, marginTop: 3, textAlign: "center" },
  hubSpokeRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  hubSpoke: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginHorizontal: 3,
    marginBottom: 4,
    backgroundColor: PDF.tableHead,
    borderWidth: 1,
    borderColor: PDF.line,
    fontSize: 7,
    color: PDF.ink,
  },
  workspaceGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  workspaceTab: {
    width: "24%",
    marginBottom: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: PDF.line,
    backgroundColor: PDF.white,
    minHeight: 52,
  },
  workspaceTabNum: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: PDF.white,
    backgroundColor: PDF.goldAccent,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginBottom: 3,
  },
  workspaceTabName: { fontSize: 8, fontFamily: "Helvetica-Bold", color: PDF.ink, marginBottom: 2 },
  workspaceTabFocus: { fontSize: 6.5, color: PDF.muted, lineHeight: 1.3 },
  sectionBlock: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: PDF.gold,
    marginBottom: 4,
  },
  sectionPath: { fontSize: 7.5, color: PDF.muted, marginBottom: 6, fontFamily: "Helvetica-Oblique" },
  para: { fontSize: 8.5, lineHeight: 1.45, marginBottom: 6, color: PDF.ink },
  bullet: { fontSize: 8, lineHeight: 1.4, marginBottom: 4, paddingLeft: 8, color: PDF.ink },
  connectBox: {
    marginTop: 6,
    padding: 8,
    backgroundColor: PDF.cream,
    borderLeftWidth: 3,
    borderLeftColor: PDF.goldAccent,
  },
  connectLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: PDF.gold, marginBottom: 3 },
  connectItem: { fontSize: 7, color: PDF.muted, marginBottom: 1 },
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
    minHeight: 18,
  },
  thSource: { width: "38%", paddingRight: 6 },
  thDest: { width: "62%" },
  tdSource: { width: "38%", paddingRight: 6, fontSize: 7.5, fontFamily: "Helvetica-Bold", color: PDF.ink },
  tdDest: { width: "62%", fontSize: 7.5, color: PDF.muted },
  thText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: PDF.gold, textTransform: "uppercase", letterSpacing: 0.4 },
  checklistNum: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: PDF.tableHead,
    borderWidth: 1,
    borderColor: PDF.line,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checklistRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  checklistText: { flex: 1, fontSize: 8.5, lineHeight: 1.45, color: PDF.ink },
});

function GuidePage({ children }: { children: React.ReactNode }) {
  return (
    <Page size="A4" style={theme.page} wrap>
      <PdfTopBand />
      {children}
      <PdfPageFooter left={ADMIN_APP_NAME} renderPage={(n, t) => `${CRM_GUIDE_INTRO.title} · ${n} / ${t}`} />
    </Page>
  );
}

function PipelineDiagram() {
  const row1 = CRM_GUIDE_PIPELINE.slice(0, 4);
  const row2 = CRM_GUIDE_PIPELINE.slice(4, 8);

  return (
    <View>
      <Text style={g.diagramTitle}>Client journey pipeline</Text>
      <Text style={g.diagramSub}>
        Work left to right for every new event. The booking record is the hub — everything else links back to it.
      </Text>
      <View style={g.pipelineGrid}>
        {row1.map((step) => (
          <View key={step.step} style={g.pipelineStep}>
            <View style={g.pipelineNum}>
              <Text style={g.pipelineNumText}>{step.step}</Text>
            </View>
            <Text style={g.pipelineStepTitle}>{step.title}</Text>
            <Text style={g.pipelineStepPath}>{step.path}</Text>
            <Text style={g.pipelineStepShort}>{step.short}</Text>
          </View>
        ))}
      </View>
      <View style={g.pipelineArrowRow}>
        <Text style={g.pipelineArrow}>↓ continue ↓</Text>
      </View>
      <View style={g.pipelineGrid}>
        {row2.map((step) => (
          <View key={step.step} style={g.pipelineStep}>
            <View style={g.pipelineNum}>
              <Text style={g.pipelineNumText}>{step.step}</Text>
            </View>
            <Text style={g.pipelineStepTitle}>{step.title}</Text>
            <Text style={g.pipelineStepPath}>{step.path}</Text>
            <Text style={g.pipelineStepShort}>{step.short}</Text>
          </View>
        ))}
      </View>
      <View style={[g.hubCentre, { marginTop: 14 }]}>
        <Text style={g.hubCentreTitle}>BOOKING = central record</Text>
        <Text style={g.hubCentreSub}>
          Booking code on invoices · payments · contracts · exports · workspace tabs
        </Text>
      </View>
    </View>
  );
}

function SettingsHubDiagram() {
  return (
    <View>
      <Text style={g.diagramTitle}>Settings hub — configure once</Text>
      <Text style={g.diagramSub}>
        Update Settings when venue, bank, or slot rules change. All PDFs and forms read from here automatically.
      </Text>
      <View style={g.hubRoot}>
        <Text style={g.hubRootText}>SETTINGS (/admin/settings)</Text>
        <Text style={g.hubRootSub}>Logo · Business & bank · Booking slots · This guide PDF</Text>
      </View>
      <View style={g.hubRow}>
        {CRM_GUIDE_SETTINGS_HUB.slice(0, 3).map((node) => (
          <View key={node.setting} style={g.hubCard}>
            <Text style={g.hubCardTitle}>{node.setting}</Text>
            {node.feeds.map((f, i) => (
              <Text key={i} style={g.hubCardFeed}>
                → {f}
              </Text>
            ))}
          </View>
        ))}
      </View>
      <Text style={g.hubArrowDown}>↓</Text>
      <View style={g.hubRow}>
        <View style={[g.hubCard, { width: "48%" }]}>
          <Text style={g.hubCardTitle}>Season pricing</Text>
          {CRM_GUIDE_SETTINGS_HUB[3].feeds.map((f, i) => (
            <Text key={i} style={g.hubCardFeed}>
              → {f}
            </Text>
          ))}
        </View>
        <View style={[g.hubCard, { width: "48%" }]}>
          <Text style={g.hubCardTitle}>Packages</Text>
          <Text style={g.hubCardFeed}>→ Booking totals & contract line items</Text>
          <Text style={g.hubCardFeed}>→ Slot rules per package</Text>
        </View>
      </View>
      <Text style={g.hubArrowDown}>↓ all feed into ↓</Text>
      <View style={g.hubCentre}>
        <Text style={g.hubCentreTitle}>BOOKINGS + CALENDAR + ENQUIRIES</Text>
        <Text style={g.hubCentreSub}>Operations hub at /admin/operations lists every module</Text>
      </View>
      <View style={g.hubSpokeRow}>
        {["Invoices", "Hire contracts", "Payments", "Reports", "Audit log"].map((label) => (
          <Text key={label} style={g.hubSpoke}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function WorkspaceTabsDiagram() {
  return (
    <View>
      <Text style={g.diagramTitle}>Booking workspace — 8 tabs in order</Text>
      <Text style={g.diagramSub}>Open any booking → work through tabs 1–8. Contracts and payments sit early in the flow.</Text>
      <View style={g.workspaceGrid}>
        {CRM_GUIDE_WORKSPACE_TABS.map((tab) => (
          <View key={tab.n} style={g.workspaceTab}>
            <Text style={g.workspaceTabNum}>{tab.n}</Text>
            <Text style={g.workspaceTabName}>{tab.name}</Text>
            <Text style={g.workspaceTabFocus}>{tab.focus}</Text>
          </View>
        ))}
      </View>
      <View style={[g.connectBox, { marginTop: 12 }]}>
        <Text style={g.connectLabel}>Quick actions on the booking page</Text>
        <Text style={g.connectItem}>• Quick update dropdown — edit client, date, slot, package, money without leaving the page</Text>
        <Text style={g.connectItem}>• Export PDF — full dossier with toggles for client, money, wedding, vendors</Text>
        <Text style={g.connectItem}>• Contracts tab — Preview PDF before saving · Generate hire pack · Print with checklist</Text>
      </View>
    </View>
  );
}

function GuideSectionBlock({ sec }: { sec: GuideSection }) {
  return (
    <View style={g.sectionBlock} wrap={false}>
      <Text style={g.sectionTitle}>{sec.title}</Text>
      {sec.path ? <Text style={g.sectionPath}>Path: {sec.path}</Text> : null}
      {sec.paragraphs.map((p, i) => (
        <Text key={i} style={g.para}>
          {p}
        </Text>
      ))}
      {sec.bullets?.map((b, i) => (
        <Text key={i} style={g.bullet}>
          • {b}
        </Text>
      ))}
      {sec.connectsTo?.length ? (
        <View style={g.connectBox}>
          <Text style={g.connectLabel}>Connects to</Text>
          {sec.connectsTo.map((c, i) => (
            <Text key={i} style={g.connectItem}>
              → {c}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ConnectionTable() {
  return (
    <View>
      <PdfSectionTitle>Connection matrix</PdfSectionTitle>
      <Text style={g.diagramSub}>Quick reference when training staff — what data flows where.</Text>
      <View style={g.tableHead}>
        <Text style={[g.thText, g.thSource]}>Source</Text>
        <Text style={[g.thText, g.thDest]}>Feeds into</Text>
      </View>
      {CRM_GUIDE_CONNECTION_TABLE.map((row, i) => (
        <View key={i} style={g.tableRow}>
          <Text style={g.tdSource}>{row.source}</Text>
          <Text style={g.tdDest}>{row.destination}</Text>
        </View>
      ))}
    </View>
  );
}

export function AdminCrmGuidePdfDocument() {
  const { title, subtitle, venue, version } = CRM_GUIDE_INTRO;
  const sectionsA = CRM_GUIDE_SECTIONS.slice(0, 5);
  const sectionsB = CRM_GUIDE_SECTIONS.slice(5, 10);
  const sectionsC = CRM_GUIDE_SECTIONS.slice(10);

  return (
    <Document title={title} author={ADMIN_APP_NAME}>
      {/* Cover */}
      <Page size="A4" style={g.coverPage}>
        <View style={g.coverBand} fixed />
        <Text style={g.coverKicker}>Staff training document</Text>
        <Text style={g.coverTitle}>{title}</Text>
        <Text style={g.coverSub}>{subtitle}</Text>
        <Text style={g.coverSub}>
          Diagrams show how enquiries, bookings, contracts, and finance connect. Module sections follow with admin paths
          and bullet points. Download fresh copies anytime from Settings → User guide.
        </Text>
        <View style={g.coverMetaBox}>
          <Text style={g.coverMetaLabel}>Venue</Text>
          <Text style={g.coverMetaValue}>{venue}</Text>
          <Text style={[g.coverMetaLabel, { marginTop: 10 }]}>Version</Text>
          <Text style={g.coverMetaValue}>
            {version} · Generated from {ADMIN_APP_NAME} Settings
          </Text>
        </View>
      </Page>

      {/* Contents + intro */}
      <GuidePage>
        <Text style={g.docKind}>Contents</Text>
        <PdfAccentLine />
        <Text style={g.intro}>
          Use this guide to onboard new staff. Start with the three diagrams (pipeline, settings hub, workspace tabs), then
          read the module reference. Finish with the connection matrix and daily checklist.
        </Text>
        {CRM_GUIDE_TOC.map((item, i) => (
          <View key={i} style={g.tocItem}>
            <Text style={g.tocNum}>{i + 1}.</Text>
            <Text style={g.tocText}>{item}</Text>
          </View>
        ))}
      </GuidePage>

      {/* Pipeline diagram */}
      <GuidePage>
        <Text style={g.docKind}>Diagram 1 of 3</Text>
        <PdfAccentLine />
        <PipelineDiagram />
      </GuidePage>

      {/* Settings hub diagram */}
      <GuidePage>
        <Text style={g.docKind}>Diagram 2 of 3</Text>
        <PdfAccentLine />
        <SettingsHubDiagram />
      </GuidePage>

      {/* Workspace tabs diagram */}
      <GuidePage>
        <Text style={g.docKind}>Diagram 3 of 3</Text>
        <PdfAccentLine />
        <WorkspaceTabsDiagram />
      </GuidePage>

      {/* Modules part 1 */}
      <GuidePage>
        <PdfSectionTitle>Module reference (1 of 3)</PdfSectionTitle>
        {sectionsA.map((sec) => (
          <GuideSectionBlock key={sec.id} sec={sec} />
        ))}
      </GuidePage>

      {/* Modules part 2 */}
      <GuidePage>
        <PdfSectionTitle>Module reference (2 of 3)</PdfSectionTitle>
        {sectionsB.map((sec) => (
          <GuideSectionBlock key={sec.id} sec={sec} />
        ))}
      </GuidePage>

      {/* Modules part 3 */}
      <GuidePage>
        <PdfSectionTitle>Module reference (3 of 3)</PdfSectionTitle>
        {sectionsC.map((sec) => (
          <GuideSectionBlock key={sec.id} sec={sec} />
        ))}
      </GuidePage>

      {/* Matrix + checklist */}
      <GuidePage>
        <ConnectionTable />
        <PdfSectionTitle>Daily checklist</PdfSectionTitle>
        <Text style={[g.diagramSub, { marginBottom: 12 }]}>Follow this order for a typical new client.</Text>
        {CRM_GUIDE_CHECKLIST.map((line, i) => (
          <View key={i} style={g.checklistRow}>
            <View style={g.checklistNum}>
              <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: PDF.gold }}>{i + 1}</Text>
            </View>
            <Text style={g.checklistText}>{line}</Text>
          </View>
        ))}
        <View style={[g.connectBox, { marginTop: 16 }]}>
          <Text style={g.connectLabel}>Need help in the app?</Text>
          <Text style={g.connectItem}>→ Operations hub — /admin/operations</Text>
          <Text style={g.connectItem}>→ Settings → User guide — re-download this PDF</Text>
          <Text style={g.connectItem}>→ Audit log (admin only) — /admin/audit-log</Text>
        </View>
      </GuidePage>
    </Document>
  );
}
