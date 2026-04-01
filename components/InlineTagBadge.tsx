"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SentenceTag } from "@/lib/types";

interface InlineTagBadgeProps {
  currentTag: SentenceTag | null;
  existingTags: SentenceTag[];
  onSaveTag: (tag: SentenceTag | null) => Promise<void>;
  isSaving: boolean;
}

function formatTag(tag: SentenceTag): string {
  return `${tag.type}: ${tag.name}`;
}

export default function InlineTagBadge({
  currentTag,
  existingTags,
  onSaveTag,
  isSaving,
}: InlineTagBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customType, setCustomType] = useState(currentTag?.type ?? "");
  const [customName, setCustomName] = useState(currentTag?.name ?? "");
  const [selectedExisting, setSelectedExisting] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomType(currentTag?.type ?? "");
    setCustomName(currentTag?.name ?? "");
    setSelectedExisting("");
    setLocalError(null);
  }, [currentTag]);

  const updatePopoverPosition = () => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8;
    const desiredWidth = 280;
    const width = Math.min(desiredWidth, Math.max(220, viewportWidth - margin * 2));

    let left = rect.right - width;
    if (left < margin) left = margin;
    if (left + width > viewportWidth - margin) {
      left = viewportWidth - width - margin;
    }

    const spaceBelow = viewportHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const showAbove = spaceBelow < 220 && spaceAbove > spaceBelow;

    const maxHeight = Math.max(
      180,
      Math.min(380, (showAbove ? spaceAbove : spaceBelow) - 8)
    );

    const top = showAbove
      ? Math.max(margin, rect.top - maxHeight - 8)
      : rect.bottom + 8;

    setPopoverPosition({ top, left, width, maxHeight });
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      if (wrapperRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    updatePopoverPosition();
    const handleWindowChange = () => updatePopoverPosition();
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);
    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [isOpen]);

  const sortedTags = useMemo(
    () => [...existingTags].sort((a, b) => formatTag(a).localeCompare(formatTag(b))),
    [existingTags]
  );

  const handleExistingSelect = (value: string) => {
    setSelectedExisting(value);
    if (value) {
      const [type = "", name = ""] = value.split("|||");
      setCustomType(type);
      setCustomName(name);
    }
  };

  const handleSave = async () => {
    setLocalError(null);
    const type = customType.trim();
    const name = customName.trim();
    if (!type || !name) {
      setLocalError("Type and name are required.");
      return;
    }
    await onSaveTag({ type, name });
    setIsOpen(false);
  };

  const handleRemove = async () => {
    setLocalError(null);
    await onSaveTag(null);
    setIsOpen(false);
  };

  return (
    <span style={{ position: "relative", display: "inline-block" }} ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "3px",
          padding: "2px 10px",
          fontSize: "var(--text-tiny)",
          lineHeight: "20px",
          borderRadius: "var(--radius-full)",
          border: "1px solid var(--color-border)",
          backgroundColor: currentTag ? "var(--color-surface-alt)" : "transparent",
          color: "var(--color-text-secondary)",
          cursor: "pointer",
          whiteSpace: "nowrap",
          verticalAlign: "middle",
          transition: "background-color var(--transition-fast)",
        }}
        aria-label={currentTag ? `Tag: ${formatTag(currentTag)}` : "Add tag"}
        aria-expanded={isOpen}
      >
        {currentTag ? (
          <>&#x1F3F7; {formatTag(currentTag)}</>
        ) : (
          <>+ Tag</>
        )}
      </button>

      {isOpen &&
        popoverPosition &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Tag editor"
            style={{
              position: "fixed",
              top: popoverPosition.top,
              left: popoverPosition.left,
              zIndex: 1000,
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-md)",
              boxShadow: "var(--shadow-md)",
              width: popoverPosition.width,
              maxHeight: popoverPosition.maxHeight,
              overflowY: "auto",
              boxSizing: "border-box",
            }}
          >
            {sortedTags.length > 0 && (
              <div style={{ marginBottom: "var(--space-sm)" }}>
                <label style={popoverLabel} htmlFor="inline-tag-select">
                  Existing tags
                </label>
                <select
                  id="inline-tag-select"
                  value={selectedExisting}
                  onChange={(e) => handleExistingSelect(e.target.value)}
                  disabled={isSaving}
                  className="input-base"
                  style={{ padding: "var(--space-xs) var(--space-sm)", fontSize: "var(--text-caption)" }}
                >
                  <option value="">Select...</option>
                  {sortedTags.map((tag) => {
                    const value = `${tag.type}|||${tag.name}`;
                    return (
                      <option key={value} value={value}>
                        {formatTag(tag)}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div style={{ marginBottom: "var(--space-sm)" }}>
              <label style={popoverLabel} htmlFor="inline-tag-type">
                Type
              </label>
              <input
                id="inline-tag-type"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="Game"
                maxLength={40}
                disabled={isSaving}
                className="input-base"
                style={{ padding: "var(--space-xs) var(--space-sm)", fontSize: "var(--text-caption)" }}
              />
            </div>

            <div style={{ marginBottom: "var(--space-sm)" }}>
              <label style={popoverLabel} htmlFor="inline-tag-name">
                Name
              </label>
              <input
                id="inline-tag-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Arknights"
                maxLength={100}
                disabled={isSaving}
                className="input-base"
                style={{ padding: "var(--space-xs) var(--space-sm)", fontSize: "var(--text-caption)" }}
              />
            </div>

            <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary"
                style={{
                  flex: 1,
                  minWidth: "90px",
                  minHeight: "32px",
                  padding: "var(--space-xs) var(--space-sm)",
                  fontSize: "var(--text-tiny)",
                }}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              {currentTag && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isSaving}
                  className="btn-secondary"
                  style={{
                    minHeight: "32px",
                    padding: "var(--space-xs) var(--space-sm)",
                    fontSize: "var(--text-tiny)",
                  }}
                >
                  Remove
                </button>
              )}
            </div>

            {localError && (
              <p
                role="alert"
                style={{
                  margin: "var(--space-sm) 0 0",
                  fontSize: "var(--text-tiny)",
                  color: "var(--color-error)",
                }}
              >
                {localError}
              </p>
            )}
          </div>,
          document.body
        )}
    </span>
  );
}

const popoverLabel: React.CSSProperties = {
  display: "block",
  fontSize: "var(--text-tiny)" as string,
  color: "var(--color-text-muted)" as string,
  marginBottom: "2px",
};
