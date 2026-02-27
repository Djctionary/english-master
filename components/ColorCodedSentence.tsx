"use client";

import { GrammarComponent } from "@/lib/types";

const ROLE_COLORS: Record<string, { color: string; label: string }> = {
  subject: { color: "#3B82F6", label: "Subject" },
  predicate: { color: "#EF4444", label: "Predicate" },
  direct_object: { color: "#22C55E", label: "Object" },
  indirect_object: { color: "#10B981", label: "Ind. Object" },
  complement: { color: "#06B6D4", label: "Complement" },
  adverbial: { color: "#F97316", label: "Adverbial" },
  prepositional: { color: "#A855F7", label: "Prep. Phrase" },
  conjunction: { color: "#6B7280", label: "Conjunction" },
  other: { color: "#64748B", label: "Other" },
};

const DEFAULT_ROLE = { color: "#64748B", label: "Other" };

export interface ColorCodedSentenceProps {
  components: GrammarComponent[];
  correctedSentence: string;
  vocabularyWords?: string[];
  onComponentClick?: (component: GrammarComponent) => void;
  selectedComponent?: GrammarComponent | null;
}

export default function ColorCodedSentence({
  components,
  correctedSentence,
  vocabularyWords,
  onComponentClick,
  selectedComponent,
}: ColorCodedSentenceProps) {
  function containsVocabularyWord(text: string): boolean {
    if (!vocabularyWords || vocabularyWords.length === 0) return false;
    const lowerText = text.toLowerCase();
    return vocabularyWords.some((word) => lowerText.includes(word.toLowerCase()));
  }

  // Sort components by startIndex, then by endIndex descending for overlaps
  const sorted = [...components].sort(
    (a, b) => a.startIndex - b.startIndex || b.endIndex - a.endIndex
  );

  // Build spans by walking through correctedSentence
  const spans: React.ReactNode[] = [];
  let cursor = 0;

  for (const comp of sorted) {
    // Skip components that are entirely within already-rendered text (overlap)
    if (comp.startIndex < cursor) {
      // If this component extends beyond cursor, adjust; otherwise skip entirely
      if (comp.endIndex <= cursor) continue;
      // Partial overlap: we already rendered up to cursor, so skip the overlapping part
    }

    const effectiveStart = Math.max(comp.startIndex, cursor);

    // Fill gap before this component
    if (effectiveStart > cursor) {
      const gapText = correctedSentence.slice(cursor, effectiveStart);
      spans.push(
        <span key={`gap-${cursor}`}>{gapText}</span>
      );
    }

    // Render the component span using correctedSentence slice
    const compText = correctedSentence.slice(effectiveStart, comp.endIndex);
    const roleInfo = ROLE_COLORS[comp.role] ?? DEFAULT_ROLE;
    const isSelected =
      selectedComponent != null &&
      selectedComponent.startIndex === comp.startIndex &&
      selectedComponent.endIndex === comp.endIndex;
    const isVocab = containsVocabularyWord(compText);

    spans.push(
      <span
        key={`comp-${comp.startIndex}-${comp.endIndex}`}
        onClick={() => onComponentClick?.(comp)}
        role="button"
        tabIndex={0}
        aria-label={`${compText} - ${roleInfo.label}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onComponentClick?.(comp);
          }
        }}
        title={roleInfo.label}
        style={{
          color: roleInfo.color,
          cursor: onComponentClick ? "pointer" : "default",
          fontWeight: isSelected ? 700 : 500,
          textDecoration: isSelected ? "underline" : "none",
          borderRadius: "3px",
          padding: "2px 0",
          position: "relative",
          ...(isVocab && {
            borderBottom: "2px dashed currentColor",
            backgroundColor: "#FEF9C3",
          }),
        }}
      >
        {compText}
      </span>
    );

    cursor = comp.endIndex;
  }

  // Fill trailing text after the last component
  if (cursor < correctedSentence.length) {
    spans.push(
      <span key={`gap-${cursor}`}>{correctedSentence.slice(cursor)}</span>
    );
  }

  return (
    <div style={{ lineHeight: 2, fontSize: "18px" }} role="text" aria-label="Color-coded sentence">
      {spans}
    </div>
  );
}
