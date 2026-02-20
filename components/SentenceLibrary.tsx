"use client";

import { SentenceRecord } from "@/lib/types";

export interface SentenceLibraryProps {
  sentences: SentenceRecord[];
  onSelect: (record: SentenceRecord) => void;
  selectedId?: number | null;
  isLoading?: boolean;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SentenceLibrary({
  sentences,
  onSelect,
  selectedId,
  isLoading,
}: SentenceLibraryProps) {
  if (isLoading) {
    return (
      <div
        style={{ padding: "24px", textAlign: "center", color: "#6B7280" }}
        aria-label="Loading sentence library"
        role="status"
      >
        Loading sentences...
      </div>
    );
  }

  if (sentences.length === 0) {
    return (
      <div
        style={{
          padding: "32px 24px",
          textAlign: "center",
          color: "#6B7280",
          fontSize: "15px",
        }}
        aria-label="Empty sentence library"
      >
        <p style={{ margin: "0 0 8px 0", fontWeight: 500, color: "#374151" }}>
          No sentences yet
        </p>
        <p style={{ margin: 0 }}>
          Enter an English sentence above to start building your library.
        </p>
      </div>
    );
  }

  return (
    <ul
      style={{ listStyle: "none", padding: 0, margin: 0 }}
      aria-label="Sentence library"
    >
      {sentences.map((record) => {
        const isSelected = selectedId === record.id;
        return (
          <li key={record.id}>
            <button
              onClick={() => onSelect(record)}
              aria-current={isSelected ? "true" : undefined}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "12px 16px",
                border: "none",
                borderBottom: "1px solid #E5E7EB",
                backgroundColor: isSelected ? "#EFF6FF" : "transparent",
                cursor: "pointer",
                fontSize: "14px",
                color: "#1F2937",
              }}
            >
              <div
                style={{
                  fontWeight: isSelected ? 600 : 400,
                  marginBottom: "4px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {record.sentence}
              </div>
              <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
                {formatTimestamp(record.createdAt)}
              </div>
              {record.tag && (
                <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>
                  {record.tag.type}: {record.tag.name}
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
