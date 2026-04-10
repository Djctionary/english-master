"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import type {
  AnalysisResult,
  ReviewQueueItem,
  ReviewQueueResult,
  ReviewResult,
  SentenceReviewState,
} from "@/lib/types";

const CARD_LIMIT = 10;
const MAX_REPLAYS = 3;

const RESULT_CONFIG: Record<ReviewResult, { label: string; shortLabel: string; color: string; bg: string }> = {
  full: { label: "Fully understood", shortLabel: "Got it", color: "var(--color-success)", bg: "var(--color-success-light)" },
  partial: { label: "Mostly understood", shortLabel: "Partial", color: "var(--color-warning)", bg: "var(--color-warning-light)" },
  missed: { label: "Missed it", shortLabel: "Missed", color: "var(--color-error)", bg: "var(--color-error-light)" },
};

function isValidAnalysis(a: unknown): a is AnalysisResult {
  if (!a || typeof a !== "object") return false;
  const obj = a as Record<string, unknown>;
  return typeof obj.paraphrase === "string" && Array.isArray(obj.vocabulary);
}

function useIsMobile(breakpoint = 480) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

export default function ReviewPage() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const isMobile = useIsMobile();
  const [queue, setQueue] = useState<ReviewQueueResult | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ReviewResult | null>(null);
  const [updatedState, setUpdatedState] = useState<SentenceReviewState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [replayCount, setReplayCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);

  const currentItem: ReviewQueueItem | null = queue?.items[currentIndex] ?? null;
  const sessionComplete = queue !== null && !loading && !error && !currentItem;
  const replaysLeft = MAX_REPLAYS - replayCount;

  const progressPercent = useMemo(() => {
    if (!queue || queue.items.length === 0) return 0;
    return Math.min(100, (currentIndex / queue.items.length) * 100);
  }, [currentIndex, queue]);

  async function loadQueue() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/review?limit=${CARD_LIMIT}`);
      if (!response.ok) throw new Error("Failed to load review queue.");
      const data = (await response.json()) as ReviewQueueResult;
      setQueue(data);
      setCurrentIndex(0);
      setRevealed(false);
      setSelectedResult(null);
      setUpdatedState(null);
      setReplayCount(0);
      setReviewedCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load review queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentItem) return;

    audio.pause();
    audio.currentTime = 0;
    audio.load();
    setAudioError(null);
    setReplayCount(0);

    const playOnReady = () => {
      audio.play().catch(() => setAudioError("Audio unavailable."));
      audio.removeEventListener("canplaythrough", playOnReady);
    };
    audio.addEventListener("canplaythrough", playOnReady);

    return () => audio.removeEventListener("canplaythrough", playOnReady);
  }, [currentItem?.sentence.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleReplay() {
    if (!revealed && replayCount >= MAX_REPLAYS) return;
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    try {
      await audio.play();
      if (!revealed) setReplayCount((c) => c + 1);
      setAudioError(null);
    } catch {
      setAudioError("Audio unavailable.");
    }
  }

  async function handleResult(result: ReviewResult) {
    if (!currentItem || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/review/${currentItem.sentence.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save review.");
      }
      const state = (await response.json()) as SentenceReviewState;
      setSelectedResult(result);
      setUpdatedState(state);
      setRevealed(true);
      setReviewedCount((c) => c + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    setCurrentIndex((i) => i + 1);
    setRevealed(false);
    setSelectedResult(null);
    setUpdatedState(null);
    setAudioError(null);
  }

  const analysis: AnalysisResult | null =
    currentItem && isValidAnalysis(currentItem.sentence.analysis)
      ? currentItem.sentence.analysis
      : null;

  return (
    <main
      className="page-container"
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg)",
        padding: "var(--space-2xl) var(--space-lg) var(--space-3xl)",
      }}
    >
      <div style={{ maxWidth: "1120px", margin: "0 auto", display: "grid", gap: "var(--space-xl)" }}>

        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "var(--space-lg)",
            flexWrap: "wrap",
          }}
        >
          <div>
            <span className="section-label">Review</span>
            <h1
              style={{
                fontSize: "var(--text-display)",
                lineHeight: "var(--leading-tight)",
                color: "var(--color-text)",
                margin: "var(--space-xs) 0 0",
              }}
            >
              Listen & recall.
            </h1>
          </div>
          <nav style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
            <Link href="/learn" className="ui-button">
              Learn
            </Link>
            <Link href="/review" className="ui-button is-active">
              Review
            </Link>
            <ThemeToggle />
          </nav>
        </header>

        {/* Stats bar */}
        {queue && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
              gap: "1px",
              backgroundColor: "var(--color-border)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}
          >
            <StatCell label="Total" value={queue.totalSentences} />
            <StatCell label="Due" value={queue.dueCount} highlight />
            <StatCell label="Reviewed" value={reviewedCount} />
            <StatCell label="Mastered" value={queue.masteredCount} />
          </div>
        )}

        {/* Progress bar */}
        {queue && queue.items.length > 0 && !sessionComplete && (
          <div style={{ display: "grid", gap: "var(--space-xs)" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "var(--text-caption)",
                color: "var(--color-text-muted)",
              }}
            >
              <span>
                Card {Math.min(currentIndex + 1, queue.items.length)} / {queue.items.length}
              </span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div
              style={{
                width: "100%",
                height: "6px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--color-border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: "var(--color-primary)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* Main card area */}
        <section
          className="card"
          style={{
            padding: "var(--space-xl)",
            display: "grid",
            alignContent: "start",
            gap: "var(--space-xl)",
          }}
        >
          {/* Loading */}
          {loading && (
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)" }}>
              Loading review queue...
            </p>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ display: "grid", gap: "var(--space-md)" }}>
              <p style={{ color: "var(--color-error)", fontWeight: 600 }}>{error}</p>
              <button type="button" onClick={() => void loadQueue()} className="btn-primary">
                Reload
              </button>
            </div>
          )}

          {/* Session complete */}
          {sessionComplete && (
            <div
              style={{
                display: "grid",
                gap: "var(--space-lg)",
                textAlign: "center",
                padding: "var(--space-2xl) 0",
              }}
            >
              <div style={{ fontSize: "48px" }}>&#127942;</div>
              <h2
                style={{
                  fontSize: "var(--text-heading)",
                  color: "var(--color-text)",
                  fontWeight: 700,
                }}
              >
                {queue.dueCount > 0 ? "Session complete!" : "All caught up!"}
              </h2>
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  maxWidth: "40ch",
                  margin: "0 auto",
                  lineHeight: "var(--leading-normal)",
                }}
              >
                {reviewedCount > 0
                  ? `You reviewed ${reviewedCount} sentence${reviewedCount === 1 ? "" : "s"} this session. Consistency is how fluency is built.`
                  : "No sentences are due right now. Come back later when your next review is scheduled."}
              </p>
              <div style={{ display: "flex", gap: "var(--space-md)", justifyContent: "center", marginTop: "var(--space-sm)" }}>
                <button type="button" onClick={() => void loadQueue()} className="btn-primary">
                  Refresh queue
                </button>
                <Link href="/learn" className="ui-button">
                  Go learn
                </Link>
              </div>
            </div>
          )}

          {/* Active card */}
          {!loading && !error && currentItem && (
            <>
              {/* Audio element */}
              <audio
                ref={audioRef}
                src={
                  currentItem.sentence.audioFilename
                    ? `/api/audio/${currentItem.sentence.audioFilename}`
                    : undefined
                }
                onError={() => setAudioError("Audio unavailable.")}
              />

              {/* Blind listen / Revealed */}
              {!revealed && (
                <div
                  style={{
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-2xl) var(--space-xl)",
                    background: "var(--color-surface-alt)",
                    border: "1px solid var(--color-border)",
                    display: "grid",
                    gap: "var(--space-xl)",
                    textAlign: "center",
                  }}
                >
                  {/* Audio icon + replay */}
                  <div style={{ display: "grid", gap: "var(--space-md)", justifyItems: "center" }}>
                    <button
                      type="button"
                      onClick={handleReplay}
                      disabled={replaysLeft <= 0}
                      aria-label="Replay audio"
                      style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "var(--radius-full)",
                        border: "none",
                        backgroundColor: replaysLeft > 0 ? "var(--color-primary)" : "var(--color-border)",
                        color: "var(--color-surface)",
                        fontSize: "24px",
                        cursor: replaysLeft > 0 ? "pointer" : "not-allowed",
                        transition: "background-color var(--transition-fast), transform var(--transition-fast)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      &#9654;
                    </button>
                    <div style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                      {replaysLeft > 0
                        ? `${replaysLeft} replay${replaysLeft === 1 ? "" : "s"} remaining`
                        : "No replays left"}
                    </div>
                  </div>

                  {audioError && (
                    <p style={{ color: "var(--color-error)", fontSize: "var(--text-small)", margin: 0 }}>
                      {audioError}
                    </p>
                  )}

                  {/* How well did you understand? */}
                  <div style={{ display: "grid", gap: "var(--space-md)" }}>
                    <p style={{ fontSize: "var(--text-small)", color: "var(--color-text-secondary)", margin: 0 }}>
                      How well did you understand?
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-sm)" }}>
                      {(["full", "partial", "missed"] as ReviewResult[]).map((r) => {
                        const cfg = RESULT_CONFIG[r];
                        return (
                          <button
                            key={r}
                            type="button"
                            disabled={submitting}
                            onClick={() => handleResult(r)}
                            style={{
                              borderRadius: "var(--radius-sm)",
                              padding: "var(--space-md) var(--space-sm)",
                              border: "1px solid var(--color-border)",
                              backgroundColor: "var(--color-surface)",
                              cursor: submitting ? "not-allowed" : "pointer",
                              opacity: submitting ? 0.5 : 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "var(--space-sm)",
                              transition: "background-color var(--transition-fast)",
                            }}
                          >
                            <span
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "var(--radius-full)",
                                backgroundColor: cfg.color,
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontSize: "var(--text-small)",
                                fontWeight: 600,
                                color: "var(--color-text)",
                              }}
                            >
                              {isMobile ? cfg.shortLabel : cfg.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Revealed state */}
              {revealed && (
                <div
                  style={{
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-xl)",
                    background: "var(--color-surface-alt)",
                    border: "1px solid var(--color-border)",
                    display: "grid",
                    gap: "var(--space-lg)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "var(--space-md)",
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="section-label">Revealed</span>
                    <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
                      <button type="button" onClick={handleReplay} className="btn-secondary">
                        Replay
                      </button>
                      <button type="button" onClick={handleNext} className="btn-primary">
                        Next &rarr;
                      </button>
                    </div>
                  </div>

                  {audioError && (
                    <p style={{ color: "var(--color-error)", fontSize: "var(--text-small)", margin: 0 }}>
                      {audioError}
                    </p>
                  )}

                  <p
                    style={{
                      fontSize: "var(--text-heading)",
                      lineHeight: 1.5,
                      fontWeight: 600,
                      color: "var(--color-text)",
                      margin: 0,
                    }}
                  >
                    {currentItem.sentence.correctedSentence}
                  </p>
                </div>
              )}

              {/* After reveal: result + breakdown */}
              {revealed && (
                <>
                  {/* Result feedback */}
                  {selectedResult && updatedState && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "1px",
                        backgroundColor: "var(--color-border)",
                        borderRadius: "var(--radius-md)",
                        overflow: "hidden",
                      }}
                    >
                      <MiniStat
                        label="Result"
                        value={isMobile ? RESULT_CONFIG[selectedResult].shortLabel : RESULT_CONFIG[selectedResult].label}
                        color={RESULT_CONFIG[selectedResult].color}
                      />
                      <MiniStat label="Stage" value={`${updatedState.stage}`} />
                      <MiniStat label="Next" value={formatInterval(updatedState.nextReviewAt)} />
                    </div>
                  )}

                  {/* Compact breakdown */}
                  {analysis && (
                    <div style={{ display: "grid", gap: "var(--space-md)" }}>
                      {/* Paraphrase */}
                      {analysis.paraphrase && (
                        <div
                          style={{
                            padding: "var(--space-md) var(--space-lg)",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "var(--color-surface-alt)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          <span className="section-label">Meaning</span>
                          <p
                            style={{
                              margin: "var(--space-xs) 0 0",
                              fontSize: "var(--text-small)",
                              lineHeight: "var(--leading-normal)",
                              color: "var(--color-text)",
                            }}
                          >
                            {analysis.paraphrase}
                          </p>
                        </div>
                      )}

                      {/* Vocabulary */}
                      {analysis.vocabulary.length > 0 && (
                        <div
                          style={{
                            padding: "var(--space-md) var(--space-lg)",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "var(--color-surface-alt)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          <span className="section-label">Key vocabulary</span>
                          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", marginTop: "var(--space-sm)" }}>
                            {analysis.vocabulary.map((v, i) => (
                              <div
                                key={i}
                                style={{
                                  padding: "var(--space-sm) var(--space-md)",
                                  borderRadius: "var(--radius-sm)",
                                  backgroundColor: "var(--color-surface)",
                                  border: "1px solid var(--color-border)",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-sm)", flexWrap: "wrap" }}>
                                  <strong style={{ color: "var(--color-text)", fontSize: "var(--text-small)" }}>{v.word}</strong>
                                  {v.phonetic && (
                                    <span style={{
                                      color: "var(--color-text-muted)",
                                      fontSize: "var(--text-caption)",
                                      whiteSpace: "nowrap",
                                    }}>
                                      {v.phonetic}
                                    </span>
                                  )}
                                </div>
                                <div style={{
                                  color: "var(--color-text-secondary)",
                                  fontSize: "var(--text-small)",
                                  marginTop: "2px",
                                  lineHeight: "var(--leading-normal)",
                                }}>
                                  {v.definition}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sentence skeleton */}
                      {analysis.sentenceSkeleton && (
                        <div
                          style={{
                            padding: "var(--space-md) var(--space-lg)",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "var(--color-surface-alt)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          <span className="section-label">Structure</span>
                          <div style={{ marginTop: "var(--space-sm)" }}>
                            <div
                              style={{
                                display: "flex",
                                gap: "var(--space-sm)",
                                alignItems: "baseline",
                                marginBottom: "var(--space-xs)",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "var(--text-tiny)",
                                  fontWeight: 700,
                                  color: "var(--color-primary)",
                                  textTransform: "uppercase",
                                  minWidth: "32px",
                                }}
                              >
                                Core
                              </span>
                              <span
                                style={{
                                  fontSize: "var(--text-small)",
                                  fontWeight: 600,
                                  color: "var(--color-text)",
                                }}
                              >
                                {analysis.sentenceSkeleton.core}
                              </span>
                            </div>
                            {analysis.sentenceSkeleton.layers.map((layer, i) => (
                              <div
                                key={i}
                                style={{
                                  display: "flex",
                                  gap: "var(--space-sm)",
                                  alignItems: "baseline",
                                  paddingLeft: "var(--space-md)",
                                  marginBottom: "2px",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "var(--text-tiny)",
                                    fontWeight: 600,
                                    color: "var(--color-accent-violet)",
                                    minWidth: "44px",
                                  }}
                                >
                                  + {layer.label}
                                </span>
                                <span style={{ fontSize: "var(--text-small)", color: "var(--color-text)" }}>
                                  <strong>{layer.added}</strong>
                                  <span style={{ color: "var(--color-text-muted)", marginLeft: "var(--space-xs)" }}>
                                    ({layer.explanation})
                                  </span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

/* ---- Helper components ---- */

function StatCell({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      style={{
        padding: "var(--space-md) var(--space-lg)",
        backgroundColor: "var(--color-surface)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginBottom: "2px" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: highlight ? "var(--color-primary)" : "var(--color-text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: "var(--space-md)", backgroundColor: "var(--color-surface)", textAlign: "center" }}>
      <div style={{ fontSize: "var(--text-tiny)", color: "var(--color-text-muted)", marginBottom: "2px" }}>
        {label}
      </div>
      <div style={{ fontSize: "var(--text-small)", fontWeight: 600, color: color ?? "var(--color-text)" }}>
        {value}
      </div>
    </div>
  );
}

function formatInterval(nextReviewAt: string): string {
  const ms = new Date(nextReviewAt).getTime() - Date.now();
  if (ms < 0) return "Now";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
