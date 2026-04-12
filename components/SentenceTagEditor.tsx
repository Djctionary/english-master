"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SentenceTag } from "@/lib/types";

interface SentenceTagEditorProps {
  currentTag: SentenceTag | null;
  existingTags: SentenceTag[];
  onSaveTag: (tag: SentenceTag | null) => Promise<void>;
  isSaving: boolean;
  error: string | null;
}

function formatTag(tag: SentenceTag): string {
  return `${tag.type}: ${tag.name}`;
}

export default function SentenceTagEditor({
  currentTag,
  existingTags,
  onSaveTag,
  isSaving,
  error,
}: SentenceTagEditorProps) {
  const [selectedExisting, setSelectedExisting] = useState("");
  const [customType, setCustomType] = useState(currentTag?.type ?? "");
  const [customName, setCustomName] = useState(currentTag?.name ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setCustomType(currentTag?.type ?? "");
    setCustomName(currentTag?.name ?? "");
    setSelectedExisting("");
    setLocalError(null);
  }, [currentTag]);

  const sortedTags = useMemo(
    () => [...existingTags].sort((a, b) => formatTag(a).localeCompare(formatTag(b))),
    [existingTags]
  );

  const applyExistingTag = async () => {
    setLocalError(null);
    if (!selectedExisting) {
      setLocalError("Please choose a saved tag first.");
      return;
    }
    const [type = "", name = ""] = selectedExisting.split("|||");
    if (!type || !name) {
      setLocalError("Selected tag is invalid.");
      return;
    }
    await onSaveTag({ type, name });
    setCustomType(type);
    setCustomName(name);
  };

  const saveCustomTag = async () => {
    setLocalError(null);
    const type = customType.trim();
    const name = customName.trim();
    if (!type || !name) {
      setLocalError("Type and name are required.");
      return;
    }
    await onSaveTag({ type, name });
  };

  const clearTag = async () => {
    setLocalError(null);
    await onSaveTag(null);
  };

  return (
    <div aria-label="Sentence tag editor">
      <h3 style={{ margin: "0 0 var(--space-sm) 0", fontSize: "var(--text-body)", color: "var(--color-text)" }}>
        Context Tag
      </h3>
      <p style={{ margin: "0 0 var(--space-md) 0", color: "var(--color-text-muted)", fontSize: "var(--text-small)" }}>
        Add where you saw this sentence so review is easier to remember.
      </p>

      <div style={{ marginBottom: "var(--space-md)", fontSize: "var(--text-small)", color: "var(--color-text)" }}>
        <strong>Current:</strong>{" "}
        {currentTag ? formatTag(currentTag) : "No tag yet"}
      </div>

      {sortedTags.length > 0 && (
        <div style={{ marginBottom: "var(--space-md)" }}>
          <label
            htmlFor="existing-tag-select"
            style={{ display: "block", marginBottom: "var(--space-sm)", fontSize: "var(--text-small)", color: "var(--color-text)" }}
          >
            Choose from existing tags
          </label>
          <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", alignItems: "flex-start" }}>
            <TagSelectDropdown
              value={selectedExisting}
              onChange={setSelectedExisting}
              disabled={isSaving}
              placeholder="Select one..."
              options={sortedTags.map((tag) => ({
                value: `${tag.type}|||${tag.name}`,
                label: formatTag(tag),
              }))}
            />
            <button
              type="button"
              onClick={applyExistingTag}
              disabled={isSaving || !selectedExisting}
              className="btn-secondary"
            >
              Use Selected
            </button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "var(--space-md)" }}>
        <label
          htmlFor="tag-type-input"
          style={{ display: "block", marginBottom: "var(--space-sm)", fontSize: "var(--text-small)", color: "var(--color-text)" }}
        >
          Type (e.g., Game, Music)
        </label>
        <input
          id="tag-type-input"
          value={customType}
          onChange={(e) => setCustomType(e.target.value)}
          maxLength={40}
          disabled={isSaving}
          placeholder="Game"
          className="input-base"
          style={{ maxWidth: "320px" }}
        />
      </div>

      <div style={{ marginBottom: "var(--space-md)" }}>
        <label
          htmlFor="tag-name-input"
          style={{ display: "block", marginBottom: "var(--space-sm)", fontSize: "var(--text-small)", color: "var(--color-text)" }}
        >
          Name (source title)
        </label>
        <input
          id="tag-name-input"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          maxLength={100}
          disabled={isSaving}
          placeholder="Arknights"
          className="input-base"
          style={{ maxWidth: "420px" }}
        />
      </div>

      <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={saveCustomTag}
          disabled={isSaving}
          className="btn-primary"
        >
          {isSaving ? "Saving..." : "Save Tag"}
        </button>
        {currentTag && (
          <button
            type="button"
            onClick={clearTag}
            disabled={isSaving}
            className="btn-secondary"
          >
            Remove Tag
          </button>
        )}
      </div>

      {(localError || error) && (
        <p role="alert" style={{ margin: "var(--space-md) 0 0 0", color: "var(--color-error)", fontSize: "var(--text-small)" }}>
          {localError ?? error}
        </p>
      )}
    </div>
  );
}

function TagSelectDropdown({
  value,
  onChange,
  disabled,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder: string;
  options: { value: string; label: string }[];
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

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  return (
    <div ref={ref} style={{ position: "relative", minWidth: "240px" }}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((p) => !p)}
        aria-expanded={open}
        aria-label="Select existing tag"
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          padding: "var(--space-sm) var(--space-md)",
          paddingRight: "var(--space-xl)",
          fontSize: "var(--text-small)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: open ? "var(--color-primary)" : "var(--color-border)",
          borderRadius: "var(--radius-sm)",
          backgroundColor: "var(--color-surface)",
          color: value ? "var(--color-text)" : "var(--color-text-muted)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          position: "relative",
          transition: "border-color var(--transition-fast)",
          boxShadow: open ? "0 0 0 3px var(--color-primary-light)" : "none",
          textAlign: "left",
          minHeight: "38px",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedLabel}
        </span>
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
          aria-label="Existing tags"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: "100%",
            maxHeight: "200px",
            overflowY: "auto",
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-md)",
            zIndex: 100,
          }}
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => { onChange(""); setOpen(false); }}
            style={tagDropdownItemStyle(!value)}
            onMouseEnter={(e) => { if (value) e.currentTarget.style.backgroundColor = "var(--color-surface-alt)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = !value ? "var(--color-primary-light)" : "var(--color-surface)"; }}
          >
            {placeholder}
          </button>
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={tagDropdownItemStyle(isActive)}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "var(--color-surface-alt)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isActive ? "var(--color-primary-light)" : "var(--color-surface)"; }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function tagDropdownItemStyle(isActive: boolean): React.CSSProperties {
  return {
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
    overflow: "hidden",
    textOverflow: "ellipsis",
    transition: "background-color var(--transition-fast)",
  };
}
