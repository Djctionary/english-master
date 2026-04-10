"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  // Focus trap — auto-focus cancel button
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (panel) {
      const cancelBtn = panel.querySelector<HTMLButtonElement>("[data-cancel]");
      cancelBtn?.focus();
    }
  }, [open]);

  if (!open) return null;

  const isDanger = variant === "danger";

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-overlay)",
        backdropFilter: "blur(4px)",
        padding: "var(--space-lg)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={panelRef}
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          padding: "var(--space-xl)",
          display: "grid",
          gap: "var(--space-lg)",
          animation: "dialogIn 0.15s ease-out",
        }}
      >
        {/* Icon + Title */}
        <div style={{ display: "grid", gap: "var(--space-sm)" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "var(--radius-md)",
              backgroundColor: isDanger ? "var(--color-error-light)" : "var(--color-primary-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
            }}
          >
            {isDanger ? "\u26A0" : "\u2753"}
          </div>
          <h3
            style={{
              fontSize: "var(--text-body)",
              fontWeight: 600,
              color: "var(--color-text)",
              margin: 0,
            }}
          >
            {title}
          </h3>
          <p
            style={{
              fontSize: "var(--text-small)",
              color: "var(--color-text-secondary)",
              lineHeight: "var(--leading-normal)",
              margin: 0,
            }}
          >
            {message}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "flex-end" }}>
          <button
            type="button"
            data-cancel
            onClick={onCancel}
            className="btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "36px",
              padding: "6px 16px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              backgroundColor: isDanger ? "var(--color-error)" : "var(--color-primary)",
              color: "var(--color-surface)",
              fontSize: "var(--text-small)",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background-color var(--transition-fast)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
