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

interface ResolvedSpan {
  comp: GrammarComponent;
  start: number;
  end: number;
}

/**
 * Match each component's text against the corrected sentence to compute
 * accurate start/end indices. Greedy left-to-right: each match starts
 * searching from where the previous match ended, handling duplicates
 * and substrings correctly.
 *
 * Falls back to the AI-provided indices only if text matching fails.
 */
function resolveSpans(
  components: GrammarComponent[],
  sentence: string
): ResolvedSpan[] {
  const spans: ResolvedSpan[] = [];
  const usedPositions = new Set<number>();

  for (const comp of components) {
    const needle = comp.text;
    let found = false;

    // Try exact match first, then case-insensitive
    for (const haystack of [sentence, sentence.toLowerCase()]) {
      const search = haystack === sentence ? needle : needle.toLowerCase();
      let searchFrom = 0;
      while (searchFrom < haystack.length) {
        const idx = haystack.indexOf(search, searchFrom);
        if (idx === -1) break;

        if (!usedPositions.has(idx)) {
          // Use the length from the actual sentence text, not the needle
          spans.push({ comp, start: idx, end: idx + search.length });
          usedPositions.add(idx);
          found = true;
          break;
        }
        searchFrom = idx + 1;
      }
      if (found) break;
    }

    // If text not found at all, skip this component — don't produce bad spans
  }

  // Sort by position in sentence
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  return spans;
}

export interface ColorCodedSentenceProps {
  components: GrammarComponent[];
  correctedSentence: string;
  vocabularyWords?: string[];
}

export default function ColorCodedSentence({
  components,
  correctedSentence,
  vocabularyWords,
}: ColorCodedSentenceProps) {
  function containsVocabularyWord(text: string): boolean {
    if (!vocabularyWords || vocabularyWords.length === 0) return false;
    const lowerText = text.toLowerCase();
    return vocabularyWords.some((word) => lowerText.includes(word.toLowerCase()));
  }

  const resolved = resolveSpans(components, correctedSentence);

  // Build spans by walking through correctedSentence
  const spans: React.ReactNode[] = [];
  let cursor = 0;

  for (const { comp, start, end } of resolved) {
    // Skip if entirely within already-rendered text
    if (end <= cursor) continue;

    const effectiveStart = Math.max(start, cursor);

    // Fill gap before this component
    if (effectiveStart > cursor) {
      const gapText = correctedSentence.slice(cursor, effectiveStart);
      spans.push(
        <span key={`gap-${cursor}`}>{gapText}</span>
      );
    }

    // Render the component span — colors only, non-interactive
    const compText = correctedSentence.slice(effectiveStart, end);
    const roleInfo = ROLE_COLORS[comp.role] ?? DEFAULT_ROLE;
    const isVocab = containsVocabularyWord(compText);

    spans.push(
      <span
        key={`comp-${start}-${end}`}
        style={{
          color: roleInfo.color,
          fontWeight: 500,
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

    cursor = end;
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
