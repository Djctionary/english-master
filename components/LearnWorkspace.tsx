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
import ConfirmDialog from "@/components/ConfirmDialog";
import ThemeToggle from "@/components/ThemeToggle";

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
  const [pendingDelete, setPendingDelete] = useState<SentenceRecord | null>(null);
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

  const handleDeleteSentence = (record: SentenceRecord) => {
    setPendingDelete(record);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const record = pendingDelete;
    setPendingDelete(null);

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
        backgroundColor: "var(--color-bg)",
        padding: "var(--space-2xl) var(--space-lg) var(--space-3xl)",
      }}
    >
      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          display: "grid",
          gap: "var(--space-xl)",
        }}
      >
        {/* Header */}
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "var(--space-lg)",
            flexWrap: "wrap",
          }}
        >
          <div>
            <span className="section-label">Learn</span>
            <h1
              style={{
                fontSize: "var(--text-display)",
                lineHeight: "var(--leading-tight)",
                color: "var(--color-text)",
                margin: "var(--space-xs) 0 0",
              }}
            >
              Analyze & collect.
            </h1>
          </div>

          <nav style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
            <Link href="/learn" className="ui-button is-active">
              Learn
            </Link>
            <Link href="/review" className="ui-button">
              Review
            </Link>
            <ThemeToggle />
          </nav>
        </section>

        {/* Input card */}
        <section className="card" style={{ padding: "var(--space-lg)" }}>
          <SentenceInput onSubmit={handleSubmit} isLoading={isLoading} error={error} />
        </section>

        {/* Analysis result */}
        {currentAnalysis && renderableAnalysis && (
          <section className="card" style={{ overflow: "hidden" }}>
            {renderableAnalysis.corrections.length > 0 && (
              <div style={{ padding: "var(--space-lg)", borderBottom: "1px solid var(--color-border)" }}>
                <CorrectionComparison
                  originalSentence={renderableAnalysis.originalSentence}
                  correctedSentence={renderableAnalysis.correctedSentence}
                  corrections={renderableAnalysis.corrections}
                />
              </div>
            )}

            <div style={{ padding: "var(--space-lg)", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", flexWrap: "wrap" }}>
                <div style={{ flex: 1, lineHeight: "var(--leading-relaxed)" }}>
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

        {/* Legacy analysis */}
        {currentAnalysis && !renderableAnalysis && (
          <section className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "var(--space-xl)" }}>
              <h2 style={{ margin: "0 0 var(--space-sm) 0", fontSize: "var(--text-body)", color: "var(--color-text)" }}>
                Legacy analysis detected
              </h2>
              <p style={{ margin: "0 0 var(--space-sm) 0", color: "var(--color-text-secondary)", fontSize: "var(--text-small)" }}>
                This sentence was created before the current analysis format.
              </p>
              <p
                style={{
                  margin: "0 0 var(--space-md) 0",
                  padding: "var(--space-md)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                  fontSize: "var(--text-small)",
                }}
              >
                {currentAnalysis.sentence}
              </p>
              <button
                type="button"
                onClick={handleRegenerateCurrent}
                disabled={isRegenerating || isLoading}
                className="btn-primary"
              >
                {isRegenerating ? "Regenerating..." : "Regenerate sentence"}
              </button>
            </div>
          </section>
        )}

        {/* Sentence library */}
        <section style={{ display: "grid", gap: "var(--space-md)" }}>
          <h2 className="section-label" style={{ fontSize: "var(--text-small)" }}>
            Sentence library
          </h2>
          <div className="card" style={{ overflow: "hidden" }}>
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

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete sentence"
        message={
          pendingDelete
            ? `"${pendingDelete.sentence.length > 80 ? pendingDelete.sentence.slice(0, 80) + "..." : pendingDelete.sentence}" will be permanently removed.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Keep it"
        variant="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </main>
  );
}
