"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  SentenceRecord,
  SentenceTag,
  AnalysisResult,
  SearchResult,
} from "@/lib/types";
import SentenceInput from "@/components/SentenceInput";
import CorrectionComparison from "@/components/CorrectionComparison";
import ColorCodedSentence from "@/components/ColorCodedSentence";
import DetailView from "@/components/DetailView";
import AudioPlayer from "@/components/AudioPlayer";
import SentenceLibrary from "@/components/SentenceLibrary";
import InlineTagBadge from "@/components/InlineTagBadge";

const PAGE_SIZE = 20;

function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object") return false;
  const analysis = value as Partial<AnalysisResult>;

  if (typeof analysis.originalSentence !== "string") return false;
  if (typeof analysis.correctedSentence !== "string") return false;
  if (!Array.isArray(analysis.corrections)) return false;
  if (!Array.isArray(analysis.clauses)) return false;
  if (!Array.isArray(analysis.components)) return false;
  if (!Array.isArray(analysis.vocabulary)) return false;
  if (!Array.isArray(analysis.grammarNotes)) return false;
  if (typeof analysis.paraphrase !== "string") return false;
  if (!analysis.structureAnalysis || typeof analysis.structureAnalysis !== "object") {
    return false;
  }

  const structure = analysis.structureAnalysis as Partial<AnalysisResult["structureAnalysis"]>;
  if (typeof structure.clauseConnections !== "string") return false;
  if (typeof structure.tenseLogic !== "string") return false;
  if (typeof structure.phraseExplanations !== "string") return false;

  return true;
}

export default function LearnWorkspace() {
  const [currentAnalysis, setCurrentAnalysis] = useState<SentenceRecord | null>(null);
  const [sentences, setSentences] = useState<SentenceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [isTagSaving, setIsTagSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setTagError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSentences, setTotalSentences] = useState(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalSentences / PAGE_SIZE));

  const tagTypes = Array.from(
    new Set(
      sentences
        .map((r) => r.tag?.type)
        .filter((t): t is string => Boolean(t))
    )
  );

  const fetchLibrary = useCallback(async (query = "", tagType = "", page = 1) => {
    setIsLibraryLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (tagType) params.set("tagType", tagType);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String((page - 1) * PAGE_SIZE));

      const res = await fetch(`/api/sentences?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch sentence library");
      const data = await res.json();

      if (Array.isArray(data)) {
        setSentences(data);
        setTotalSentences(data.length);
      } else {
        const result = data as SearchResult;
        setSentences(result.sentences);
        setTotalSentences(result.total);
      }
    } catch {
      // Non-critical for the main workspace.
    } finally {
      setIsLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrary(searchQuery, tagFilter, currentPage);
  }, [fetchLibrary, currentPage, tagFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchLibrary(query, tagFilter, 1);
    }, 300);
  }, [fetchLibrary, tagFilter]);

  const handleTagFilterChange = useCallback((tagType: string) => {
    setTagFilter(tagType);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const upsertRecord = useCallback((nextRecord: SentenceRecord) => {
    setSentences((prev) => {
      const index = prev.findIndex((item) => item.id === nextRecord.id);
      if (index === -1) {
        return [nextRecord, ...prev];
      }
      const clone = [...prev];
      clone[index] = nextRecord;
      return clone;
    });
  }, []);

  const requestAnalysis = useCallback(
    async (sentence: string, force = false): Promise<SentenceRecord> => {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(force ? { sentence, force: true } : { sentence }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Analysis failed. Please try again.");
      }

      return (await res.json()) as SentenceRecord;
    },
    []
  );

  const handleSubmit = async (sentence: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const record = await requestAnalysis(sentence, false);
      setCurrentAnalysis(record);
      setTagError(null);
      upsertRecord(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateCurrent = async () => {
    if (!currentAnalysis) return;

    setIsRegenerating(true);
    setError(null);
    try {
      const record = await requestAnalysis(currentAnalysis.sentence, true);
      setCurrentAnalysis(record);
      setTagError(null);
      upsertRecord(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate sentence.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleLibrarySelect = (record: SentenceRecord) => {
    setCurrentAnalysis(record);
    setTagError(null);
  };

  const existingTags: SentenceTag[] = Array.from(
    new Map(
      sentences
        .map((record) => record.tag)
        .filter((tag): tag is SentenceTag => Boolean(tag))
        .map((tag) => [
          `${tag.type.toLowerCase()}|||${tag.name.toLowerCase()}`,
          tag,
        ])
    ).values()
  );

  const handleSaveTag = async (tag: SentenceTag | null) => {
    if (!currentAnalysis) return;

    setIsTagSaving(true);
    setTagError(null);
    try {
      const res = await fetch(`/api/sentences/${currentAnalysis.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to update tag.");
      }

      const updatedRecord: SentenceRecord = await res.json();
      setCurrentAnalysis(updatedRecord);
      upsertRecord(updatedRecord);
    } catch (err) {
      setTagError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsTagSaving(false);
    }
  };

  const handleDeleteSentence = async (record: SentenceRecord) => {
    const confirmed = window.confirm(
      "Delete this sentence from history? This cannot be undone."
    );
    if (!confirmed) return;

    setDeletingId(record.id);
    setError(null);
    try {
      const res = await fetch(`/api/sentences/${record.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to delete sentence.");
      }

      setSentences((prev) => prev.filter((item) => item.id !== record.id));
      setTotalSentences((prev) => Math.max(0, prev - 1));
      if (currentAnalysis?.id === record.id) {
        setCurrentAnalysis(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete sentence.");
    } finally {
      setDeletingId(null);
    }
  };

  const renderableAnalysis =
    currentAnalysis && isAnalysisResult(currentAnalysis.analysis)
      ? currentAnalysis.analysis
      : null;

  return (
    <main
      className="page-container"
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f7f3ee 0%, #f6f7f8 48%, #f2f5f7 100%)",
        padding: "32px 18px 48px",
      }}
    >
      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          display: "grid",
          gap: "20px",
          color: "#20303b",
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
              Learn
            </span>
            <h1
              style={{
                fontSize: "clamp(2rem, 5vw, 3.3rem)",
                lineHeight: 1.03,
                color: "#1d2d39",
                maxWidth: "10ch",
              }}
            >
              Build your sentence library.
            </h1>
            <p style={{ maxWidth: "60ch", color: "#596d7c" }}>
              Analyze, store, and revisit sentences in one calm workspace. Learn
              and review now share the same simple visual system.
            </p>
          </div>

          <nav
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <Link href="/learn" className="ui-button is-active">
              Learn
            </Link>
            <Link href="/review" className="ui-button">
              Review
            </Link>
          </nav>
        </section>

        <section
          style={{
            borderRadius: "24px",
            border: "1px solid rgba(215, 222, 229, 0.95)",
            backgroundColor: "rgba(255,255,255,0.84)",
            padding: "18px",
            boxShadow: "0 18px 45px rgba(25, 49, 69, 0.08)",
          }}
        >
          <SentenceInput onSubmit={handleSubmit} isLoading={isLoading} error={error} />
        </section>

        {currentAnalysis && renderableAnalysis && (
          <section
            style={{
              borderRadius: "24px",
              backgroundColor: "rgba(255,255,255,0.84)",
              boxShadow: "0 18px 45px rgba(25, 49, 69, 0.08)",
              border: "1px solid rgba(215, 222, 229, 0.95)",
              overflow: "hidden",
            }}
          >
            {renderableAnalysis.corrections.length > 0 && (
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #edf1f4" }}>
                <CorrectionComparison
                  originalSentence={renderableAnalysis.originalSentence}
                  correctedSentence={renderableAnalysis.correctedSentence}
                  corrections={renderableAnalysis.corrections}
                />
              </div>
            )}

            <div style={{ padding: "18px 20px", borderBottom: "1px solid #edf1f4" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <div style={{ flex: 1, lineHeight: 1.7 }}>
                  <ColorCodedSentence
                    components={renderableAnalysis.components}
                    correctedSentence={renderableAnalysis.correctedSentence}
                    vocabularyWords={renderableAnalysis.vocabulary.map((v) => v.word)}
                  />
                </div>
                <InlineTagBadge
                  currentTag={currentAnalysis.tag ?? null}
                  existingTags={existingTags}
                  onSaveTag={handleSaveTag}
                  isSaving={isTagSaving}
                />
                <AudioPlayer
                  key={`${currentAnalysis.id}-${currentAnalysis.audioFilename ?? "no-audio"}`}
                  audioFilename={currentAnalysis.audioFilename}
                />
              </div>
            </div>

            <DetailView analysis={renderableAnalysis} />
          </section>
        )}

        {currentAnalysis && !renderableAnalysis && (
          <section
            style={{
              borderRadius: "24px",
              backgroundColor: "rgba(255,255,255,0.84)",
              boxShadow: "0 18px 45px rgba(25, 49, 69, 0.08)",
              border: "1px solid rgba(215, 222, 229, 0.95)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "20px" }}>
              <h2 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#20303b" }}>
                Legacy analysis detected
              </h2>
              <p style={{ margin: "0 0 8px 0", color: "#596d7c", fontSize: "14px" }}>
                This sentence was created before the current analysis format.
              </p>
              <p
                style={{
                  margin: "0 0 12px 0",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e4eaef",
                  color: "#111827",
                  fontSize: "14px",
                }}
              >
                {currentAnalysis.sentence}
              </p>
              <button
                type="button"
                onClick={handleRegenerateCurrent}
                disabled={isRegenerating || isLoading}
                className="ui-button"
                style={{
                  minHeight: "40px",
                }}
              >
                {isRegenerating ? "Regenerating..." : "Regenerate sentence"}
              </button>
            </div>
          </section>
        )}

        <section style={{ display: "grid", gap: "12px" }}>
          <h2
            style={{
              fontSize: "15px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#7a8f9f",
            }}
          >
            Sentence library
          </h2>
          <div
            style={{
              borderRadius: "24px",
              boxShadow: "0 18px 45px rgba(25, 49, 69, 0.08)",
              border: "1px solid rgba(215, 222, 229, 0.95)",
              overflow: "hidden",
              backgroundColor: "rgba(255,255,255,0.84)",
            }}
          >
            <SentenceLibrary
              sentences={sentences}
              onSelect={handleLibrarySelect}
              onDelete={handleDeleteSentence}
              deletingId={deletingId}
              selectedId={currentAnalysis?.id ?? null}
              isLoading={isLibraryLoading}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              tagTypes={tagTypes}
              selectedTagType={tagFilter}
              onTagFilterChange={handleTagFilterChange}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
