"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function UserNav() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUsername(data.user.username);
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      router.push("/");
    } catch {
      setLoggingOut(false);
    }
  }

  if (!username) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
      <span
        style={{
          fontSize: "var(--text-small)",
          color: "var(--color-text-secondary)",
          fontWeight: 500,
        }}
      >
        Hi, {username}
      </span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4px 10px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--color-border)",
          backgroundColor: "transparent",
          color: "var(--color-text-muted)",
          fontSize: "var(--text-caption)",
          fontWeight: 500,
          cursor: loggingOut ? "not-allowed" : "pointer",
          opacity: loggingOut ? 0.5 : 1,
          transition: "color var(--transition-fast), border-color var(--transition-fast)",
        }}
      >
        Logout
      </button>
    </div>
  );
}
