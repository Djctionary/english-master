"use client";

import { AnalysisResult } from "@/lib/types";

export interface DetailViewProps {
  analysis: AnalysisResult;
}

export default function DetailView({
  analysis,
}: DetailViewProps) {

  return (
    <div
      style={{ padding: "8px 12px", fontSize: "13px", color: "#374151" }}
      aria-label="Analysis details"
    >
      {/* ── UNDERSTAND IT ── */}
      <div style={{ marginBottom: "12px" }}>
        <h3 style={sectionHeading}>Understand It</h3>

        {/* Paraphrase — always present */}
        <p style={{ margin: "0 0 6px 0", fontSize: "13px", lineHeight: 1.6 }}>
          {analysis.paraphrase}
        </p>

        {/* Sentence pattern — optional */}
        {analysis.sentencePattern && (
          <p style={{
            margin: "0",
            fontSize: "12px",
            fontFamily: "monospace",
            color: "#4F46E5",
            backgroundColor: "#EEF2FF",
            padding: "4px 8px",
            borderRadius: "4px",
            lineHeight: 1.5,
          }}>
            <span style={{ fontWeight: 600 }}>Pattern: </span>
            {analysis.sentencePattern}
          </p>
        )}
      </div>

      {/* ── SENTENCE SKELETON ── */}
      {analysis.sentenceSkeleton && (
        <div style={{ marginBottom: "12px" }}>
          <h3 style={sectionHeading}>Sentence Skeleton</h3>
          <div style={{
            padding: "8px 12px",
            backgroundColor: "#F9FAFB",
            borderRadius: "6px",
            border: "1px solid #E5E7EB",
          }}>
            {/* Core */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "6px", alignItems: "baseline" }}>
              <span style={skeletonLabel}>Core</span>
              <span style={{ fontWeight: 600, fontSize: "13px" }}>
                {analysis.sentenceSkeleton.core}
              </span>
            </div>

            {/* Layers */}
            {analysis.sentenceSkeleton.layers.map((layer, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "8px",
                  marginBottom: i < analysis.sentenceSkeleton!.layers.length - 1 ? "4px" : "0",
                  paddingLeft: "16px",
                  alignItems: "baseline",
                }}
              >
                <span style={skeletonLayerLabel}>+ {layer.label}</span>
                <span style={{ fontSize: "12px" }}>
                  <span style={{ fontWeight: 500 }}>{layer.added}</span>
                  <span style={{ color: "#6B7280", marginLeft: "6px" }}>
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
          <h3 style={compactHeading}>Vocabulary</h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            aria-label="Vocabulary list"
            role="list"
          >
            {analysis.vocabulary.map((item, i) => (
              <div
                key={i}
                role="listitem"
                style={vocabCard}
              >
                {/* Word + phonetic + POS */}
                <div style={{ marginBottom: "4px" }}>
                  <span style={vocabWord}>{item.word}</span>
                  <span style={vocabPhonetic}>{item.phonetic}</span>
                  <span style={vocabPosBadge}>{item.partOfSpeech}</span>
                </div>

                {/* Concise definition */}
                <div style={{ fontSize: "12px", lineHeight: 1.5, color: "#374151" }}>
                  {item.definition}
                </div>

                {/* Collocations */}
                {item.commonCollocations && item.commonCollocations.length > 0 && (
                  <div style={{ fontSize: "11px", color: "#4B5563", marginTop: "4px" }}>
                    <span style={{ fontWeight: 600, color: "#6B7280" }}>Collocations: </span>
                    {item.commonCollocations.join(", ")}
                  </div>
                )}

                {/* Example sentence */}
                {item.exampleSentence && (
                  <div style={vocabExample}>
                    {item.exampleSentence}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Style constants ---- */

const sectionHeading: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  marginBottom: "6px",
  marginTop: 0,
  color: "#1F2937",
  borderBottom: "2px solid #4F46E5",
  paddingBottom: "3px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const skeletonLabel: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  color: "#4F46E5",
  textTransform: "uppercase",
  minWidth: "40px",
  flexShrink: 0,
};

const skeletonLayerLabel: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#7C3AED",
  minWidth: "60px",
  flexShrink: 0,
};

const compactHeading: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  marginBottom: "3px",
  marginTop: 0,
  color: "#1F2937",
  borderBottom: "1px solid #E5E7EB",
  paddingBottom: "2px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

/* ---- Vocabulary card styles ---- */

const vocabCard: React.CSSProperties = {
  padding: "10px 12px",
  backgroundColor: "#FAFAFA",
  border: "1px solid #E5E7EB",
  borderRadius: "6px",
};

const vocabWord: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "15px",
  color: "#111827",
  marginRight: "6px",
};

const vocabPhonetic: React.CSSProperties = {
  fontSize: "11px",
  color: "#9CA3AF",
  marginRight: "6px",
};

const vocabPosBadge: React.CSSProperties = {
  fontSize: "10px",
  backgroundColor: "#E5E7EB",
  borderRadius: "8px",
  padding: "1px 6px",
  color: "#4B5563",
  fontWeight: 500,
};

const vocabExample: React.CSSProperties = {
  fontSize: "12px",
  fontStyle: "italic",
  color: "#4B5563",
  marginTop: "4px",
  lineHeight: 1.4,
};
