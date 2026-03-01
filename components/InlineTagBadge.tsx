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

    setPopoverPosition({
      top,
      left,
      width,
      maxHeight,
    });
  };

  // Close popover when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        buttonRef.current.contains(target)
      ) {
        return;
      }
      if (
        panelRef.current &&
        panelRef.current.contains(target)
      ) {
        return;
      }
      if (
        wrapperRef.current &&
        wrapperRef.current.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
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
    () =>
      [...existingTags].sort((a, b) =>
        formatTag(a).localeCompare(formatTag(b))
      ),
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

  const badgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    padding: "1px 8px",
    fontSize: "11px",
    lineHeight: "18px",
    borderRadius: "9999px",
    border: "1px solid #D1D5DB",
    backgroundColor: currentTag ? "#F3F4F6" : "transparent",
    color: "#6B7280",
    cursor: "pointer",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
  };

  const popoverStyle: React.CSSProperties = {
    position: "fixed",
    top: popoverPosition?.top ?? 0,
    left: popoverPosition?.left ?? 0,
    zIndex: 1000,
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "8px",
    padding: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    width: popoverPosition?.width ?? 280,
    maxHeight: popoverPosition?.maxHeight ?? 320,
    overflowY: "auto",
    boxSizing: "border-box",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "4px 6px",
    fontSize: "12px",
    borderRadius: "4px",
    border: "1px solid #D1D5DB",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    color: "#6B7280",
    marginBottom: "2px",
  };

  return (
    <span style={{ position: "relative", display: "inline-block" }} ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={badgeStyle}
        aria-label={currentTag ? `Tag: ${formatTag(currentTag)}` : "Add tag"}
        aria-expanded={isOpen}
      >
        {currentTag ? (
          <>🏷 {formatTag(currentTag)}</>
        ) : (
          <>+ Tag</>
        )}
      </button>

      {isOpen &&
        popoverPosition &&
        createPortal(
          <div ref={panelRef} style={popoverStyle} role="dialog" aria-label="Tag editor">
            {sortedTags.length > 0 && (
              <div style={{ marginBottom: "8px" }}>
                <label style={labelStyle} htmlFor="inline-tag-select">
                  Existing tags
                </label>
                <select
                  id="inline-tag-select"
                  value={selectedExisting}
                  onChange={(e) => handleExistingSelect(e.target.value)}
                  disabled={isSaving}
                  style={{ ...inputStyle, padding: "3px 4px" }}
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

            <div style={{ marginBottom: "6px" }}>
              <label style={labelStyle} htmlFor="inline-tag-type">Type</label>
              <input
                id="inline-tag-type"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="Game"
                maxLength={40}
                disabled={isSaving}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "8px" }}>
              <label style={labelStyle} htmlFor="inline-tag-name">Name</label>
              <input
                id="inline-tag-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Arknights"
                maxLength={100}
                disabled={isSaving}
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  flex: 1,
                  minWidth: "90px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  borderRadius: "4px",
                  border: "none",
                  backgroundColor: "#2563EB",
                  color: "#FFFFFF",
                  cursor: isSaving ? "not-allowed" : "pointer",
                }}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              {currentTag && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isSaving}
                  style={{
                    padding: "4px 8px",
                    fontSize: "11px",
                    borderRadius: "4px",
                    border: "1px solid #D1D5DB",
                    backgroundColor: "#FFFFFF",
                    color: "#6B7280",
                    cursor: isSaving ? "not-allowed" : "pointer",
                  }}
                >
                  Remove
                </button>
              )}
            </div>

            {localError && (
              <p role="alert" style={{ margin: "6px 0 0", fontSize: "11px", color: "#DC2626" }}>
                {localError}
              </p>
            )}
          </div>,
          document.body
        )}
    </span>
  );
}
