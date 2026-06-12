"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import UserNav from "@/components/UserNav";
import ProgressChart from "@/components/ProgressChart";
import type { ProgressData } from "@/lib/types";

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/progress");
        if (!res.ok) throw new Error("Failed to load progress");
        const json = (await res.json()) as ProgressData;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("Could not load your progress. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasSentences = data != null && data.totalSentences > 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg)",
        padding: "var(--space-2xl) var(--space-lg) var(--space-3xl)",
      }}
    >
      <div style={{ maxWidth: "1120px", margin: "0 auto", display: "grid", gap: "var(--space-xl)" }}>
        {/* Header */}
        <header className="page-header">
          <div className="page-header-title">
            <h1>Track your progress.</h1>
          </div>
          <nav className="page-header-nav">
            <UserNav />
            <div className="page-header-divider" />
            <Link href="/learn" className="ui-button">
              Learn
            </Link>
            <Link href="/review" className="ui-button">
              Review
            </Link>
            <Link href="/progress" className="ui-button is-active">
              Progress
            </Link>
            <div className="page-header-divider" />
            <ThemeToggle />
          </nav>
        </header>

        {/* Stat strip */}
        {data && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "1px",
              backgroundColor: "var(--color-border)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}
          >
            <StatCell label="Total learned" value={data.totalSentences} />
            <StatCell label="Today" value={data.addedToday} />
            <StatCell label="Due now" value={data.overdueCount} highlight />
            <StatCell label="Mastered" value={data.masteredCount} />
          </div>
        )}

        {/* Chart card */}
        <section
          className="card"
          style={{
            padding: "var(--space-xl)",
            display: "grid",
            gap: "var(--space-md)",
          }}
        >
          <div style={{ display: "grid", gap: "var(--space-xs)" }}>
            <h2
              style={{
                fontSize: "var(--text-heading)",
                fontWeight: "var(--weight-semibold)",
                color: "var(--color-text)",
                margin: 0,
              }}
            >
              Recent learning activity
            </h2>
            <p
              style={{
                fontSize: "var(--text-small)",
                color: "var(--color-text-muted)",
                margin: 0,
              }}
            >
              Last 30 days of study plus a 14-day review forecast. Overdue
              sentences are grouped under today.
            </p>
          </div>

          {loading && <CenteredNote>Loading your progress…</CenteredNote>}
          {!loading && error && <CenteredNote tone="error">{error}</CenteredNote>}
          {!loading && !error && !hasSentences && (
            <CenteredNote>
              No sentences yet. Head to{" "}
              <Link href="/learn" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                Learn
              </Link>{" "}
              to add your first one.
            </CenteredNote>
          )}
          {!loading && !error && hasSentences && data && <ProgressChart data={data} />}
        </section>
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-surface)",
        padding: "var(--space-lg)",
        display: "grid",
        gap: "var(--space-xs)",
        textAlign: "center",
      }}
    >
      <span
        style={{
          fontSize: "var(--text-display)",
          fontWeight: "var(--weight-bold)",
          color: highlight ? "var(--color-error)" : "var(--color-text)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: "var(--text-caption)",
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function CenteredNote({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "error";
}) {
  return (
    <div
      style={{
        minHeight: "240px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontSize: "var(--text-body)",
        color: tone === "error" ? "var(--color-error)" : "var(--color-text-muted)",
      }}
    >
      <span>{children}</span>
    </div>
  );
}
