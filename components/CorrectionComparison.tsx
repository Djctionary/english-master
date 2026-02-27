"use client";

import { Correction } from "@/lib/types";

export interface CorrectionComparisonProps {
  originalSentence: string;
  correctedSentence: string;
  corrections: Correction[];
}

const containerStyle: React.CSSProperties = {
  padding: "16px",
  backgroundColor: "#FFFBEB",
  borderRadius: "8px",
  border: "1px solid #FDE68A",
  marginBottom: "16px",
};

const headingStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  marginBottom: "12px",
  color: "#92400E",
};

const comparisonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "16px",
};

const sentenceBoxStyle: React.CSSProperties = {
  flex: 1,
  padding: "12px",
  borderRadius: "6px",
  fontSize: "15px",
  lineHeight: 1.6,
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  marginBottom: "6px",
};

/**
 * Highlights occurrences of correction originals in the sentence with red strikethrough,
 * and correction targets in the corrected sentence with green.
 */
function highlightOriginal(sentence: string, corrections: Correction[]): React.ReactNode[] {
  if (corrections.length === 0) return [sentence];

  const parts: React.ReactNode[] = [];
  let remaining = sentence;
  let keyIndex = 0;

  // Process each correction's original text in order of appearance
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
          color: "#DC2626",
          textDecoration: "line-through",
          backgroundColor: "#FEE2E2",
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
          color: "#16A34A",
          fontWeight: 600,
          backgroundColor: "#DCFCE7",
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
    <div style={containerStyle} aria-label="Correction comparison">
      <h3 style={headingStyle}>Corrections</h3>

      {/* Side-by-side sentence comparison */}
      <div style={comparisonRowStyle}>
        <div style={{ ...sentenceBoxStyle, backgroundColor: "#FEF2F2" }}>
          <div style={{ ...labelStyle, color: "#991B1B" }}>Original</div>
          <div>{highlightOriginal(originalSentence, corrections)}</div>
        </div>
        <div style={{ ...sentenceBoxStyle, backgroundColor: "#F0FDF4" }}>
          <div style={{ ...labelStyle, color: "#166534" }}>Corrected</div>
          <div>{highlightCorrected(correctedSentence, corrections)}</div>
        </div>
      </div>
    </div>
  );
}
