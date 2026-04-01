"use client";

import { GrammarComponent } from "@/lib/types";

const ROLE_COLORS: Record<string, { color: string; label: string }> = {
  subject: { color: "var(--color-grammar-subject)", label: "Subject" },
  predicate: { color: "var(--color-grammar-predicate)", label: "Predicate" },
  direct_object: { color: "var(--color-grammar-object)", label: "Object" },
  indirect_object: { color: "var(--color-grammar-indirect)", label: "Ind. Object" },
  complement: { color: "var(--color-grammar-complement)", label: "Complement" },
  adverbial: { color: "var(--color-grammar-adverbial)", label: "Adverbial" },
  prepositional: { color: "var(--color-grammar-prepositional)", label: "Prep. Phrase" },
  conjunction: { color: "var(--color-grammar-conjunction)", label: "Conjunction" },
  other: { color: "var(--color-grammar-other)", label: "Other" },
};

const DEFAULT_ROLE = { color: "var(--color-grammar-other)", label: "Other" };

interface ResolvedSpan {
  comp: GrammarComponent;
  start: number;
  end: number;
}

function resolveSpans(
  components: GrammarComponent[],
  sentence: string
): ResolvedSpan[] {
  const spans: ResolvedSpan[] = [];
  const usedPositions = new Set<number>();

  for (const comp of components) {
    const needle = comp.text;
    let found = false;

    for (const haystack of [sentence, sentence.toLowerCase()]) {
      const search = haystack === sentence ? needle : needle.toLowerCase();
      let searchFrom = 0;
      while (searchFrom < haystack.length) {
        const idx = haystack.indexOf(search, searchFrom);
        if (idx === -1) break;

        if (!usedPositions.has(idx)) {
          spans.push({ comp, start: idx, end: idx + search.length });
          usedPositions.add(idx);
          found = true;
          break;
        }
        searchFrom = idx + 1;
      }
      if (found) break;
    }
  }

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
  const spans: React.ReactNode[] = [];
  let cursor = 0;

  for (const { comp, start, end } of resolved) {
    if (end <= cursor) continue;
    const effectiveStart = Math.max(start, cursor);

    if (effectiveStart > cursor) {
      const gapText = correctedSentence.slice(cursor, effectiveStart);
      spans.push(<span key={`gap-${cursor}`}>{gapText}</span>);
    }

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
            backgroundColor: "var(--color-warning-light)",
          }),
        }}
      >
        {compText}
      </span>
    );

    cursor = end;
  }

  if (cursor < correctedSentence.length) {
    spans.push(
      <span key={`gap-${cursor}`}>{correctedSentence.slice(cursor)}</span>
    );
  }

  return (
    <div
      style={{ lineHeight: "var(--leading-relaxed)", fontSize: "18px" }}
      role="text"
      aria-label="Color-coded sentence"
    >
      {spans}
    </div>
  );
}
