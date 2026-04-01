"use client";

import { useEffect, useRef, useState } from "react";
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
          <TagFilterDropdown
            options={tagTypes}
            value={selectedTagType}
            onChange={onTagFilterChange}
          />
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

/* ── Custom tag filter dropdown ── */

function TagFilterDropdown({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const allItems = [{ label: "All tags", value: "" }, ...options.map((o) => ({ label: o, value: o }))];
  const selectedLabel = value ? value : "All tags";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label="Filter by tag type"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          padding: "var(--space-sm) var(--space-md)",
          paddingRight: "var(--space-xl)",
          fontSize: "var(--text-small)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: open ? "var(--color-primary)" : "var(--color-border)",
          borderRadius: "var(--radius-sm)",
          backgroundColor: "var(--color-surface)",
          color: "var(--color-text)",
          cursor: "pointer",
          whiteSpace: "nowrap",
          minWidth: "120px",
          position: "relative",
          transition: "border-color var(--transition-fast)",
          boxShadow: open ? "0 0 0 3px var(--color-primary-light)" : "none",
        }}
      >
        {selectedLabel}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--color-text-muted)",
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Tag filter options"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: "100%",
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-md)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {allItems.map((item) => {
            const isActive = item.value === value;
            return (
              <button
                key={item.value}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "var(--space-sm) var(--space-md)",
                  border: "none",
                  backgroundColor: isActive ? "var(--color-primary-light)" : "var(--color-surface)",
                  color: isActive ? "var(--color-primary)" : "var(--color-text)",
                  fontSize: "var(--text-small)",
                  fontWeight: isActive ? 600 : 400,
                  textAlign: "left",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "background-color var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = "var(--color-surface-alt)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isActive ? "var(--color-primary-light)" : "var(--color-surface)";
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
