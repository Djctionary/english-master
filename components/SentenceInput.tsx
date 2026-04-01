"use client";

import { useState, FormEvent } from "react";

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
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (validationError) setValidationError(null);
          }}
          placeholder="Enter an English sentence..."
          disabled={isLoading}
          rows={3}
          aria-label="Sentence input"
          className="input-base"
          style={{ resize: "vertical" }}
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
