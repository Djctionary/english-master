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
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="ui-button"
          style={{
            alignSelf: "flex-start",
            fontSize: "15px",
          }}
        >
          {isLoading ? "Analyzing..." : "Analyze"}
        </button>

        {validationError && (
          <p role="alert" style={{ color: "#EF4444", margin: 0 }}>
            {validationError}
          </p>
        )}

        {error && (
          <p role="alert" style={{ color: "#EF4444", margin: 0 }}>
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
