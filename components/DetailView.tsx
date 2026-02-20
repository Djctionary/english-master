"use client";

import { AnalysisResult, GrammarComponent } from "@/lib/types";

export interface DetailViewProps {
  analysis: AnalysisResult;
  selectedComponent?: GrammarComponent | null;
}

const sectionStyle: React.CSSProperties = {
  marginBottom: "20px",
};

const headingStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  marginBottom: "8px",
  color: "#1F2937",
  borderBottom: "1px solid #E5E7EB",
  paddingBottom: "4px",
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
};

const listItemStyle: React.CSSProperties = {
  padding: "8px 0",
  borderBottom: "1px solid #F3F4F6",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#6B7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

const valueStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#374151",
};

export default function DetailView({
  analysis,
  selectedComponent,
}: DetailViewProps) {
  return (
    <div
      style={{ padding: "16px", fontSize: "14px", color: "#374151" }}
      aria-label="Analysis details"
    >
      {/* Selected Component Details */}
      {selectedComponent && (
        <div style={sectionStyle} data-testid="selected-component">
          <h3 style={headingStyle}>Selected Component</h3>
          <div style={{ padding: "12px", backgroundColor: "#F9FAFB", borderRadius: "6px" }}>
            <div style={{ marginBottom: "6px" }}>
              <span style={labelStyle}>Text: </span>
              <span style={{ ...valueStyle, fontWeight: 600 }}>{selectedComponent.text}</span>
            </div>
            <div style={{ marginBottom: "6px" }}>
              <span style={labelStyle}>Role: </span>
              <span style={valueStyle}>{selectedComponent.role}</span>
            </div>
            <div>
              <span style={labelStyle}>Description: </span>
              <span style={valueStyle}>{selectedComponent.description}</span>
            </div>
          </div>
        </div>
      )}

      {/* Clause Breakdown */}
      {analysis.clauses.length > 0 && (
        <div style={sectionStyle}>
          <h3 style={headingStyle}>Clauses</h3>
          <ul style={listStyle}>
            {analysis.clauses.map((clause, i) => (
              <li key={i} style={listItemStyle}>
                <div style={{ fontWeight: 500 }}>{clause.text}</div>
                <div style={{ fontSize: "13px", color: "#6B7280" }}>
                  <span>{clause.type}</span>
                  <span style={{ margin: "0 6px" }}>·</span>
                  <span>{clause.role}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Vocabulary */}
      {analysis.vocabulary.length > 0 && (
        <div style={sectionStyle}>
          <h3 style={headingStyle}>Vocabulary</h3>
          <ul style={listStyle} aria-label="Vocabulary list">
            {analysis.vocabulary.map((item, i) => (
              <li key={i} style={{
                padding: "12px",
                marginBottom: "10px",
                backgroundColor: "#F9FAFB",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
              }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: "15px" }}>{item.word}</span>
                  <span style={{ color: "#6B7280", fontSize: "13px" }}>{item.phonetic}</span>
                  <span style={{
                    fontSize: "12px",
                    backgroundColor: "#E5E7EB",
                    borderRadius: "4px",
                    padding: "1px 6px",
                    color: "#4B5563",
                  }}>
                    {item.partOfSpeech}
                  </span>
                </div>
                <div style={{ ...valueStyle, marginTop: "6px" }}>{item.definition}</div>
                <div style={{ fontSize: "13px", color: "#6B7280", marginTop: "4px", fontStyle: "italic" }}>
                  {item.usageNote}
                </div>
                {item.difficultyReason && (
                  <div style={{ marginTop: "6px", fontSize: "13px", color: "#92400E", backgroundColor: "#FEF3C7", borderRadius: "4px", padding: "4px 8px" }}>
                    <span style={{ fontWeight: 600 }}>Why it&#39;s important: </span>
                    {item.difficultyReason}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grammar Notes */}
      {analysis.grammarNotes.length > 0 && (
        <div style={sectionStyle}>
          <h3 style={headingStyle}>Grammar Notes</h3>
          <ul style={{ ...listStyle, paddingLeft: "16px", listStyle: "disc" }}>
            {analysis.grammarNotes.map((note, i) => (
              <li key={i} style={{ ...valueStyle, marginBottom: "4px" }}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Paraphrase */}
      <div style={sectionStyle}>
        <h3 style={headingStyle}>Paraphrase</h3>
        <p style={{ ...valueStyle, margin: 0, fontStyle: "italic" }}>
          {analysis.paraphrase}
        </p>
      </div>
    </div>
  );
}
