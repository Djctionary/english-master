"use client";

import { useState } from "react";
import { AnalysisResult, GrammarComponent, StructureAnalysis } from "@/lib/types";

export interface DetailViewProps {
  analysis: AnalysisResult;
  selectedComponent?: GrammarComponent | null;
}

export default function DetailView({
  analysis,
  selectedComponent,
}: DetailViewProps) {
  const structureAnalysis: StructureAnalysis | undefined = analysis.structureAnalysis;
  const [clausesOpen, setClausesOpen] = useState(false);

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

        {/* Simplified version — new, optional */}
        {analysis.simplifiedVersion && (
          <p style={{ margin: "0 0 6px 0", fontSize: "12px", color: "#4B5563", lineHeight: 1.5 }}>
            <span style={{ fontWeight: 600, color: "#6B7280" }}>Simply: </span>
            {analysis.simplifiedVersion}
          </p>
        )}

        {/* Sentence pattern — new, optional */}
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

      {/* Selected Component — small inline highlighted block */}
      {selectedComponent && (
        <div
          data-testid="selected-component"
          style={{
            display: "inline-block",
            padding: "4px 10px",
            marginBottom: "8px",
            backgroundColor: "#EEF2FF",
            border: "1px solid #C7D2FE",
            borderRadius: "4px",
            fontSize: "12px",
            lineHeight: 1.4,
          }}
        >
          <span style={{ fontWeight: 600 }}>{selectedComponent.text}</span>
          <span style={{ color: "#6B7280", margin: "0 4px" }}>·</span>
          <span style={{ color: "#4F46E5" }}>{selectedComponent.role}</span>
          <span style={{ color: "#6B7280", margin: "0 4px" }}>—</span>
          <span>{selectedComponent.description}</span>
        </div>
      )}

      {/* ── TWO-COLUMN LAYOUT ── */}
      <div
        className="detail-view-columns"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        {/* Left column: vocabulary cards */}
        {analysis.vocabulary.length > 0 && (
          <div
            style={{
              flex: "1 1 55%",
              minWidth: "0",
            }}
          >
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

                  {/* Collocations — new */}
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

                  {/* Difficulty reason */}
                  {item.difficultyReason && (
                    <div style={vocabDifficulty}>
                      {item.difficultyReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right column: grammar & phrases */}
        <div
          style={{
            flex: "1 1 40%",
            minWidth: "0",
          }}
        >
          <h3 style={compactHeading}>Grammar & Phrases</h3>

          {/* Phrase Explanations */}
          {structureAnalysis?.phraseExplanations && (
            <div style={{ marginBottom: "6px" }}>
              <div style={structureRow}>
                <span style={structureLabel}>Phrase Explanations</span>
                <span>{structureAnalysis.phraseExplanations}</span>
              </div>
            </div>
          )}

          {/* Tense Logic */}
          {structureAnalysis?.tenseLogic && (
            <div style={{ marginBottom: "6px" }}>
              <div style={structureRow}>
                <span style={structureLabel}>Tense Logic</span>
                <span>{structureAnalysis.tenseLogic}</span>
              </div>
            </div>
          )}

          {/* Grammar Notes */}
          {analysis.grammarNotes.length > 0 && (
            <div style={{ marginBottom: "6px" }}>
              <div style={structureRow}>
                <span style={structureLabel}>Grammar Notes</span>
                <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px" }}>
                  {analysis.grammarNotes.map((note, i) => (
                    <li key={i} style={{ marginBottom: "2px" }}>{note}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Clauses — collapsed, backward compat */}
          {analysis.clauses.length > 0 && (
            <div style={{ marginBottom: "6px" }}>
              <button
                type="button"
                onClick={() => setClausesOpen(!clausesOpen)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "#6B7280",
                  padding: "4px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span style={{ fontSize: "10px" }}>{clausesOpen ? "\u25BE" : "\u25B8"}</span>
                Clauses ({analysis.clauses.length})
              </button>
              {clausesOpen && (
                <ul style={compactList}>
                  {analysis.clauses.map((clause, i) => (
                    <li key={i} style={compactRow}>
                      <span style={{ fontWeight: 500 }}>{clause.text}</span>
                      <span style={dimText}> — {clause.type}, {clause.role}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Clause Connections — collapsed under clauses for backward compat */}
          {structureAnalysis?.clauseConnections && clausesOpen && (
            <div style={{ marginBottom: "6px" }}>
              <div style={structureRow}>
                <span style={structureLabel}>Clause Connections</span>
                <span>{structureAnalysis.clauseConnections}</span>
              </div>
            </div>
          )}
        </div>
      </div>
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

const compactList: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
};

const compactRow: React.CSSProperties = {
  padding: "2px 0",
  borderBottom: "1px solid #F3F4F6",
  fontSize: "12px",
};

const dimText: React.CSSProperties = {
  color: "#6B7280",
  fontSize: "12px",
};

const structureRow: React.CSSProperties = {
  padding: "3px 6px",
  backgroundColor: "#F9FAFB",
  borderRadius: "3px",
  fontSize: "12px",
  lineHeight: 1.4,
};

const structureLabel: React.CSSProperties = {
  display: "block",
  fontWeight: 600,
  fontSize: "11px",
  color: "#4F46E5",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  marginBottom: "1px",
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

const vocabDifficulty: React.CSSProperties = {
  fontSize: "11px",
  color: "#B45309",
  marginTop: "4px",
};
