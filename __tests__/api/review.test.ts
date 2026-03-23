import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import {
  _resetForTesting,
  closeDatabase,
  initDatabase,
  insertSentence,
} from "@/lib/db";
import type { AnalysisResult } from "@/lib/types";
import { GET as GET_REVIEW_QUEUE } from "@/app/api/review/route";
import { POST as POST_REVIEW_RESULT } from "@/app/api/review/[id]/route";

function makeAnalysis(overrides?: Partial<AnalysisResult>): AnalysisResult {
  return {
    originalSentence: "The cat sat.",
    correctedSentence: "The cat sat.",
    corrections: [],
    clauses: [
      { text: "The cat sat", type: "independent", role: "main clause" },
    ],
    components: [
      {
        text: "The cat",
        role: "subject",
        startIndex: 0,
        endIndex: 7,
        description: "Subject",
      },
      {
        text: "sat on the chair",
        role: "predicate",
        startIndex: 8,
        endIndex: 24,
        description: "Main action chunk",
      },
    ],
    vocabulary: [
      {
        word: "chair",
        phonetic: "/tʃer/",
        partOfSpeech: "noun",
        definition: "A seat for one person.",
        usageNote: "Object in the sentence.",
        difficultyReason: "Useful anchor for sound recognition.",
        exampleSentence: "The chair was by the window.",
      },
    ],
    structureAnalysis: {
      clauseConnections: "Single clause sentence.",
      tenseLogic: "Simple past marks a completed action.",
      phraseExplanations: "sat on is a common verb phrase.",
    },
    grammarNotes: ["Listen for the verb phrase first."],
    paraphrase: "A cat sat down.",
    ...overrides,
  };
}

function makeGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/review");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

function makePostRequest(result: "full" | "partial" | "missed"): NextRequest {
  return new NextRequest("http://localhost/api/review/1", {
    method: "POST",
    body: JSON.stringify({ result }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("Review API", () => {
  beforeEach(() => {
    const testDb = new Database(":memory:");
    testDb.pragma("journal_mode = WAL");
    _resetForTesting(testDb);
    initDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  it("returns only due review items that have audio", async () => {
    insertSentence({
      sentence: "Audio due sentence.",
      correctedSentence: "Audio due sentence.",
      analysis: makeAnalysis({
        originalSentence: "Audio due sentence.",
        correctedSentence: "Audio due sentence.",
      }),
      audioFilename: "audio.mp3",
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    insertSentence({
      sentence: "No audio due sentence.",
      correctedSentence: "No audio due sentence.",
      analysis: makeAnalysis({
        originalSentence: "No audio due sentence.",
        correctedSentence: "No audio due sentence.",
      }),
      audioFilename: null,
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    const response = await GET_REVIEW_QUEUE(makeGetRequest());
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.dueCount).toBe(1);
    expect(payload.reviewableCount).toBe(1);
    expect(payload.skippedNoAudioCount).toBe(1);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].sentence.sentence).toBe("Audio due sentence.");
    expect(payload.items[0].listeningHighlights.length).toBeGreaterThan(0);
  });

  it("updates review stage after submitting a result", async () => {
    const sentence = insertSentence({
      sentence: "Review me.",
      correctedSentence: "Review me.",
      analysis: makeAnalysis({
        originalSentence: "Review me.",
        correctedSentence: "Review me.",
      }),
      audioFilename: "audio.mp3",
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    const response = await POST_REVIEW_RESULT(makePostRequest("full"), {
      params: Promise.resolve({ id: String(sentence.id) }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.stage).toBe(2);
    expect(payload.lastResult).toBe("full");
    expect(payload.lastReviewedAt).toBeTruthy();
  });
});
