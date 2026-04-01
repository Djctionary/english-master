"use client";

import { Correction } from "@/lib/types";

export interface CorrectionComparisonProps {
  originalSentence: string;
  correctedSentence: string;
  corrections: Correction[];
}

function highlightOriginal(sentence: string, corrections: Correction[]): React.ReactNode[] {
  if (corrections.length === 0) return [sentence];

  const parts: React.ReactNode[] = [];
  let remaining = sentence;
  let keyIndex = 0;

  const sortedCorrections = [...corrections].sort((a, b) => {
    const idxA = sentence.indexOf(a.original);
    const idxB = sentence.indexOf(b.original);
    return idxA - idxB;
  });

  for (const correction of sortedCorrections) {
    const idx = remaining.indexOf(correction.original);
    if (idx === -1) continue;

    if (idx > 0) {
      parts.push(<span key={`text-${keyIndex++}`}>{remaining.slice(0, idx)}</span>);
    }
    parts.push(
      <span
        key={`err-${keyIndex++}`}
        style={{
          color: "var(--color-error-hover)",
          textDecoration: "line-through",
          backgroundColor: "var(--color-error-light)",
          borderRadius: "2px",
          padding: "0 2px",
        }}
      >
        {correction.original}
      </span>
    );
    remaining = remaining.slice(idx + correction.original.length);
  }

  if (remaining) {
    parts.push(<span key={`text-${keyIndex++}`}>{remaining}</span>);
  }
  return parts;
}

function highlightCorrected(sentence: string, corrections: Correction[]): React.ReactNode[] {
  if (corrections.length === 0) return [sentence];

  const parts: React.ReactNode[] = [];
  let remaining = sentence;
  let keyIndex = 0;

  const sortedCorrections = [...corrections].sort((a, b) => {
    const idxA = sentence.indexOf(a.corrected);
    const idxB = sentence.indexOf(b.corrected);
    return idxA - idxB;
  });

  for (const correction of sortedCorrections) {
    const idx = remaining.indexOf(correction.corrected);
    if (idx === -1) continue;

    if (idx > 0) {
      parts.push(<span key={`text-${keyIndex++}`}>{remaining.slice(0, idx)}</span>);
    }
    parts.push(
      <span
        key={`fix-${keyIndex++}`}
        style={{
          color: "var(--color-success)",
          fontWeight: 600,
          backgroundColor: "var(--color-success-light)",
          borderRadius: "2px",
          padding: "0 2px",
        }}
      >
        {correction.corrected}
      </span>
    );
    remaining = remaining.slice(idx + correction.corrected.length);
  }

  if (remaining) {
    parts.push(<span key={`text-${keyIndex++}`}>{remaining}</span>);
  }
  return parts;
}

export default function CorrectionComparison({
  originalSentence,
  correctedSentence,
  corrections,
}: CorrectionComparisonProps) {
  if (corrections.length === 0) return null;

  return (
    <div
      style={{
        padding: "var(--space-lg)",
        backgroundColor: "var(--color-warning-light)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-warning-border)",
        marginBottom: "var(--space-lg)",
      }}
      aria-label="Correction comparison"
    >
      <h3
        style={{
          fontSize: "var(--text-body)",
          fontWeight: 600,
          marginBottom: "var(--space-md)",
          color: "#92400E",
        }}
      >
        Corrections
      </h3>

      <div className="correction-comparison" style={{ display: "flex", gap: "var(--space-lg)" }}>
        <div
          style={{
            flex: 1,
            padding: "var(--space-md)",
            borderRadius: "var(--radius-sm)",
            fontSize: "15px",
            lineHeight: "var(--leading-normal)",
            backgroundColor: "var(--color-error-light)",
          }}
        >
          <div style={labelStyle}>Original</div>
          <div>{highlightOriginal(originalSentence, corrections)}</div>
        </div>
        <div
          style={{
            flex: 1,
            padding: "var(--space-md)",
            borderRadius: "var(--radius-sm)",
            fontSize: "15px",
            lineHeight: "var(--leading-normal)",
            backgroundColor: "var(--color-success-light)",
          }}
        >
          <div style={{ ...labelStyle, color: "#166534" }}>Corrected</div>
          <div>{highlightCorrected(correctedSentence, corrections)}</div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "var(--text-caption)" as string,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "var(--space-sm)" as string,
  color: "#991B1B",
};
