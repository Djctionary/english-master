"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ReviewQueueItem,
  ReviewQueueResult,
  ReviewResult,
  SentenceReviewState,
} from "@/lib/types";

const CARD_LIMIT = 10;

const RESULT_LABELS: Record<ReviewResult, string> = {
  full: "Fully understood",
  partial: "Mostly understood",
  missed: "Missed it",
};

function formatNextReview(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

  const currentItem: ReviewQueueItem | null =
    queue?.items[currentIndex] ?? null;

  const remainingCount = useMemo(() => {
    if (!queue) return 0;
    return Math.max(queue.dueCount - currentIndex, 0);
  }, [currentIndex, queue]);

  const progressPercent = useMemo(() => {
    if (!queue || queue.items.length === 0) return 0;
    return Math.min(100, (currentIndex / queue.items.length) * 100);
  }, [currentIndex, queue]);

  async function loadQueue() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/review?limit=${CARD_LIMIT}`);
      if (!response.ok) {
        throw new Error("Failed to load review queue.");
      }

      const data = (await response.json()) as ReviewQueueResult;
      setQueue(data);
      setCurrentIndex(0);
      setRevealed(false);
      setSelectedResult(null);
      setUpdatedState(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load review queue."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadQueueSafely() {
      if (cancelled) return;
      await loadQueue();
    }

    void loadQueueSafely();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audio.load();
    setAudioError(null);
  }, [currentItem?.sentence.id]);

  async function handleReplay() {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;

    try {
      await audio.play();
      setAudioError(null);
    } catch {
      setAudioError("Audio unavailable. Please try again.");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    setCurrentIndex((index) => index + 1);
    setRevealed(false);
    setSelectedResult(null);
    setUpdatedState(null);
    setAudioError(null);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f7f3ee 0%, #f6f7f8 48%, #f2f5f7 100%)",
        padding: "32px 18px 48px",
      }}
    >
      <div
        style={{
          maxWidth: "880px",
          margin: "0 auto",
          display: "grid",
          gap: "20px",
        }}
      >
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: "8px" }}>
            <span
              style={{
                fontSize: "12px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#8f6b4e",
                fontWeight: 700,
              }}
            >
              Review
            </span>
            <h1
              style={{
                fontSize: "clamp(2rem, 5vw, 3.4rem)",
                lineHeight: 1.05,
                color: "#1b2a36",
                maxWidth: "10ch",
              }}
            >
              Listen first. Judge honestly.
            </h1>
            <p style={{ maxWidth: "56ch", color: "#4f6473" }}>
              Three choices only: fully understood, mostly understood, or missed.
              After you choose, the sentence and fixed listening anchors appear.
            </p>
          </div>

          <nav
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <Link href="/learn" className="ui-button">
              Learn
            </Link>
            <Link
              href="/review"
              className="ui-button is-active"
            >
              Review
            </Link>
          </nav>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          <StatCard label="Due now" value={queue ? String(queue.dueCount) : "—"} />
          <StatCard label="Reviewable" value={queue ? String(queue.reviewableCount) : "—"} />
          <StatCard
            label="Skipped (no audio)"
            value={queue ? String(queue.skippedNoAudioCount) : "—"}
          />
          <StatCard label="Remaining" value={String(remainingCount)} />
        </section>

        {queue && queue.items.length > 0 && (
          <section
            style={{
              display: "grid",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", color: "#587081", fontSize: "14px" }}>
              <span>Session progress</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div
              style={{
                width: "100%",
                height: "10px",
                borderRadius: "999px",
                backgroundColor: "rgba(200, 209, 216, 0.55)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  borderRadius: "999px",
                  background: "linear-gradient(90deg, #c56a3d 0%, #e5a859 100%)",
                }}
              />
            </div>
          </section>
        )}

        <section
          style={{
            backgroundColor: "rgba(255,255,255,0.82)",
            border: "1px solid rgba(215, 222, 229, 0.95)",
            borderRadius: "28px",
            padding: "24px",
            boxShadow: "0 18px 45px rgba(25, 49, 69, 0.08)",
            minHeight: "420px",
          }}
        >
          {loading && (
            <div style={{ color: "#587081", fontSize: "15px" }}>
              Loading today&apos;s review queue...
            </div>
          )}

          {!loading && error && (
            <div style={{ display: "grid", gap: "14px" }}>
              <p style={{ color: "#b42318", fontWeight: 600 }}>{error}</p>
              <button
                type="button"
                onClick={() => void loadQueue()}
                className="ui-button"
              >
                Reload
              </button>
            </div>
          )}

          {!loading && !error && !currentItem && (
            <div style={{ display: "grid", gap: "14px" }}>
              <h2 style={{ fontSize: "28px", color: "#1d3342" }}>
                {queue && queue.dueCount > 0 ? "Session complete" : "No sentences due right now"}
              </h2>
              <p style={{ color: "#587081", maxWidth: "58ch" }}>
                {queue && queue.dueCount > 0
                  ? "You finished the loaded queue. Refresh later when more sentences become due."
                  : "Your review queue is clear for now. New sentences will show up here once they reach their next scheduled review time."}
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => void loadQueue()}
                  className="ui-button"
                >
                  Refresh queue
                </button>
              </div>
            </div>
          )}

          {!loading && !error && currentItem && (
            <div style={{ display: "grid", gap: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: "6px" }}>
                  <span style={{ color: "#8b5e34", fontWeight: 700, fontSize: "13px" }}>
                    Card {currentIndex + 1} of {queue?.items.length ?? 0}
                  </span>
                  <span style={{ color: "#587081", fontSize: "14px" }}>
                    Current stage {currentItem.reviewState.stage}
                  </span>
                </div>
              </div>

              <audio
                ref={audioRef}
                src={
                  currentItem.sentence.audioFilename
                    ? `/api/audio/${currentItem.sentence.audioFilename}`
                    : undefined
                }
                onError={() => setAudioError("Audio unavailable. Please try again.")}
              />

              <div
                style={{
                  borderRadius: "24px",
                  padding: "26px",
                  background:
                    revealed
                      ? "linear-gradient(180deg, #fef9f2 0%, #ffffff 100%)"
                      : "linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)",
                  color: "#20323f",
                  border: "1px solid #e4eaef",
                  display: "grid",
                  gap: "18px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div
                    style={{
                      flex: "1 1 560px",
                      minWidth: "0",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        marginBottom: "10px",
                        fontSize: "12px",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "#8f6b4e",
                      }}
                    >
                      {revealed ? "Sentence revealed" : "Blind listen"}
                    </span>
                    {revealed && (
                      <h2
                        style={{
                          fontSize: "clamp(1.4rem, 2.6vw, 2rem)",
                          lineHeight: 1.35,
                          maxWidth: "100%",
                          color: "#1d2d39",
                          fontWeight: 600,
                        }}
                      >
                        {currentItem.sentence.correctedSentence}
                      </h2>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleReplay}
                    className="ui-button"
                    style={{
                      alignSelf: "flex-start",
                      minWidth: "140px",
                    }}
                  >
                    Replay audio
                  </button>
                </div>

                {audioError && (
                  <p style={{ color: "#b42318", fontSize: "13px" }}>
                    {audioError}
                  </p>
                )}

                {!revealed && (
                  <div style={{ display: "grid", gap: "12px" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      <ResultButton
                        label={RESULT_LABELS.full}
                        accent="#5dd39e"
                        disabled={submitting}
                        onClick={() => handleResult("full")}
                      />
                      <ResultButton
                        label={RESULT_LABELS.partial}
                        accent="#ffba49"
                        disabled={submitting}
                        onClick={() => handleResult("partial")}
                      />
                      <ResultButton
                        label={RESULT_LABELS.missed}
                        accent="#ff6b6b"
                        disabled={submitting}
                        onClick={() => handleResult("missed")}
                      />
                    </div>
                  </div>
                )}

                {revealed && (
                  <div style={{ display: "grid", gap: "18px" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      <RevealStat
                        label="Your result"
                        value={selectedResult ? RESULT_LABELS[selectedResult] : "—"}
                      />
                      <RevealStat
                        label="New stage"
                        value={updatedState ? `Stage ${updatedState.stage}` : "—"}
                      />
                      <RevealStat
                        label="Next review"
                        value={updatedState ? formatNextReview(updatedState.nextReviewAt) : "—"}
                      />
                    </div>

                    {currentItem.listeningHighlights.length > 0 && (
                      <div style={{ display: "grid", gap: "12px" }}>
                        <h3 style={{ fontSize: "18px", color: "#20323f" }}>
                          Fixed listening anchors
                        </h3>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                            gap: "12px",
                          }}
                        >
                          {currentItem.listeningHighlights.map((highlight) => (
                            <article
                              key={`${highlight.kind}-${highlight.label}-${highlight.text}`}
                              style={{
                                borderRadius: "18px",
                                padding: "16px",
                                border: "1px solid #e7ecf0",
                                backgroundColor: "#fbfcfd",
                                display: "grid",
                                gap: "8px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "12px",
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  color: "#8b5e34",
                                  fontWeight: 700,
                                }}
                              >
                                {highlight.label}
                              </span>
                              <p style={{ fontWeight: 700, color: "#20323f" }}>
                                {highlight.text}
                              </p>
                              {highlight.note && (
                                <p style={{ color: "#587081", fontSize: "14px" }}>
                                  {highlight.note}
                                </p>
                              )}
                            </article>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={handleNext}
                        className="ui-button"
                      >
                        Next sentence
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: "20px",
        padding: "16px 18px",
        backgroundColor: "rgba(255,255,255,0.78)",
        border: "1px solid rgba(215, 222, 229, 0.95)",
      }}
    >
      <div style={{ color: "#6c8190", fontSize: "13px" }}>{label}</div>
      <div style={{ color: "#1d3342", fontSize: "28px", fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}

function ResultButton({
  label,
  accent,
  disabled,
  onClick,
}: {
  label: string;
  accent: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        borderRadius: "18px",
        padding: "16px 18px",
        border: "1px solid #dfe5ea",
        backgroundColor: "#ffffff",
        color: "#20323f",
        textAlign: "left",
        display: "grid",
        gap: "8px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "999px",
          backgroundColor: accent,
        }}
      />
      <span style={{ fontSize: "17px", fontWeight: 700 }}>{label}</span>
    </button>
  );
}

function RevealStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: "18px",
        padding: "14px 16px",
        backgroundColor: "#ffffff",
        border: "1px solid #dfe5ea",
      }}
    >
      <div style={{ color: "#6c8190", fontSize: "13px" }}>{label}</div>
      <div style={{ color: "#1d3342", fontWeight: 700 }}>{value}</div>
    </div>
  );
}
