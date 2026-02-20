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
    () =>
      [...existingTags].sort((a, b) =>
        formatTag(a).localeCompare(formatTag(b))
      ),
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
      <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#1F2937" }}>
        Context Tag
      </h3>
      <p style={{ margin: "0 0 12px 0", color: "#6B7280", fontSize: "13px" }}>
        Add where you saw this sentence so review is easier to remember.
      </p>

      <div style={{ marginBottom: "10px", fontSize: "14px", color: "#374151" }}>
        <strong>Current:</strong>{" "}
        {currentTag ? formatTag(currentTag) : "No tag yet"}
      </div>

      {sortedTags.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <label
            htmlFor="existing-tag-select"
            style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#374151" }}
          >
            Choose from existing tags
          </label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <select
              id="existing-tag-select"
              value={selectedExisting}
              onChange={(e) => setSelectedExisting(e.target.value)}
              disabled={isSaving}
              style={{
                minWidth: "240px",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                backgroundColor: "#FFFFFF",
              }}
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
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                backgroundColor: "#FFFFFF",
                cursor: isSaving || !selectedExisting ? "not-allowed" : "pointer",
              }}
            >
              Use Selected
            </button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "10px" }}>
        <label
          htmlFor="tag-type-input"
          style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#374151" }}
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
          style={{
            width: "100%",
            maxWidth: "320px",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #D1D5DB",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label
          htmlFor="tag-name-input"
          style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#374151" }}
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
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #D1D5DB",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={saveCustomTag}
          disabled={isSaving}
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#2563EB",
            color: "#FFFFFF",
            cursor: isSaving ? "not-allowed" : "pointer",
          }}
        >
          {isSaving ? "Saving..." : "Save Tag"}
        </button>
        {currentTag && (
          <button
            type="button"
            onClick={clearTag}
            disabled={isSaving}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #D1D5DB",
              backgroundColor: "#FFFFFF",
              cursor: isSaving ? "not-allowed" : "pointer",
            }}
          >
            Remove Tag
          </button>
        )}
      </div>

      {(localError || error) && (
        <p role="alert" style={{ margin: "10px 0 0 0", color: "#DC2626" }}>
          {localError ?? error}
        </p>
      )}
    </div>
  );
}
