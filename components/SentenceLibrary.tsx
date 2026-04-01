"use client";

import { SentenceRecord } from "@/lib/types";

export interface SentenceLibraryProps {
  sentences: SentenceRecord[];
  onSelect: (record: SentenceRecord) => void;
  onDelete?: (record: SentenceRecord) => void;
  deletingId: number | null;
  selectedId: number | null;
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  tagTypes: string[];
  selectedTagType: string;
  onTagFilterChange: (tagType: string) => void;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
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
  currentPage,
  totalPages,
  onPageChange,
  searchQuery,
  onSearchChange,
  tagTypes,
  selectedTagType,
  onTagFilterChange,
}: SentenceLibraryProps) {
  return (
    <div aria-label="Sentence library">
      {/* Search & filter bar */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-sm)",
          padding: "var(--space-md) var(--space-lg)",
          borderBottom: "1px solid var(--color-border)",
          flexWrap: "wrap",
        }}
      >
        <input
          type="search"
          placeholder="Search sentences..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search sentences"
          className="input-base"
          style={{
            flex: 1,
            minWidth: "160px",
            padding: "var(--space-sm) var(--space-md)",
            fontSize: "var(--text-small)",
          }}
        />
        {tagTypes.length > 0 && (
          <select
            value={selectedTagType}
            onChange={(e) => onTagFilterChange(e.target.value)}
            aria-label="Filter by tag type"
            className="input-base"
            style={{
              width: "auto",
              minWidth: "120px",
              padding: "var(--space-sm) var(--space-md)",
              fontSize: "var(--text-small)",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
              paddingRight: "32px",
              cursor: "pointer",
            }}
          >
            <option value="">All tags</option>
            {tagTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          style={{
            padding: "var(--space-xl)",
            textAlign: "center",
            color: "var(--color-text-muted)",
            fontSize: "var(--text-small)",
          }}
        >
          Loading...
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sentences.length === 0 && (
        <div
          style={{
            padding: "var(--space-2xl) var(--space-xl)",
            textAlign: "center",
            color: "var(--color-text-muted)",
            fontSize: "var(--text-small)",
          }}
        >
          {searchQuery
            ? "No sentences match your search."
            : "No sentences yet. Analyze one above to get started."}
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
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <button
                    onClick={() => onSelect(record)}
                    aria-current={isSelected ? "true" : undefined}
                    style={{
                      display: "block",
                      flex: 1,
                      minWidth: 0,
                      textAlign: "left",
                      padding: "var(--space-md) var(--space-lg)",
                      border: "none",
                      backgroundColor: isSelected
                        ? "var(--color-primary-light)"
                        : "transparent",
                      cursor: "pointer",
                      fontSize: "var(--text-small)",
                      color: "var(--color-text)",
                      minHeight: "48px",
                      transition: "background-color var(--transition-fast)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: isSelected ? 600 : 400,
                        marginBottom: "var(--space-xs)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {record.sentence}
                    </div>
                    <div
                      style={{
                        fontSize: "var(--text-caption)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {formatTimestamp(record.createdAt)}
                    </div>
                    {record.tag && (
                      <div
                        style={{
                          fontSize: "var(--text-caption)",
                          color: "var(--color-text-secondary)",
                          marginTop: "2px",
                        }}
                      >
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
                        borderLeft: "1px solid var(--color-border)",
                        backgroundColor: "var(--color-surface)",
                        color: "var(--color-error)",
                        width: "44px",
                        minWidth: "44px",
                        cursor: isDeleting ? "not-allowed" : "pointer",
                        fontSize: "15px",
                        transition: "background-color var(--transition-fast)",
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
            gap: "var(--space-md)",
            padding: "var(--space-md) var(--space-lg)",
          }}
        >
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="btn-secondary"
            style={{ padding: "var(--space-xs) var(--space-md)" }}
          >
            Prev
          </button>
          <span
            style={{
              fontSize: "var(--text-small)",
              color: "var(--color-text-secondary)",
            }}
          >
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="btn-secondary"
            style={{ padding: "var(--space-xs) var(--space-md)" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
