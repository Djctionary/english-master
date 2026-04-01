"use client";

import { AnalysisResult } from "@/lib/types";

export interface DetailViewProps {
  analysis: AnalysisResult;
}

export default function DetailView({ analysis }: DetailViewProps) {
  return (
    <div
      style={{ padding: "var(--space-lg)", fontSize: "var(--text-small)", color: "var(--color-text)" }}
      aria-label="Analysis details"
    >
      {/* ── UNDERSTAND IT ── */}
      <div style={{ marginBottom: "var(--space-lg)" }}>
        <h3 style={sectionHeading}>Understand It</h3>

        <p style={{ margin: "0 0 var(--space-sm) 0", lineHeight: "var(--leading-normal)" }}>
          {analysis.paraphrase}
        </p>

        {analysis.sentencePattern && (
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-caption)",
              fontFamily: "var(--font-mono)",
              color: "var(--color-accent-violet)",
              backgroundColor: "var(--color-primary-light)",
              padding: "var(--space-xs) var(--space-sm)",
              borderRadius: "var(--radius-sm)",
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontWeight: "var(--weight-semibold)" as unknown as number }}>Pattern: </span>
            {analysis.sentencePattern}
          </p>
        )}
      </div>

      {/* ── SENTENCE SKELETON ── */}
      {analysis.sentenceSkeleton && (
        <div style={{ marginBottom: "var(--space-lg)" }}>
          <h3 style={sectionHeading}>Sentence Skeleton</h3>
          <div
            style={{
              padding: "var(--space-sm) var(--space-md)",
              backgroundColor: "var(--color-surface-alt)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border)",
            }}
          >
            {/* Core */}
            <div
              style={{
                display: "flex",
                gap: "var(--space-sm)",
                marginBottom: "var(--space-sm)",
                alignItems: "baseline",
              }}
            >
              <span style={skeletonLabel}>Core</span>
              <span style={{ fontWeight: 600, fontSize: "var(--text-small)" }}>
                {analysis.sentenceSkeleton.core}
              </span>
            </div>

            {/* Layers */}
            {analysis.sentenceSkeleton.layers.map((layer, i) => (
              <div
                key={i}
                className="skeleton-layer"
                style={{
                  display: "flex",
                  gap: "var(--space-sm)",
                  marginBottom:
                    i < analysis.sentenceSkeleton!.layers.length - 1 ? "var(--space-xs)" : "0",
                  paddingLeft: "var(--space-lg)",
                  alignItems: "baseline",
                }}
              >
                <span style={skeletonLayerLabel}>+ {layer.label}</span>
                <span style={{ fontSize: "var(--text-caption)" }}>
                  <span style={{ fontWeight: 500 }}>{layer.added}</span>
                  <span style={{ color: "var(--color-text-muted)", marginLeft: "var(--space-sm)" }}>
                    ({layer.explanation})
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VOCABULARY ── */}
      {analysis.vocabulary.length > 0 && (
        <div>
          <h3 style={sectionHeading}>Vocabulary</h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}
            aria-label="Vocabulary list"
            role="list"
          >
            {analysis.vocabulary.map((item, i) => (
              <div key={i} role="listitem" style={vocabCard}>
                {/* Word + phonetic + POS */}
                <div style={{ marginBottom: "var(--space-xs)" }}>
                  <span style={vocabWord}>{item.word}</span>
                  <span style={vocabPhonetic}>{item.phonetic}</span>
                  <span style={vocabPosBadge}>{item.partOfSpeech}</span>
                </div>

                {/* Definition */}
                <div style={{ fontSize: "var(--text-caption)", lineHeight: 1.5, color: "var(--color-text)" }}>
                  {item.definition}
                </div>

                {/* Collocations */}
                {item.commonCollocations && item.commonCollocations.length > 0 && (
                  <div style={{ fontSize: "var(--text-tiny)", color: "var(--color-text-secondary)", marginTop: "var(--space-xs)" }}>
                    <span style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>Collocations: </span>
                    {item.commonCollocations.join(", ")}
                  </div>
                )}

                {/* Example sentence */}
                {item.exampleSentence && (
                  <div style={vocabExample}>{item.exampleSentence}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Style constants ── */

const sectionHeading: React.CSSProperties = {
  fontSize: "var(--text-caption)" as string,
  fontWeight: 700,
  marginBottom: "var(--space-sm)" as string,
  marginTop: 0,
  color: "var(--color-primary)" as string,
  borderBottom: "2px solid var(--color-primary)" as string,
  paddingBottom: "3px",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const skeletonLabel: React.CSSProperties = {
  fontSize: "var(--text-tiny)" as string,
  fontWeight: 700,
  color: "var(--color-primary)" as string,
  textTransform: "uppercase",
  minWidth: "40px",
  flexShrink: 0,
};

const skeletonLayerLabel: React.CSSProperties = {
  fontSize: "var(--text-tiny)" as string,
  fontWeight: 600,
  color: "var(--color-accent-violet)" as string,
  minWidth: "60px",
  flexShrink: 0,
};

const vocabCard: React.CSSProperties = {
  padding: "var(--space-md)" as string,
  backgroundColor: "var(--color-surface-alt)" as string,
  border: "1px solid var(--color-border)" as string,
  borderRadius: "var(--radius-sm)" as string,
};

const vocabWord: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "15px",
  color: "var(--color-text)" as string,
  marginRight: "var(--space-sm)" as string,
};

const vocabPhonetic: React.CSSProperties = {
  fontSize: "var(--text-tiny)" as string,
  color: "var(--color-text-muted)" as string,
  marginRight: "var(--space-sm)" as string,
};

const vocabPosBadge: React.CSSProperties = {
  fontSize: "10px",
  backgroundColor: "var(--color-border)" as string,
  borderRadius: "var(--radius-full)" as string,
  padding: "1px 8px",
  color: "var(--color-text-secondary)" as string,
  fontWeight: 500,
};

const vocabExample: React.CSSProperties = {
  fontSize: "var(--text-caption)" as string,
  fontStyle: "italic",
  color: "var(--color-text-secondary)" as string,
  marginTop: "var(--space-xs)" as string,
  lineHeight: 1.4,
};
