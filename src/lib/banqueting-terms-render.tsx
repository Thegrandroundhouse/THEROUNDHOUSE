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

  return (
    <>
      {bodySections.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        const title = lines[0] || "";
        const rest = lines.slice(1).join("\n");
        const isMainTitle = i === 0;
        return (
          <View key={i} style={theme.termsSection} minPresenceAhead={40}>
            {title ? (
              <Text style={isMainTitle ? theme.termsMainTitle : theme.termsTitle}>{title}</Text>
            ) : null}
            {rest ? <TermsParagraphs text={rest} /> : null}
          </View>
        );
      })}
      <View
        style={{
          marginTop: 14,
          padding: 12,
          backgroundColor: PDF.cream,
          borderWidth: 1,
          borderColor: PDF.line,
        }}
        minPresenceAhead={80}
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
    </>
  );
}
