"use client";

import { useState } from "react";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: { id: number; username: string }) => void;
}

type Tab = "login" | "register";

export default function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<Tab>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: tab, username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      onSuccess(data.user);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
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
        {/* Tabs */}
        <div style={{ display: "flex", gap: "var(--space-xs)", borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-sm)" }}>
          {(["login", "register"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(null); }}
              style={{
                flex: 1,
                padding: "var(--space-sm) var(--space-md)",
                border: "none",
                borderBottom: tab === t ? "2px solid var(--color-primary)" : "2px solid transparent",
                backgroundColor: "transparent",
                color: tab === t ? "var(--color-primary)" : "var(--color-text-secondary)",
                fontSize: "var(--text-small)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "color var(--transition-fast), border-color var(--transition-fast)",
              }}
            >
              {t === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "var(--space-md)" }}>
          <div style={{ display: "grid", gap: "var(--space-xs)" }}>
            <label
              htmlFor="auth-username"
              style={{ fontSize: "var(--text-small)", fontWeight: 600, color: "var(--color-text-secondary)" }}
            >
              Username
            </label>
            <input
              id="auth-username"
              type="text"
              className="input-base"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div style={{ display: "grid", gap: "var(--space-xs)" }}>
            <label
              htmlFor="auth-password"
              style={{ fontSize: "var(--text-small)", fontWeight: 600, color: "var(--color-text-secondary)" }}
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              className="input-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === "register" ? "At least 4 characters" : "Enter password"}
              autoComplete={tab === "register" ? "new-password" : "current-password"}
            />
          </div>

          {error && (
            <p style={{ color: "var(--color-error)", fontSize: "var(--text-small)", margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: "100%", minHeight: "44px", fontSize: "var(--text-body)" }}
          >
            {loading ? "..." : tab === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
