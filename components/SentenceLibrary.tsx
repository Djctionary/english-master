"use client";

import { SentenceRecord } from "@/lib/types";

export interface SentenceLibraryProps {
  sentences: SentenceRecord[];
  onSelect: (record: SentenceRecord) => void;
  onDelete?: (record: SentenceRecord) => void;
  deletingId?: number | null;
  selectedId?: number | null;
  isLoading?: boolean;
  // Pagination
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  // Search
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  // Tag filter
  tagTypes?: string[];
  selectedTagType?: string;
  onTagFilterChange?: (tagType: string) => void;
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
  onDelete,
  deletingId,
  selectedId,
  isLoading,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  searchQuery = "",
  onSearchChange,
  tagTypes = [],
  selectedTagType = "",
  onTagFilterChange,
}: SentenceLibraryProps) {
  return (
    <div>
      {/* Search & Filter Bar */}
      {(onSearchChange || onTagFilterChange) && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "10px 12px",
            borderBottom: "1px solid #E5E7EB",
            flexWrap: "wrap",
          }}
        >
          {onSearchChange && (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search sentences..."
              aria-label="Search sentences"
              style={{
                flex: "1 1 200px",
                padding: "6px 10px",
                fontSize: "13px",
                border: "1px solid #D1D5DB",
                borderRadius: "6px",
                outline: "none",
                minWidth: "0",
              }}
            />
          )}
          {onTagFilterChange && tagTypes.length > 0 && (
            <select
              value={selectedTagType}
              onChange={(e) => onTagFilterChange(e.target.value)}
              aria-label="Filter by tag type"
              style={{
                padding: "6px 10px",
                fontSize: "13px",
                border: "1px solid #D1D5DB",
                borderRadius: "6px",
                backgroundColor: "#FFFFFF",
                cursor: "pointer",
              }}
            >
              <option value="">All tags</option>
              {tagTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div
          style={{ padding: "24px", textAlign: "center", color: "#6B7280" }}
          aria-label="Loading sentence library"
          role="status"
        >
          Loading sentences...
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sentences.length === 0 && (
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
            {searchQuery || selectedTagType ? "No matching sentences" : "No sentences yet"}
          </p>
          <p style={{ margin: 0 }}>
            {searchQuery || selectedTagType
              ? "Try a different search or filter."
              : "Enter an English sentence above to start building your library."}
          </p>
        </div>
      )}

      {/* Sentence list */}
      {!isLoading && sentences.length > 0 && (
        <ul
          style={{ listStyle: "none", padding: 0, margin: 0 }}
          aria-label="Sentence library"
        >
          {sentences.map((record) => {
            const isSelected = selectedId === record.id;
            const isDeleting = deletingId === record.id;
            return (
              <li key={record.id}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "stretch",
                    borderBottom: "1px solid #E5E7EB",
                  }}
                >
                  <button
                    onClick={() => onSelect(record)}
                    aria-current={isSelected ? "true" : undefined}
                    style={{
                      display: "block",
                      flex: 1,
                      textAlign: "left",
                      padding: "12px 16px",
                      border: "none",
                      backgroundColor: isSelected ? "#EFF6FF" : "transparent",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#1F2937",
                      minHeight: "48px",
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
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(record)}
                      disabled={isDeleting}
                      aria-label={`Delete sentence: ${record.sentence}`}
                      title="Delete sentence"
                      style={{
                        border: "none",
                        borderLeft: "1px solid #E5E7EB",
                        backgroundColor: "#FFFFFF",
                        color: "#B91C1C",
                        width: "44px",
                        minWidth: "44px",
                        cursor: isDeleting ? "not-allowed" : "pointer",
                        fontSize: "15px",
                      }}
                    >
                      {isDeleting ? "\u2026" : "\u00D7"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && onPageChange && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "12px",
            padding: "10px 12px",
            borderTop: "1px solid #E5E7EB",
            fontSize: "13px",
            color: "#4B5563",
          }}
        >
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            style={{
              padding: "4px 10px",
              border: "1px solid #D1D5DB",
              borderRadius: "4px",
              backgroundColor: currentPage <= 1 ? "#F3F4F6" : "#FFFFFF",
              cursor: currentPage <= 1 ? "not-allowed" : "pointer",
              color: currentPage <= 1 ? "#9CA3AF" : "#374151",
              fontSize: "13px",
            }}
          >
            Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            style={{
              padding: "4px 10px",
              border: "1px solid #D1D5DB",
              borderRadius: "4px",
              backgroundColor: currentPage >= totalPages ? "#F3F4F6" : "#FFFFFF",
              cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
              color: currentPage >= totalPages ? "#9CA3AF" : "#374151",
              fontSize: "13px",
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
