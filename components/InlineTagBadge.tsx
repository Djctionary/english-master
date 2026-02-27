"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomType(currentTag?.type ?? "");
    setCustomName(currentTag?.name ?? "");
    setSelectedExisting("");
    setLocalError(null);
  }, [currentTag]);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    zIndex: 50,
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "8px",
    padding: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    width: "260px",
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
    <span style={{ position: "relative", display: "inline-block" }} ref={popoverRef}>
      <button
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

      {isOpen && (
        <div style={popoverStyle} role="dialog" aria-label="Tag editor">
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

          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                flex: 1,
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
        </div>
      )}
    </span>
  );
}
