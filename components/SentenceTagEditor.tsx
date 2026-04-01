"use client";

import { useEffect, useMemo, useState } from "react";
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
          <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
            <select
              id="existing-tag-select"
              value={selectedExisting}
              onChange={(e) => setSelectedExisting(e.target.value)}
              disabled={isSaving}
              className="input-base"
              style={{ minWidth: "240px", width: "auto" }}
            >
              <option value="">Select one...</option>
              {sortedTags.map((tag) => {
                const value = `${tag.type}|||${tag.name}`;
                return (
                  <option key={value} value={value}>
                    {formatTag(tag)}
                  </option>
                );
              })}
            </select>
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
