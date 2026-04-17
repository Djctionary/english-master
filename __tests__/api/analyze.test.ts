import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import Database from "better-sqlite3";
import { _resetForTesting, initDatabase, closeDatabase, findSentenceByText } from "@/lib/db";
import type { AnalysisResult } from "@/lib/types";

// Mock the openai module
vi.mock("@/lib/openai", () => ({
  analyzeSentence: vi.fn(),
  generateAudio: vi.fn(),
}));

import { analyzeSentence, generateAudio } from "@/lib/openai";
import { POST } from "@/app/api/analyze/route";

const mockedAnalyze = vi.mocked(analyzeSentence);
const mockedAudio = vi.mocked(generateAudio);

function makeAnalysis(overrides?: Partial<AnalysisResult>): AnalysisResult {
  return {
    originalSentence: "The cat sat.",
    correctedSentence: "The cat sat.",
    corrections: [],
    clauses: [{ text: "The cat sat", type: "independent", role: "main clause" }],
    components: [
      { text: "The cat", role: "subject", startIndex: 0, endIndex: 7, description: "Subject" },
      { text: "sat", role: "predicate", startIndex: 8, endIndex: 11, description: "Predicate" },
    ],
    vocabulary: [
      { word: "cat", phonetic: "/kæt/", partOfSpeech: "noun", definition: "A feline", usageNote: "Subject", difficultyReason: "Common word but important for basic vocabulary", exampleSentence: "The cat sat on the windowsill." },
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

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyze", () => {
  beforeEach(() => {
    const testDb = new Database(":memory:");
    testDb.pragma("journal_mode = WAL");
    _resetForTesting(testDb);
    initDatabase();
    vi.clearAllMocks();
  });

  afterEach(() => {
    closeDatabase();
  });

  // --- Input Validation (Requirement 1.2) ---

  describe("input validation", () => {
    it("should return 400 for empty string", async () => {
      const res = await POST(makeRequest({ sentence: "" }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Sentence cannot be empty");
    });

    it("should return 400 for whitespace-only string", async () => {
      const res = await POST(makeRequest({ sentence: "   \t\n  " }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Sentence cannot be empty");
    });

    it("should return 400 for missing sentence field", async () => {
      const res = await POST(makeRequest({}));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Sentence cannot be empty");
    });

    it("should return 400 for non-string sentence", async () => {
      const res = await POST(makeRequest({ sentence: 123 }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Sentence cannot be empty");
    });

    it("should return 400 for invalid JSON body", async () => {
      const req = new NextRequest("http://localhost:3000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Sentence cannot be empty");
    });
  });

  // --- Cached sentence (Requirement 5.3) ---

  describe("cached sentence lookup", () => {
    it("should return cached record without calling OpenAI", async () => {
      const analysis = makeAnalysis();
      mockedAnalyze.mockResolvedValue(analysis);
      mockedAudio.mockResolvedValue({ filename: "abc123.mp3", data: Buffer.from([0xff, 0xfb]) });

      // First call — stores the record
      await POST(makeRequest({ sentence: "The cat sat." }));

      vi.clearAllMocks();

      // Second call — should return cached
      const res = await POST(makeRequest({ sentence: "The cat sat." }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.sentence).toBe("The cat sat.");
      expect(data.analysis).toEqual(analysis);
      expect(mockedAnalyze).not.toHaveBeenCalled();
      expect(mockedAudio).not.toHaveBeenCalled();
    });
  });

  // --- Successful analysis flow (Requirements 1.1, 2.1, 3.1, 5.1) ---

  describe("successful analysis", () => {
    it("should analyze, generate audio, store, and return SentenceRecord", async () => {
      const analysis = makeAnalysis();
      mockedAnalyze.mockResolvedValue(analysis);
      mockedAudio.mockResolvedValue({ filename: "hash12345678.mp3", data: Buffer.from([0xff, 0xfb]) });

      const res = await POST(makeRequest({ sentence: "The cat sat." }));
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.id).toBe(1);
      expect(data.sentence).toBe("The cat sat.");
      expect(data.analysis).toEqual(analysis);
      expect(data.audioFilename).toBe("hash12345678.mp3");
      expect(data.tag).toBeNull();
      expect(data.createdAt).toBeDefined();

      // Verify it was stored in DB
      const stored = findSentenceByText("The cat sat.");
      expect(stored).toBeDefined();
      expect(stored!.id).toBe(1);
    });

    it("should trim whitespace from the sentence before processing", async () => {
      const analysis = makeAnalysis({
        originalSentence: "Hello world.",
        correctedSentence: "Hello world.",
      });
      mockedAnalyze.mockResolvedValue(analysis);
      mockedAudio.mockResolvedValue({ filename: "hash.mp3", data: Buffer.from([0xff, 0xfb]) });

      const res = await POST(makeRequest({ sentence: "  Hello world.  " }));
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.sentence).toBe("Hello world.");
      expect(mockedAnalyze).toHaveBeenCalledWith("Hello world.");
      expect(mockedAudio).toHaveBeenCalledWith("Hello world.");
    });
  });

  // --- TTS failure graceful degradation (Requirement 3.4) ---

  describe("TTS failure (degraded mode)", () => {
    it("should return 200 with audioFilename null when TTS fails", async () => {
      const analysis = makeAnalysis();
      mockedAnalyze.mockResolvedValue(analysis);
      mockedAudio.mockRejectedValue(new Error("TTS API failed"));

      const res = await POST(makeRequest({ sentence: "Audio fails here." }));
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.sentence).toBe("Audio fails here.");
      expect(data.analysis).toEqual(analysis);
      expect(data.audioFilename).toBeNull();
      expect(data.tag).toBeNull();
      expect(data.id).toBe(1);
    });
  });

  // --- OpenAI GPT API failure (Requirement 2.3) ---

  describe("analysis failure", () => {
    it("should return 502 when analyzeSentence throws API error", async () => {
      mockedAnalyze.mockRejectedValue(
        new Error("Analysis service temporarily unavailable, please retry")
      );

      const res = await POST(makeRequest({ sentence: "This will fail." }));
      expect(res.status).toBe(502);

      const data = await res.json();
      expect(data.error).toBe("Analysis service temporarily unavailable, please retry");
    });

    it("should return 502 with parsing error message for invalid JSON", async () => {
      mockedAnalyze.mockRejectedValue(
        new Error("Analysis result parsing failed, please retry")
      );

      const res = await POST(makeRequest({ sentence: "Bad JSON response." }));
      expect(res.status).toBe(502);

      const data = await res.json();
      expect(data.error).toBe("Analysis result parsing failed, please retry");
    });

    it("should not store a record when analysis fails", async () => {
      mockedAnalyze.mockRejectedValue(new Error("API error"));

      await POST(makeRequest({ sentence: "No record stored." }));

      const stored = findSentenceByText("No record stored.");
      expect(stored).toBeUndefined();
    });
  });

  // --- Database failure ---

  describe("database failure", () => {
    it("should return 500 when insertSentence throws", async () => {
      const analysis = makeAnalysis();
      mockedAnalyze.mockResolvedValue(analysis);
      mockedAudio.mockResolvedValue({ filename: "audio.mp3", data: Buffer.from([0xff, 0xfb]) });

      // Dynamically import and spy on insertSentence to simulate DB failure
      const dbModule = await import("@/lib/db");
      const insertSpy = vi.spyOn(dbModule, "insertSentence").mockImplementation(() => {
        throw new Error("SQLITE_ERROR: disk I/O error");
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const res = await POST(makeRequest({ sentence: "DB will fail." }));
      expect(res.status).toBe(500);

      const data = await res.json();
      expect(data.error).toBe("Internal server error");

      insertSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});
