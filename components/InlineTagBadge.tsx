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
                <span style={popoverLabel}>Existing tags</span>
                <InlineCustomSelect
                  value={selectedExisting}
                  onChange={handleExistingSelect}
                  disabled={isSaving}
                  placeholder="Select..."
                  options={sortedTags.map((tag) => ({
                    value: `${tag.type}|||${tag.name}`,
                    label: formatTag(tag),
                  }))}
                />
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

function InlineCustomSelect({
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
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((p) => !p)}
        aria-expanded={open}
        aria-label="Select existing tag"
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          padding: "var(--space-xs) var(--space-sm)",
          paddingRight: "var(--space-xl)",
          fontSize: "var(--text-caption)",
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
          boxShadow: open ? "0 0 0 2px var(--color-primary-light)" : "none",
          textAlign: "left",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedLabel}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            position: "absolute",
            right: "8px",
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
            top: "calc(100% + 2px)",
            left: 0,
            width: "100%",
            maxHeight: "160px",
            overflowY: "auto",
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-md)",
            zIndex: 10,
          }}
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => { onChange(""); setOpen(false); }}
            style={dropdownItemStyle(!value)}
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
                style={dropdownItemStyle(isActive)}
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

function dropdownItemStyle(isActive: boolean): React.CSSProperties {
  return {
    display: "block",
    width: "100%",
    padding: "var(--space-xs) var(--space-sm)",
    border: "none",
    backgroundColor: isActive ? "var(--color-primary-light)" : "var(--color-surface)",
    color: isActive ? "var(--color-primary)" : "var(--color-text)",
    fontSize: "var(--text-caption)",
    fontWeight: isActive ? 600 : 400,
    textAlign: "left",
    cursor: "pointer",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    transition: "background-color var(--transition-fast)",
  };
}
