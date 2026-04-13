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

  const initial = username.charAt(0).toUpperCase();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
      <div className="user-avatar" title={username}>
        {initial}
      </div>
      <span
        className="user-nav-name"
        style={{
          fontSize: "var(--text-small)",
          color: "var(--color-text)",
          fontWeight: 600,
          maxWidth: "100px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {username}
      </span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2px 8px",
          borderRadius: "var(--radius-sm)",
          border: "none",
          backgroundColor: "transparent",
          color: "var(--color-text-muted)",
          fontSize: "var(--text-caption)",
          fontWeight: 500,
          cursor: loggingOut ? "not-allowed" : "pointer",
          opacity: loggingOut ? 0.5 : 1,
          transition: "color var(--transition-fast)",
        }}
      >
        Logout
      </button>
    </div>
  );
}
