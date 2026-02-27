"use client";

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

  return (
    <div
      style={{ padding: "8px 12px", fontSize: "13px", color: "#374151" }}
      aria-label="Analysis details"
    >
      {/* Two-column responsive layout */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        {/* Left column: structure analysis */}
        <div
          style={{
            flex: "1 1 55%",
            minWidth: "300px",
          }}
        >
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

          {/* Clauses — compact list */}
          {analysis.clauses.length > 0 && (
            <div style={{ marginBottom: "6px" }}>
              <h3 style={compactHeading}>Clauses</h3>
              <ul style={compactList}>
                {analysis.clauses.map((clause, i) => (
                  <li key={i} style={compactRow}>
                    <span style={{ fontWeight: 500 }}>{clause.text}</span>
                    <span style={dimText}> — {clause.type}, {clause.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Structure Analysis */}
          {structureAnalysis && (
            <div style={{ marginBottom: "6px" }} data-testid="structure-analysis">
              <h3 style={compactHeading}>Structure Analysis</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {structureAnalysis.clauseConnections && (
                  <div style={structureRow}>
                    <span style={structureLabel}>Clause Connections</span>
                    <span>{structureAnalysis.clauseConnections}</span>
                  </div>
                )}
                {structureAnalysis.tenseLogic && (
                  <div style={structureRow}>
                    <span style={structureLabel}>Tense Logic</span>
                    <span>{structureAnalysis.tenseLogic}</span>
                  </div>
                )}
                {structureAnalysis.phraseExplanations && (
                  <div style={structureRow}>
                    <span style={structureLabel}>Phrase Explanations</span>
                    <span>{structureAnalysis.phraseExplanations}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Grammar Notes — compact */}
          {analysis.grammarNotes.length > 0 && (
            <div style={{ marginBottom: "6px" }}>
              <h3 style={compactHeading}>Grammar Notes</h3>
              <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px" }}>
                {analysis.grammarNotes.map((note, i) => (
                  <li key={i} style={{ marginBottom: "2px" }}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Paraphrase — compact */}
          <div style={{ marginBottom: "4px" }}>
            <h3 style={compactHeading}>Paraphrase</h3>
            <p style={{ margin: 0, fontStyle: "italic", fontSize: "12px" }}>
              {analysis.paraphrase}
            </p>
          </div>
        </div>

        {/* Right column: vocabulary cards */}
        {analysis.vocabulary.length > 0 && (
          <div
            style={{
              flex: "1 1 40%",
              minWidth: "300px",
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

                  {/* Example sentence */}
                  {item.exampleSentence && (
                    <div style={vocabExample}>
                      {item.exampleSentence}
                    </div>
                  )}

                  {/* Difficulty reason */}
                  {item.difficultyReason && (
                    <div style={vocabDifficulty}>
                      ⚡ {item.difficultyReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Compact style constants ---- */

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
