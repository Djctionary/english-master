import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import {
  initDatabase,
  findSentenceByText,
  insertSentence,
  getAllSentences,
  getSentenceById,
  updateSentenceTag,
  closeDatabase,
  _resetForTesting,
} from "@/lib/db";
import type { AnalysisResult, SentenceRecord } from "@/lib/types";

/**
 * Helper: create a minimal valid AnalysisResult for testing.
 */
function makeAnalysis(overrides?: Partial<AnalysisResult>): AnalysisResult {
  return {
    originalSentence: "The cat sat.",
    correctedSentence: "The cat sat.",
    corrections: [],
    clauses: [{ text: "The cat sat", type: "independent", role: "main clause" }],
    components: [
      {
        text: "The cat",
        role: "subject",
        startIndex: 0,
        endIndex: 7,
        description: "Subject of the sentence",
      },
    ],
    vocabulary: [
      {
        word: "cat",
        phonetic: "/kæt/",
        partOfSpeech: "noun",
        definition: "A small domesticated feline",
        usageNote: "Subject of the sentence",
        difficultyReason: "Common word but important for basic vocabulary",
        exampleSentence: "The cat sat on the windowsill.",
      },
    ],
    structureAnalysis: {
      clauseConnections: "This is a simple sentence with one independent clause.",
      tenseLogic: "Simple past tense is used to describe a completed action.",
      phraseExplanations: "No notable phrases or idioms in this sentence.",
    },
    grammarNotes: ["Simple present tense"],
    paraphrase: "A cat was sitting.",
    ...overrides,
  };
}

/**
 * Helper: create a record input (without id) for insertSentence.
 */
function makeRecordInput(
  sentence: string,
  overrides?: Partial<Omit<SentenceRecord, "id">>
): Omit<SentenceRecord, "id"> {
  return {
    sentence,
    correctedSentence: sentence,
    analysis: makeAnalysis({ originalSentence: sentence, correctedSentence: sentence }),
    audioFilename: "abc123.mp3",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("Database Module (lib/db.ts)", () => {
  beforeEach(() => {
    // Use an in-memory database for each test to ensure isolation
    const testDb = new Database(":memory:");
    testDb.pragma("journal_mode = WAL");
    _resetForTesting(testDb);
    initDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe("initDatabase", () => {
    it("should create the sentences table", () => {
      // initDatabase was already called in beforeEach; verify the table exists
      // by inserting and querying
      const record = insertSentence(makeRecordInput("Hello world."));
      expect(record.id).toBeGreaterThan(0);
    });

    it("should be idempotent — calling twice does not error", () => {
      initDatabase();
      initDatabase();
      const record = insertSentence(makeRecordInput("Test sentence."));
      expect(record.id).toBeGreaterThan(0);
    });
  });

  describe("insertSentence", () => {
    it("should insert a record and return it with an auto-generated id", () => {
      const input = makeRecordInput("The quick brown fox jumps.");
      const result = insertSentence(input);

      expect(result.id).toBe(1);
      expect(result.sentence).toBe("The quick brown fox jumps.");
      expect(result.correctedSentence).toBe("The quick brown fox jumps.");
      expect(result.analysis).toEqual(input.analysis);
      expect(result.audioFilename).toBe("abc123.mp3");
      expect(result.createdAt).toBe(input.createdAt);
    });

    it("should store analysis as JSON and parse it back correctly", () => {
      const analysis = makeAnalysis({
        originalSentence: "She had been told.",
        correctedSentence: "She had been told.",
        corrections: [],
        grammarNotes: ["Past perfect tense", "Passive voice"],
      });
      const input = makeRecordInput("She had been told.", { analysis });
      const result = insertSentence(input);

      expect(result.analysis.originalSentence).toBe("She had been told.");
      expect(result.analysis.correctedSentence).toBe("She had been told.");
      expect(result.analysis.corrections).toEqual([]);
      expect(result.analysis.grammarNotes).toEqual([
        "Past perfect tense",
        "Passive voice",
      ]);
    });

    it("should allow null audioFilename", () => {
      const input = makeRecordInput("No audio here.", {
        audioFilename: null,
      });
      const result = insertSentence(input);
      expect(result.audioFilename).toBeNull();
    });

    it("should reject duplicate sentences (UNIQUE constraint)", () => {
      insertSentence(makeRecordInput("Duplicate sentence."));
      expect(() =>
        insertSentence(makeRecordInput("Duplicate sentence."))
      ).toThrow();
    });

    it("should auto-increment ids for multiple inserts", () => {
      const r1 = insertSentence(makeRecordInput("First sentence."));
      const r2 = insertSentence(makeRecordInput("Second sentence."));
      const r3 = insertSentence(makeRecordInput("Third sentence."));

      expect(r1.id).toBe(1);
      expect(r2.id).toBe(2);
      expect(r3.id).toBe(3);
    });
  });

  describe("findSentenceByText", () => {
    it("should return undefined for a sentence that does not exist", () => {
      const result = findSentenceByText("Nonexistent sentence.");
      expect(result).toBeUndefined();
    });

    it("should return the matching record when the sentence exists", () => {
      const input = makeRecordInput("Find me later.");
      insertSentence(input);

      const found = findSentenceByText("Find me later.");
      expect(found).toBeDefined();
      expect(found!.sentence).toBe("Find me later.");
      expect(found!.analysis).toEqual(input.analysis);
    });

    it("should be case-sensitive", () => {
      insertSentence(makeRecordInput("Hello World."));
      expect(findSentenceByText("hello world.")).toBeUndefined();
      expect(findSentenceByText("Hello World.")).toBeDefined();
    });
  });

  describe("getAllSentences", () => {
    it("should return an empty array when no records exist", () => {
      const result = getAllSentences();
      expect(result).toEqual([]);
    });

    it("should return all records in reverse chronological order", () => {
      insertSentence(
        makeRecordInput("First.", { createdAt: "2024-01-01T00:00:00.000Z" })
      );
      insertSentence(
        makeRecordInput("Second.", { createdAt: "2024-06-15T12:00:00.000Z" })
      );
      insertSentence(
        makeRecordInput("Third.", { createdAt: "2024-12-31T23:59:59.000Z" })
      );

      const results = getAllSentences();
      expect(results).toHaveLength(3);
      expect(results[0].sentence).toBe("Third.");
      expect(results[1].sentence).toBe("Second.");
      expect(results[2].sentence).toBe("First.");
    });

    it("should correctly parse analysis JSON for all records", () => {
      insertSentence(
        makeRecordInput("Sentence A.", {
          createdAt: "2024-01-01T00:00:00.000Z",
        })
      );
      insertSentence(
        makeRecordInput("Sentence B.", {
          analysis: makeAnalysis({
            originalSentence: "Sentence B.",
            correctedSentence: "Sentence B.",
            corrections: [{ original: "Sentense", corrected: "Sentence", reason: "Spelling fix" }],
          }),
          createdAt: "2024-06-01T00:00:00.000Z",
        })
      );

      const results = getAllSentences();
      // Sentence B has later timestamp, so it comes first in reverse chronological order
      expect(results[0].analysis.corrections).toHaveLength(1);
      expect(results[0].analysis.corrections[0].reason).toBe("Spelling fix");
      expect(results[1].analysis.corrections).toEqual([]);
    });
  });

  describe("getSentenceById", () => {
    it("should return undefined for a non-existent id", () => {
      const result = getSentenceById(999);
      expect(result).toBeUndefined();
    });

    it("should return the correct record for a valid id", () => {
      const input = makeRecordInput("Get by ID test.");
      const inserted = insertSentence(input);

      const found = getSentenceById(inserted.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(inserted.id);
      expect(found!.sentence).toBe("Get by ID test.");
      expect(found!.analysis).toEqual(input.analysis);
      expect(found!.audioFilename).toBe(input.audioFilename);
    });

    it("should return the correct record among multiple records", () => {
      insertSentence(makeRecordInput("Record 1."));
      const target = insertSentence(makeRecordInput("Record 2."));
      insertSentence(makeRecordInput("Record 3."));

      const found = getSentenceById(target.id);
      expect(found).toBeDefined();
      expect(found!.sentence).toBe("Record 2.");
    });
  });

  describe("updateSentenceTag", () => {
    it("should add a tag to an existing record", () => {
      const inserted = insertSentence(makeRecordInput("Tag this sentence."));
      const updated = updateSentenceTag(inserted.id, {
        type: "Game",
        name: "Arknights",
      });

      expect(updated).toBeDefined();
      expect(updated!.tag).toEqual({ type: "Game", name: "Arknights" });
    });

    it("should clear a tag when null is passed", () => {
      const inserted = insertSentence(
        makeRecordInput("Tag then clear.", {
          tag: { type: "Music", name: "Blue Bird" },
        })
      );
      const updated = updateSentenceTag(inserted.id, null);

      expect(updated).toBeDefined();
      expect(updated!.tag).toBeNull();
    });

    it("should return undefined for non-existent id", () => {
      const updated = updateSentenceTag(999, {
        type: "Game",
        name: "Arknights",
      });
      expect(updated).toBeUndefined();
    });
  });
});
