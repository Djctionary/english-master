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
  vocabularyWords?: string[];
  onComponentClick?: (component: GrammarComponent) => void;
  selectedComponent?: GrammarComponent | null;
}

export default function ColorCodedSentence({
  components,
  vocabularyWords,
  onComponentClick,
  selectedComponent,
}: ColorCodedSentenceProps) {
  const sorted = [...components].sort((a, b) => a.startIndex - b.startIndex);

  function containsVocabularyWord(text: string): boolean {
    if (!vocabularyWords || vocabularyWords.length === 0) return false;
    const lowerText = text.toLowerCase();
    return vocabularyWords.some((word) => lowerText.includes(word.toLowerCase()));
  }

  return (
    <div style={{ lineHeight: 2, fontSize: "18px" }} role="text" aria-label="Color-coded sentence">
      {sorted.map((comp, index) => {
        const roleInfo = ROLE_COLORS[comp.role] ?? DEFAULT_ROLE;
        const isSelected =
          selectedComponent != null &&
          selectedComponent.startIndex === comp.startIndex &&
          selectedComponent.endIndex === comp.endIndex;
        const isVocab = containsVocabularyWord(comp.text);

        return (
          <span
            key={`${comp.startIndex}-${comp.endIndex}`}
            onClick={() => onComponentClick?.(comp)}
            role="button"
            tabIndex={0}
            aria-label={`${comp.text} - ${roleInfo.label}`}
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
            {comp.text}
            {index < sorted.length - 1 ? " " : ""}
          </span>
        );
      })}
    </div>
  );
}
