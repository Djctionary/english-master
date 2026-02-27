import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import {
  _resetForTesting,
  initDatabase,
  closeDatabase,
  insertSentence,
} from "@/lib/db";
import type { AnalysisResult } from "@/lib/types";
import { GET } from "@/app/api/sentences/route";

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
        text: "sat",
        role: "predicate",
        startIndex: 8,
        endIndex: 11,
        description: "Predicate",
      },
    ],
    vocabulary: [
      {
        word: "cat",
        phonetic: "/kæt/",
        partOfSpeech: "noun",
        definition: "A feline",
        usageNote: "Subject",
        difficultyReason: "Common word but important for basic vocabulary",
        exampleSentence: "The cat sat on the windowsill.",
      },
    ],
    structureAnalysis: {
      clauseConnections: "This is a simple sentence with one independent clause.",
      tenseLogic: "Simple past tense is used to describe a completed action.",
      phraseExplanations: "No notable phrases or idioms in this sentence.",
    },
    grammarNotes: ["Simple past tense"],
    paraphrase: "A cat was sitting.",
    ...overrides,
  };
}

describe("GET /api/sentences", () => {
  beforeEach(() => {
    const testDb = new Database(":memory:");
    testDb.pragma("journal_mode = WAL");
    _resetForTesting(testDb);
    initDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  it("should return empty array when no sentences exist", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("should return all sentences", async () => {
    insertSentence({
      sentence: "Hello world.",
      correctedSentence: "Hello world.",
      analysis: makeAnalysis(),
      audioFilename: "abc.mp3",
      createdAt: "2024-01-01T00:00:00.000Z",
    });
    insertSentence({
      sentence: "Goodbye world.",
      correctedSentence: "Goodbye world.",
      analysis: makeAnalysis({ paraphrase: "Farewell." }),
      audioFilename: null,
      createdAt: "2024-01-02T00:00:00.000Z",
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
  });

  it("should return sentences in reverse chronological order", async () => {
    insertSentence({
      sentence: "First sentence.",
      correctedSentence: "First sentence.",
      analysis: makeAnalysis(),
      audioFilename: null,
      createdAt: "2024-01-01T00:00:00.000Z",
    });
    insertSentence({
      sentence: "Second sentence.",
      correctedSentence: "Second sentence.",
      analysis: makeAnalysis(),
      audioFilename: null,
      createdAt: "2024-01-02T00:00:00.000Z",
    });
    insertSentence({
      sentence: "Third sentence.",
      correctedSentence: "Third sentence.",
      analysis: makeAnalysis(),
      audioFilename: null,
      createdAt: "2024-01-03T00:00:00.000Z",
    });

    const res = await GET();
    const data = await res.json();

    expect(data[0].sentence).toBe("Third sentence.");
    expect(data[1].sentence).toBe("Second sentence.");
    expect(data[2].sentence).toBe("First sentence.");
  });

  it("should return complete SentenceRecord fields", async () => {
    const analysis = makeAnalysis();
    insertSentence({
      sentence: "Check fields.",
      correctedSentence: "Check fields.",
      analysis,
      audioFilename: "audio.mp3",
      createdAt: "2024-06-15T12:00:00.000Z",
    });

    const res = await GET();
    const data = await res.json();
    const record = data[0];

    expect(record.id).toBe(1);
    expect(record.sentence).toBe("Check fields.");
    expect(record.analysis).toEqual(analysis);
    expect(record.audioFilename).toBe("audio.mp3");
    expect(record.createdAt).toBe("2024-06-15T12:00:00.000Z");
  });

  it("should return 500 when database throws an error", async () => {
    // Close the DB to force an error on the next query
    closeDatabase();
    _resetForTesting(undefined);

    // Spy on getAllSentences to throw
    const dbModule = await import("@/lib/db");
    const spy = vi.spyOn(dbModule, "getAllSentences").mockImplementation(() => {
      throw new Error("SQLITE_ERROR: disk I/O error");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Internal server error");

    spy.mockRestore();
    consoleSpy.mockRestore();
  });
});
