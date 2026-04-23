"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import ThemeToggle from "@/components/ThemeToggle";

/* ── Multilingual translations of "Sentence is all you need" ── */
const TRANSLATIONS = [
  "一句话就够了",
  "Una oración es todo lo que necesitas",
  "一文があればそれでいい",
  "문장이 전부입니다",
  "Une phrase est tout ce qu'il vous faut",
  "Ein Satz ist alles was du brauchst",
  "एक वाक्य ही काफी है",
  "Uma frase é tudo o que você precisa",
  "Одно предложение — это всё что тебе нужно",
  "ประโยคเดียวคือทั้งหมดที่คุณต้องการ",
  "Một câu là tất cả những gì bạn cần",
  "Una frase è tutto ciò di cui hai bisogno",
  "Bir cümle tek ihtiyacın olan şey",
  "一句話就夠了",
  "Satu kalimat adalah semua yang kamu butuhkan",
  "En mening är allt du behöver",
  "Jedno zdanie to wszystko czego potrzebujesz",
  "Een zin is alles wat je nodig hebt",
  "Sentence is all you need",
  "جملة واحدة هي كل ما تحتاجه",
];

function buildScrollRow(startIndex: number, count: number): string[] {
  const items: string[] = [];
  for (let i = 0; i < count; i++) {
    items.push(TRANSLATIONS[(startIndex + i) % TRANSLATIONS.length]);
  }
  // Duplicate for seamless loop
  return [...items, ...items];
}

const ROW_CONFIG = [
  { start: 0, count: 10, direction: "scroll-left" as const, duration: "80s", size: "1.05rem", opacity: 0.22 },
  { start: 3, count: 8, direction: "scroll-right" as const, duration: "70s", size: "0.85rem", opacity: 0.14 },
  { start: 7, count: 10, direction: "scroll-left" as const, duration: "90s", size: "1.15rem", opacity: 0.18 },
  { start: 11, count: 9, direction: "scroll-right" as const, duration: "65s", size: "0.9rem", opacity: 0.12 },
  { start: 1, count: 10, direction: "scroll-left" as const, duration: "85s", size: "1rem", opacity: 0.20 },
  { start: 5, count: 8, direction: "scroll-right" as const, duration: "75s", size: "0.8rem", opacity: 0.10 },
  { start: 14, count: 10, direction: "scroll-left" as const, duration: "95s", size: "1.1rem", opacity: 0.16 },
  { start: 9, count: 9, direction: "scroll-right" as const, duration: "60s", size: "0.85rem", opacity: 0.14 },
  { start: 16, count: 10, direction: "scroll-left" as const, duration: "88s", size: "1rem", opacity: 0.18 },
  { start: 2, count: 8, direction: "scroll-right" as const, duration: "72s", size: "0.9rem", opacity: 0.12 },
];

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
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
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

      {/* Hero with multilingual background */}
      <div style={{ position: "relative", minHeight: "70vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {/* Scrolling multilingual background */}
        <div className="landing-scroll-container">
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", gap: "4px" }}>
            {ROW_CONFIG.map((row, i) => (
              <div
                key={i}
                className={`landing-scroll-row ${row.direction}`}
                style={{
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ["--scroll-duration" as any]: row.duration,
                  fontSize: row.size,
                  opacity: row.opacity,
                }}
              >
                {buildScrollRow(row.start, row.count).map((text, j) => (
                  <span key={j}>{text}</span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Hero content */}
        <section
          style={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            padding: "var(--space-3xl) var(--space-xl) var(--space-2xl)",
            maxWidth: "720px",
            margin: "0 auto",
            animation: "fadeInUp 0.6s ease-out",
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
              backdropFilter: "blur(8px)",
            }}
          >
            V1.2.1 Alpha &middot; {spotsRemaining !== null ? `${spotsRemaining} spots remaining` : "Internal Test"}
          </div>

          <h1
            style={{
              fontSize: "clamp(2.25rem, 7vw, 4rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              color: "var(--color-text)",
              marginBottom: "var(--space-lg)",
              letterSpacing: "-0.02em",
            }}
          >
            Sentence is all you need.
          </h1>

          <p
            style={{
              fontSize: "var(--text-heading)",
              color: "var(--color-text-secondary)",
              lineHeight: "var(--leading-normal)",
              maxWidth: "520px",
              margin: "0 auto var(--space-xl)",
            }}
          >
            For English learners who have the basics — and are ready for real vocabulary, natural expression, and lasting retention.
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
      </div>

      {/* How It Works */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "900px",
          margin: "0 auto",
          padding: "var(--space-xl) var(--space-xl) var(--space-2xl)",
          animation: "fadeInUp 0.6s ease-out 0.15s both",
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
                animation: `fadeInUp 0.5s ease-out ${0.2 + i * 0.08}s both`,
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "var(--radius-full)",
                  background: "linear-gradient(135deg, var(--color-primary), var(--color-accent-violet))",
                  color: "#fff",
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

      {/* CTA footer */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          padding: "var(--space-2xl) var(--space-xl) var(--space-3xl)",
          maxWidth: "600px",
          margin: "0 auto",
          animation: "fadeInUp 0.6s ease-out 0.4s both",
        }}
      >
        <div
          className="card"
          style={{
            padding: "var(--space-xl)",
            display: "grid",
            gap: "var(--space-md)",
            background: "linear-gradient(135deg, var(--color-primary-light), var(--color-surface))",
          }}
        >
          <h3 style={{ fontSize: "var(--text-body)", fontWeight: 700 }}>
            V1.2.1 Alpha &middot; Internal Test
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
