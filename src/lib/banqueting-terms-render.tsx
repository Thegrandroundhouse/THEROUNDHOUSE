import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { PDF, theme } from "@/lib/banqueting-pdf-theme";
import { ROUNDHOUSE_BANQUETING_TERMS_SECTIONS } from "@/lib/roundhouse-terms-sections";

export function defaultTermsSections(): string[] {
  return ROUNDHOUSE_BANQUETING_TERMS_SECTIONS.map((s) => s);
}

export function resolveTermsSections(sections?: string[] | null): string[] {
  if (Array.isArray(sections) && sections.some((s) => typeof s === "string" && s.trim())) {
    return sections.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim());
  }
  return defaultTermsSections();
}

function TermsParagraphs({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());
  if (!paragraphs.length) return null;
  return (
    <>
      {paragraphs.map((para, i) => (
        <Text key={i} style={theme.termsPara}>
          {para.trim()}
        </Text>
      ))}
    </>
  );
}

function TermsSectionBlock({ block, isMainTitle }: { block: string; isMainTitle?: boolean }) {
  const lines = block.split("\n").filter((l) => l.trim());
  const title = lines[0] || "";
  const rest = lines.slice(1).join("\n");
  return (
    <View style={theme.termsSection}>
      {title ? <Text style={isMainTitle ? theme.termsMainTitle : theme.termsTitle}>{title}</Text> : null}
      {rest ? <TermsParagraphs text={rest} /> : null}
    </View>
  );
}

function isSection24Block(block: string): boolean {
  const first = block.split("\n").find((l) => l.trim())?.trim() || "";
  return /^24\.\s/i.test(first);
}

export function PdfTermsSectionsBody({
  sections,
  clientName,
  eventDate,
}: {
  sections: string[];
  clientName?: string;
  eventDate?: string;
}) {
  const resolved = resolveTermsSections(sections);
  if (!resolved.length) return null;

  const lastSection = resolved[resolved.length - 1];
  const bodySections = resolved.slice(0, -1);
  const section24Index = bodySections.findIndex(isSection24Block);
  const before24 = section24Index >= 0 ? bodySections.slice(0, section24Index) : bodySections;
  const section24 = section24Index >= 0 ? bodySections[section24Index] : null;

  return (
    <>
      {before24.map((block, i) => (
        <TermsSectionBlock key={i} block={block} isMainTitle={i === 0} />
      ))}
      {(section24 || lastSection) && (
        <View break>
          {section24 ? <TermsSectionBlock block={section24} /> : null}
          <View
            style={{
              marginTop: section24 ? 14 : 0,
              padding: 12,
              backgroundColor: PDF.cream,
              borderWidth: 1,
              borderColor: PDF.line,
            }}
          >
            <TermsParagraphs text={lastSection} />
            {clientName || eventDate ? (
              <Text style={{ fontSize: 7.5, marginTop: 10, color: PDF.muted, fontFamily: "Helvetica-Bold" }}>
                {clientName ? `Client: ${clientName}` : ""}
                {clientName && eventDate ? "  ·  " : ""}
                {eventDate ? `Event: ${eventDate}` : ""}
              </Text>
            ) : null}
          </View>
        </View>
      )}
    </>
  );
}
