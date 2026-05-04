"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const VOICES = [
  { id: "DXFkLCBUTmvXpp2QwZjA", label: "Female · American" },
  { id: "ljX1ZrXuDIIRVcmiVSyR", label: "Male · American" },
];

const DEFAULT_VOICE_ID = "DXFkLCBUTmvXpp2QwZjA";

export default function UserNav() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState<string>(DEFAULT_VOICE_ID);
  const [loggingOut, setLoggingOut] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUsername(data.user.username);
          setVoiceId(data.user.tts_voice_id ?? DEFAULT_VOICE_ID);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsOpen]);

  async function handleVoiceChange(newVoiceId: string) {
    if (newVoiceId === voiceId || savingVoice) return;
    setSavingVoice(true);
    try {
      await fetch("/api/auth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: newVoiceId }),
      });
      setVoiceId(newVoiceId);
    } finally {
      setSavingVoice(false);
    }
  }

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
    <div ref={panelRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
      <div
        className="user-avatar"
        title={username}
        onClick={() => setSettingsOpen((v) => !v)}
        style={{ cursor: "pointer" }}
      >
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

      {settingsOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 220,
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-md)",
            padding: "var(--space-md)",
            zIndex: 100,
          }}
        >
          <div
            style={{
              fontSize: "var(--text-caption)",
              fontWeight: 600,
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "var(--space-sm)",
            }}
          >
            TTS Voice
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            {VOICES.map((v) => {
              const active = voiceId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={savingVoice}
                  onClick={() => handleVoiceChange(v.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-sm)",
                    padding: "6px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${active ? "var(--color-primary)" : "var(--color-border)"}`,
                    backgroundColor: active ? "var(--color-primary-light, color-mix(in srgb, var(--color-primary) 10%, transparent))" : "transparent",
                    color: active ? "var(--color-primary)" : "var(--color-text)",
                    fontSize: "var(--text-small)",
                    fontWeight: active ? 600 : 400,
                    cursor: savingVoice ? "not-allowed" : "pointer",
                    opacity: savingVoice && !active ? 0.5 : 1,
                    transition: "all var(--transition-fast)",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <span style={{ fontSize: 14, lineHeight: 1 }}>{active ? "●" : "○"}</span>
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
