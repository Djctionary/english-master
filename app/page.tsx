"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import ThemeToggle from "@/components/ThemeToggle";

export default function LandingPage() {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [spotsRemaining, setSpotsRemaining] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          router.replace("/learn");
        } else {
          setSpotsRemaining(data.spotsRemaining ?? null);
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <main style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--color-text-muted)" }}>Loading...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg)",
        color: "var(--color-text)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "var(--space-lg) var(--space-xl)",
          maxWidth: "1120px",
          margin: "0 auto",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "var(--text-body)", color: "var(--color-text)" }}>
          English Master
        </span>
        <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
          <ThemeToggle />
          <button type="button" className="btn-primary" onClick={() => setAuthOpen(true)}>
            Sign in
          </button>
        </div>
      </div>

      {/* Hero */}
      <section
        style={{
          textAlign: "center",
          padding: "var(--space-3xl) var(--space-xl) var(--space-2xl)",
          maxWidth: "720px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "inline-block",
            fontSize: "var(--text-caption)",
            fontWeight: 600,
            color: "var(--color-primary)",
            backgroundColor: "var(--color-primary-light)",
            padding: "var(--space-xs) var(--space-md)",
            borderRadius: "var(--radius-full)",
            marginBottom: "var(--space-lg)",
          }}
        >
          V1.0 Alpha &middot; {spotsRemaining !== null ? `${spotsRemaining} spots remaining` : "Internal Test"}
        </div>

        <h1
          style={{
            fontSize: "clamp(2rem, 6vw, 3.5rem)",
            fontWeight: 700,
            lineHeight: 1.15,
            color: "var(--color-text)",
            marginBottom: "var(--space-lg)",
          }}
        >
          Sentence is all you need.
        </h1>

        <p
          style={{
            fontSize: "var(--text-heading)",
            color: "var(--color-text-secondary)",
            lineHeight: "var(--leading-normal)",
            maxWidth: "540px",
            margin: "0 auto var(--space-xl)",
          }}
        >
          For English learners who already have the basics — and are hungry for more vocabulary, pronunciation, and natural expression.
        </p>

        <button
          type="button"
          className="btn-primary"
          onClick={() => setAuthOpen(true)}
          style={{
            fontSize: "var(--text-body)",
            padding: "var(--space-md) var(--space-2xl)",
            minHeight: "48px",
          }}
        >
          Start Learning
        </button>
      </section>

      {/* Why Sentences */}
      <section
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "var(--space-2xl) var(--space-xl)",
        }}
      >
        <h2
          style={{
            fontSize: "var(--text-heading)",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "var(--space-xl)",
          }}
        >
          Why sentences?
        </h2>

        <div
          style={{
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border)",
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "var(--text-small)",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "var(--color-surface-alt)" }}>
                <th style={thStyle}></th>
                <th style={{ ...thStyle, color: "var(--color-text-muted)" }}>Traditional Apps</th>
                <th style={{ ...thStyle, color: "var(--color-primary)" }}>English Master</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--color-border)" }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{row.label}</td>
                  <td style={{ ...tdStyle, color: "var(--color-text-muted)" }}>{row.traditional}</td>
                  <td style={{ ...tdStyle, color: "var(--color-text)" }}>{row.master}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* How It Works */}
      <section
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "var(--space-2xl) var(--space-xl)",
        }}
      >
        <h2
          style={{
            fontSize: "var(--text-heading)",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "var(--space-xl)",
          }}
        >
          How it works
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "var(--space-lg)",
          }}
        >
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="card"
              style={{
                padding: "var(--space-xl) var(--space-lg)",
                display: "grid",
                gap: "var(--space-sm)",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: "var(--color-primary-light)",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "var(--text-small)",
                }}
              >
                {i + 1}
              </div>
              <h3 style={{ fontSize: "var(--text-body)", fontWeight: 700 }}>
                {step.title}
              </h3>
              <p
                style={{
                  fontSize: "var(--text-small)",
                  color: "var(--color-text-secondary)",
                  lineHeight: "var(--leading-normal)",
                  margin: 0,
                }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Alpha footer */}
      <section
        style={{
          textAlign: "center",
          padding: "var(--space-3xl) var(--space-xl)",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <div
          className="card"
          style={{
            padding: "var(--space-xl)",
            display: "grid",
            gap: "var(--space-md)",
          }}
        >
          <h3 style={{ fontSize: "var(--text-body)", fontWeight: 700 }}>
            V1.0 Alpha &middot; Internal Test
          </h3>
          <p
            style={{
              fontSize: "var(--text-small)",
              color: "var(--color-text-secondary)",
              lineHeight: "var(--leading-normal)",
              margin: 0,
            }}
          >
            First 100 users enjoy lifetime membership when v1.0 officially launches.
            Your sentences, your progress — always yours.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setAuthOpen(true)}
            style={{ justifySelf: "center" }}
          >
            Claim your spot
          </button>
        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => router.push("/learn")}
      />
    </main>
  );
}

/* ── Data ── */

const COMPARISON_ROWS = [
  {
    label: "Learning unit",
    traditional: "Single word / flashcard",
    master: "Full sentence with real context",
  },
  {
    label: "Context",
    traditional: "Dictionary definition",
    master: "You know where you found it — a movie, a game, a conversation",
  },
  {
    label: "Input",
    traditional: "Passive — read & memorize",
    master: "Active — type what you want to say, AI corrects you",
  },
  {
    label: "Review",
    traditional: "Abstract repetition",
    master: "Reliving the moment you captured the sentence",
  },
  {
    label: "Retention",
    traditional: "Forget after exam",
    master: "Sticks forever — your sentence, your memory",
  },
];

const STEPS = [
  {
    title: "Capture",
    description: "See something interesting in a game, movie, or conversation. Type it — even with mistakes. Takes 10 seconds.",
  },
  {
    title: "Correct & Analyze",
    description: "AI corrects your sentence and breaks it down: grammar, vocabulary, pronunciation, structure.",
  },
  {
    title: "Tag & Collect",
    description: "Tag by source — movie, game, work, daily life. Build your personal sentence library.",
  },
  {
    title: "Review & Remember",
    description: "Spaced repetition brings it back. Hear the audio, recall the moment. The sentence becomes part of you.",
  },
];

const thStyle: React.CSSProperties = {
  padding: "var(--space-md) var(--space-lg)",
  textAlign: "left",
  fontSize: "var(--text-caption)",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: React.CSSProperties = {
  padding: "var(--space-md) var(--space-lg)",
  verticalAlign: "top",
  lineHeight: "var(--leading-normal)",
};
