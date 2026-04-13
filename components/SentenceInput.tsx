"use client";

import { useState, useRef, useCallback, FormEvent } from "react";

interface SentenceInputProps {
  onSubmit: (sentence: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export default function SentenceInput({
  onSubmit,
  isLoading,
  error,
}: SentenceInputProps) {
  const [input, setInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!input.trim()) {
      setValidationError("Please enter a sentence before submitting.");
      return;
    }

    await onSubmit(input.trim());
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (validationError) setValidationError(null);
            autoResize();
          }}
          placeholder="Enter an English sentence..."
          disabled={isLoading}
          rows={2}
          aria-label="Sentence input"
          className="input-base"
          style={{ resize: "none", overflow: "hidden", minHeight: "64px" }}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary"
          style={{ alignSelf: "flex-start" }}
        >
          {isLoading ? "Analyzing..." : "Analyze"}
        </button>

        {validationError && (
          <p role="alert" style={{ color: "var(--color-error)", margin: 0, fontSize: "var(--text-small)" }}>
            {validationError}
          </p>
        )}

        {error && (
          <p role="alert" style={{ color: "var(--color-error)", margin: 0, fontSize: "var(--text-small)" }}>
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
