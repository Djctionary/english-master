"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AnalysisResult,
  ReviewQueueItem,
  ReviewQueueResult,
  ReviewResult,
  SentenceReviewState,
} from "@/lib/types";

const CARD_LIMIT = 10;
const MAX_REPLAYS = 3;

const RESULT_CONFIG: Record<ReviewResult, { label: string; color: string; bg: string }> = {
  full: { label: "Fully understood", color: "#16a34a", bg: "#f0fdf4" },
  partial: { label: "Mostly understood", color: "#ca8a04", bg: "#fefce8" },
  missed: { label: "Missed it", color: "#dc2626", bg: "#fef2f2" },
};

function isValidAnalysis(a: unknown): a is AnalysisResult {
  if (!a || typeof a !== "object") return false;
  const obj = a as Record<string, unknown>;
  return typeof obj.paraphrase === "string" && Array.isArray(obj.vocabulary);
}

export default function ReviewPage() {
  const audioRef = useRef<HTMLAudioElement>(null);
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

  // Auto-play audio when current card changes
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
    const t0 = performance.now();
    console.log(`[review] handleResult("${result}") start`);
    setSubmitting(true);
    setError(null);
    try {
      const t1 = performance.now();
      const response = await fetch(`/api/review/${currentItem.sentence.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result }),
      });
      const t2 = performance.now();
      console.log(`[review] API POST took ${(t2 - t1).toFixed(0)}ms (status ${response.status})`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save review.");
      }
      const state = (await response.json()) as SentenceReviewState;
      const t3 = performance.now();
      console.log(`[review] JSON parse took ${(t3 - t2).toFixed(0)}ms`);
      setSelectedResult(result);
      setUpdatedState(state);
      setRevealed(true);
      setReviewedCount((c) => c + 1);
      const t4 = performance.now();
      console.log(`[review] setState calls took ${(t4 - t3).toFixed(0)}ms`);
      console.log(`[review] total handleResult: ${(t4 - t0).toFixed(0)}ms`);
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
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #f8f6f3 0%, #f4f5f7 50%, #f1f3f6 100%)",
      padding: "32px 16px 64px",
    }}>
      <div style={{ maxWidth: "720px", margin: "0 auto", display: "grid", gap: "20px" }}>

        {/* Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a7b5b", fontWeight: 700 }}>
              Review
            </span>
            <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", lineHeight: 1.1, color: "#1a2530", margin: "4px 0 0" }}>
              Listen & recall.
            </h1>
          </div>
          <nav style={{ display: "flex", gap: "8px" }}>
            <Link href="/learn" className="ui-button">Learn</Link>
            <Link href="/review" className="ui-button is-active">Review</Link>
          </nav>
        </header>

        {/* Stats bar */}
        {queue && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1px",
            backgroundColor: "#e2e6ea",
            borderRadius: "14px",
            overflow: "hidden",
          }}>
            <StatCell label="Total" value={queue.totalSentences} />
            <StatCell label="Due" value={queue.dueCount} highlight />
            <StatCell label="Reviewed" value={reviewedCount} />
            <StatCell label="Mastered" value={queue.masteredCount} />
          </div>
        )}

        {/* Progress bar */}
        {queue && queue.items.length > 0 && !sessionComplete && (
          <div style={{ display: "grid", gap: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#7a8a96" }}>
              <span>Card {Math.min(currentIndex + 1, queue.items.length)} / {queue.items.length}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div style={{
              width: "100%", height: "6px", borderRadius: "99px",
              backgroundColor: "#e5e7eb", overflow: "hidden",
            }}>
              <div style={{
                width: `${progressPercent}%`, height: "100%", borderRadius: "99px",
                background: "linear-gradient(90deg, #c06030, #d4944a)",
                transition: "width 0.3s ease",
              }} />
            </div>
          </div>
        )}

        {/* Main card area */}
        <section style={{
          backgroundColor: "#fff",
          border: "1px solid #e5e8ec",
          borderRadius: "20px",
          padding: "24px",
          boxShadow: "0 4px 24px rgba(20, 40, 60, 0.06)",
          minHeight: "360px",
          display: "grid",
          alignContent: "start",
          gap: "20px",
        }}>

          {/* Loading */}
          {loading && (
            <p style={{ color: "#7a8a96", fontSize: "15px" }}>Loading review queue...</p>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ display: "grid", gap: "12px" }}>
              <p style={{ color: "#dc2626", fontWeight: 600 }}>{error}</p>
              <button type="button" onClick={() => void loadQueue()} className="ui-button">Reload</button>
            </div>
          )}

          {/* Session complete */}
          {sessionComplete && (
            <div style={{ display: "grid", gap: "16px", textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: "48px" }}>&#127942;</div>
              <h2 style={{ fontSize: "24px", color: "#1a2530", fontWeight: 700 }}>
                {queue.dueCount > 0 ? "Session complete!" : "All caught up!"}
              </h2>
              <p style={{ color: "#5a6a78", maxWidth: "40ch", margin: "0 auto", lineHeight: 1.6 }}>
                {reviewedCount > 0
                  ? `You reviewed ${reviewedCount} sentence${reviewedCount === 1 ? "" : "s"} this session. Consistency is how fluency is built.`
                  : "No sentences are due right now. Come back later when your next review is scheduled."}
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "8px" }}>
                <button type="button" onClick={() => void loadQueue()} className="ui-button">
                  Refresh queue
                </button>
                <Link href="/learn" className="ui-button">Go learn</Link>
              </div>
            </div>
          )}

          {/* Active card */}
          {!loading && !error && currentItem && (
            <>
              {/* Audio element */}
              <audio
                ref={audioRef}
                src={currentItem.sentence.audioFilename
                  ? `/api/audio/${currentItem.sentence.audioFilename}`
                  : undefined}
                onError={() => setAudioError("Audio unavailable.")}
              />

              {/* Blind listen / Revealed */}
              <div style={{
                borderRadius: "14px",
                padding: "20px",
                background: revealed ? "#fafaf8" : "#fafbfc",
                border: "1px solid #eef0f3",
                display: "grid",
                gap: "16px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
                    color: revealed ? "#9a7b5b" : "#7a8a96", fontWeight: 700,
                  }}>
                    {revealed ? "Revealed" : "Blind listen"}
                  </span>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={handleReplay}
                      disabled={!revealed && replaysLeft <= 0}
                      className="ui-button"
                      style={{ fontSize: "13px", padding: "6px 14px", opacity: (!revealed && replaysLeft <= 0) ? 0.4 : 1 }}
                    >
                      {revealed ? "Replay" : `Replay (${replaysLeft})`}
                    </button>
                    {revealed && (
                      <button
                        type="button"
                        onClick={handleNext}
                        style={{
                          fontSize: "13px",
                          padding: "6px 18px",
                          borderRadius: "10px",
                          border: "none",
                          backgroundColor: "#1a2530",
                          color: "#fff",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Next &rarr;
                      </button>
                    )}
                  </div>
                </div>

                {audioError && (
                  <p style={{ color: "#dc2626", fontSize: "13px", margin: 0 }}>{audioError}</p>
                )}

                {/* Sentence (shown after reveal) */}
                {revealed && (
                  <p style={{
                    fontSize: "20px", lineHeight: 1.5, fontWeight: 600,
                    color: "#1a2530", margin: 0,
                  }}>
                    {currentItem.sentence.correctedSentence}
                  </p>
                )}

                {/* Result buttons (before reveal) */}
                {!revealed && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "10px",
                  }}>
                    {(["full", "partial", "missed"] as ReviewResult[]).map((r) => {
                      const cfg = RESULT_CONFIG[r];
                      return (
                        <button
                          key={r}
                          type="button"
                          disabled={submitting}
                          onClick={() => handleResult(r)}
                          style={{
                            borderRadius: "12px",
                            padding: "14px 12px",
                            border: "1px solid #e5e8ec",
                            backgroundColor: "#fff",
                            cursor: submitting ? "not-allowed" : "pointer",
                            opacity: submitting ? 0.5 : 1,
                            display: "grid",
                            gap: "6px",
                            textAlign: "center",
                            transition: "background-color 0.15s",
                          }}
                        >
                          <span style={{
                            width: "10px", height: "10px", borderRadius: "99px",
                            backgroundColor: cfg.color, margin: "0 auto",
                          }} />
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "#2a3a48" }}>
                            {cfg.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* After reveal: result + breakdown */}
              {revealed && (
                <>
                  {/* Result feedback */}
                  {selectedResult && updatedState && (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "1px",
                      backgroundColor: "#e5e8ec",
                      borderRadius: "12px",
                      overflow: "hidden",
                    }}>
                      <MiniStat label="Result" value={RESULT_CONFIG[selectedResult].label} color={RESULT_CONFIG[selectedResult].color} />
                      <MiniStat label="New stage" value={`${updatedState.stage}`} />
                      <MiniStat label="Next review" value={formatInterval(updatedState.nextReviewAt)} />
                    </div>
                  )}

                  {/* Compact breakdown: paraphrase + vocabulary + skeleton */}
                  {analysis && (
                    <div style={{ display: "grid", gap: "14px" }}>
                      {/* Paraphrase */}
                      {analysis.paraphrase && (
                        <div style={{
                          padding: "12px 14px", borderRadius: "10px",
                          backgroundColor: "#f8f9fa", border: "1px solid #eef0f3",
                        }}>
                          <span style={labelStyle}>Meaning</span>
                          <p style={{ margin: "4px 0 0", fontSize: "14px", lineHeight: 1.6, color: "#2a3a48" }}>
                            {analysis.paraphrase}
                          </p>
                        </div>
                      )}

                      {/* Vocabulary */}
                      {analysis.vocabulary.length > 0 && (
                        <div style={{
                          padding: "12px 14px", borderRadius: "10px",
                          backgroundColor: "#f8f9fa", border: "1px solid #eef0f3",
                        }}>
                          <span style={labelStyle}>Key vocabulary</span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                            {analysis.vocabulary.map((v, i) => (
                              <span key={i} style={{
                                display: "inline-flex", alignItems: "baseline", gap: "4px",
                                padding: "4px 10px", borderRadius: "8px",
                                backgroundColor: "#fff", border: "1px solid #e5e8ec",
                                fontSize: "13px",
                              }}>
                                <strong style={{ color: "#1a2530" }}>{v.word}</strong>
                                {v.phonetic && <span style={{ color: "#9aa5ae", fontSize: "11px" }}>{v.phonetic}</span>}
                                <span style={{ color: "#5a6a78" }}>— {v.definition}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sentence skeleton */}
                      {analysis.sentenceSkeleton && (
                        <div style={{
                          padding: "12px 14px", borderRadius: "10px",
                          backgroundColor: "#f8f9fa", border: "1px solid #eef0f3",
                        }}>
                          <span style={labelStyle}>Structure</span>
                          <div style={{ marginTop: "6px" }}>
                            <div style={{ display: "flex", gap: "6px", alignItems: "baseline", marginBottom: "4px" }}>
                              <span style={{ fontSize: "10px", fontWeight: 700, color: "#9a7b5b", textTransform: "uppercase", minWidth: "32px" }}>Core</span>
                              <span style={{ fontSize: "14px", fontWeight: 600, color: "#1a2530" }}>{analysis.sentenceSkeleton.core}</span>
                            </div>
                            {analysis.sentenceSkeleton.layers.map((layer, i) => (
                              <div key={i} style={{ display: "flex", gap: "6px", alignItems: "baseline", paddingLeft: "12px", marginBottom: "2px" }}>
                                <span style={{ fontSize: "10px", fontWeight: 600, color: "#7c5ec0", minWidth: "44px" }}>+ {layer.label}</span>
                                <span style={{ fontSize: "13px", color: "#2a3a48" }}>
                                  <strong>{layer.added}</strong>
                                  <span style={{ color: "#7a8a96", marginLeft: "4px" }}>({layer.explanation})</span>
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
    <div style={{
      padding: "12px 14px",
      backgroundColor: "#fff",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "12px", color: "#7a8a96", marginBottom: "2px" }}>{label}</div>
      <div style={{
        fontSize: "22px", fontWeight: 700,
        color: highlight ? "#c06030" : "#1a2530",
      }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: "10px 12px", backgroundColor: "#fff", textAlign: "center" }}>
      <div style={{ fontSize: "11px", color: "#7a8a96", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "14px", fontWeight: 600, color: color ?? "#1a2530" }}>{value}</div>
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

const labelStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#9a7b5b",
};
