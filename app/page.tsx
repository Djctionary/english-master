"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  SentenceRecord,
  GrammarComponent,
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

export default function Home() {
  const [currentAnalysis, setCurrentAnalysis] = useState<SentenceRecord | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<GrammarComponent | null>(null);
  const [sentences, setSentences] = useState<SentenceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [isTagSaving, setIsTagSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setTagError] = useState<string | null>(null);

  // Search & pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSentences, setTotalSentences] = useState(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalSentences / PAGE_SIZE));

  // Collect unique tag types from current page of sentences for the filter dropdown
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

      // Handle both paginated {sentences, total} and legacy array responses
      if (Array.isArray(data)) {
        setSentences(data);
        setTotalSentences(data.length);
      } else {
        const result = data as SearchResult;
        setSentences(result.sentences);
        setTotalSentences(result.total);
      }
    } catch {
      // Library fetch failure is non-critical; keep existing list
    } finally {
      setIsLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrary(searchQuery, tagFilter, currentPage);
  }, [fetchLibrary, currentPage, tagFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  // searchQuery is handled via debounce below, not direct dependency

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
      setSelectedComponent(null);
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
      setSelectedComponent(null);
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
    setSelectedComponent(null);
    setTagError(null);
  };

  const handleComponentClick = (component: GrammarComponent) => {
    setSelectedComponent(component);
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
        setSelectedComponent(null);
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
    <div
      className="page-container"
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "32px 24px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        color: "#1F2937",
      }}
    >
      <h1
        style={{
          fontSize: "28px",
          fontWeight: 300,
          letterSpacing: "-0.02em",
          marginBottom: "28px",
          color: "#374151",
        }}
      >
        Learn English from Sentences
      </h1>

      {/* Sentence Input */}
      <section style={{ marginBottom: "28px" }}>
        <SentenceInput onSubmit={handleSubmit} isLoading={isLoading} error={error} />
      </section>

      {/* Analysis Display */}
      {currentAnalysis && renderableAnalysis && (
        <section
          style={{
            marginBottom: "32px",
            borderRadius: "10px",
            backgroundColor: "#FAFBFC",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          {renderableAnalysis.corrections.length > 0 && (
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #F0F1F3",
              }}
            >
              <CorrectionComparison
                originalSentence={renderableAnalysis.originalSentence}
                correctedSentence={renderableAnalysis.correctedSentence}
                corrections={renderableAnalysis.corrections}
              />
            </div>
          )}

          {/* Sentence header: color-coded sentence + tag badge + audio */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #F0F1F3",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, lineHeight: 1.7 }}>
                <ColorCodedSentence
                  components={renderableAnalysis.components}
                  correctedSentence={renderableAnalysis.correctedSentence}
                  vocabularyWords={renderableAnalysis.vocabulary.map(v => v.word)}
                  onComponentClick={handleComponentClick}
                  selectedComponent={selectedComponent}
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

          {/* Analysis details */}
          <DetailView analysis={renderableAnalysis} selectedComponent={selectedComponent} />
        </section>
      )}

      {currentAnalysis && !renderableAnalysis && (
        <section
          style={{
            marginBottom: "32px",
            borderRadius: "10px",
            backgroundColor: "#FAFBFC",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "18px 20px" }}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#1F2937" }}>
              Legacy Analysis Detected
            </h2>
            <p style={{ margin: "0 0 8px 0", color: "#4B5563", fontSize: "14px" }}>
              This sentence was generated by an older analysis format.
            </p>
            <p
              style={{
                margin: "0 0 12px 0",
                padding: "10px 12px",
                borderRadius: "8px",
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E7EB",
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
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#2563EB",
                color: "#FFFFFF",
                cursor: isRegenerating || isLoading ? "not-allowed" : "pointer",
              }}
            >
              {isRegenerating ? "Regenerating..." : "Regenerate This Sentence"}
            </button>
          </div>
        </section>
      )}

      {/* Sentence Library */}
      <section>
        <h2
          style={{
            fontSize: "15px",
            fontWeight: 500,
            textTransform: "uppercase" as const,
            letterSpacing: "0.04em",
            marginBottom: "12px",
            color: "#6B7280",
          }}
        >
          Sentence Library
        </h2>
        <div
          style={{
            borderRadius: "10px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
            overflow: "hidden",
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
  );
}
