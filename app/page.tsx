"use client";

import { useState, useEffect, useCallback } from "react";
import { SentenceRecord, GrammarComponent, SentenceTag } from "@/lib/types";
import SentenceInput from "@/components/SentenceInput";
import CorrectionComparison from "@/components/CorrectionComparison";
import ColorCodedSentence from "@/components/ColorCodedSentence";
import DetailView from "@/components/DetailView";
import AudioPlayer from "@/components/AudioPlayer";
import SentenceLibrary from "@/components/SentenceLibrary";
import InlineTagBadge from "@/components/InlineTagBadge";

export default function Home() {
  const [currentAnalysis, setCurrentAnalysis] = useState<SentenceRecord | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<GrammarComponent | null>(null);
  const [sentences, setSentences] = useState<SentenceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [isTagSaving, setIsTagSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setTagError] = useState<string | null>(null);

  const fetchLibrary = useCallback(async () => {
    setIsLibraryLoading(true);
    try {
      const res = await fetch("/api/sentences");
      if (!res.ok) throw new Error("Failed to fetch sentence library");
      const data: SentenceRecord[] = await res.json();
      setSentences(data);
    } catch {
      // Library fetch failure is non-critical; keep existing list
    } finally {
      setIsLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleSubmit = async (sentence: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Analysis failed. Please try again.");
      }
      const record: SentenceRecord = await res.json();
      setCurrentAnalysis(record);
      setSelectedComponent(null);
      setTagError(null);
      await fetchLibrary();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
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
      setSentences((prev) =>
        prev.map((record) =>
          record.id === updatedRecord.id ? updatedRecord : record
        )
      );
    } catch (err) {
      setTagError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsTagSaving(false);
    }
  };

  return (
    <div
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
      {currentAnalysis && (
        <section
          style={{
            marginBottom: "32px",
            borderRadius: "10px",
            backgroundColor: "#FAFBFC",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          {currentAnalysis.analysis.corrections.length > 0 && (
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #F0F1F3",
              }}
            >
              <CorrectionComparison
                originalSentence={currentAnalysis.analysis.originalSentence}
                correctedSentence={currentAnalysis.analysis.correctedSentence}
                corrections={currentAnalysis.analysis.corrections}
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
                  components={currentAnalysis.analysis.components}
                  correctedSentence={currentAnalysis.analysis.correctedSentence}
                  vocabularyWords={currentAnalysis.analysis.vocabulary.map(v => v.word)}
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
              <AudioPlayer audioFilename={currentAnalysis.audioFilename} />
            </div>
          </div>

          {/* Two-column analysis section */}
          <DetailView analysis={currentAnalysis.analysis} selectedComponent={selectedComponent} />
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
            selectedId={currentAnalysis?.id ?? null}
            isLoading={isLibraryLoading}
          />
        </div>
      </section>
    </div>
  );
}
