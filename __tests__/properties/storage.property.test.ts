import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import Database from "better-sqlite3";
import {
  initDatabase,
  findSentenceByText,
  insertSentence,
  getAllSentences,
  getSentenceById,
  closeDatabase,
  _resetForTesting,
} from "@/lib/db";
import type { AnalysisResult, SentenceRecord } from "@/lib/types";

/**
 * Arbitrary: generate a non-empty, non-whitespace-only sentence string.
 */
const sentenceArb = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter((s) => s.trim().length > 0 && !s.includes("\0"));

/**
 * Arbitrary: generate a valid AnalysisResult.
 */
const analysisArb: fc.Arbitrary<AnalysisResult> = fc.record({
  originalSentence: fc.string({ minLength: 1, maxLength: 100 }),
  correctedSentence: fc.string({ minLength: 1, maxLength: 100 }),
  corrections: fc.array(
    fc.record({
      original: fc.string({ minLength: 1, maxLength: 30 }),
      corrected: fc.string({ minLength: 1, maxLength: 30 }),
      reason: fc.string({ minLength: 1, maxLength: 50 }),
    }),
    { minLength: 0, maxLength: 3 }
  ),
  clauses: fc.array(
    fc.record({
      text: fc.string({ minLength: 1, maxLength: 50 }),
      type: fc.constantFrom("independent", "relative clause", "adverbial clause"),
      role: fc.constantFrom("main clause", "modifies subject", "condition"),
    }),
    { minLength: 1, maxLength: 3 }
  ),
  components: fc.array(
    fc.record({
      text: fc.string({ minLength: 1, maxLength: 50 }),
      role: fc.constantFrom("subject", "predicate", "direct_object", "adverbial"),
      startIndex: fc.nat({ max: 100 }),
      endIndex: fc.nat({ max: 200 }),
      description: fc.string({ minLength: 1, maxLength: 100 }),
    }),
    { minLength: 1, maxLength: 5 }
  ),
  vocabulary: fc.array(
    fc.record({
      word: fc.string({ minLength: 1, maxLength: 30 }),
      phonetic: fc.string({ minLength: 1, maxLength: 30 }),
      partOfSpeech: fc.constantFrom("noun", "verb", "adjective", "adverb"),
      definition: fc.string({ minLength: 1, maxLength: 100 }),
      usageNote: fc.string({ minLength: 1, maxLength: 100 }),
      difficultyReason: fc.string({ minLength: 1, maxLength: 100 }),
      exampleSentence: fc.string({ minLength: 1, maxLength: 100 }),
    }),
    { minLength: 0, maxLength: 5 }
  ),
  grammarNotes: fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
    minLength: 1,
    maxLength: 5,
  }),
  structureAnalysis: fc.record({
    clauseConnections: fc.string({ minLength: 1, maxLength: 200 }),
    tenseLogic: fc.string({ minLength: 1, maxLength: 200 }),
    phraseExplanations: fc.string({ minLength: 1, maxLength: 200 }),
  }),
  paraphrase: fc.string({ minLength: 1, maxLength: 200 }),
});

/**
 * Arbitrary: generate a valid ISO 8601 timestamp string.
 */
const timestampArb = fc
  .date({
    min: new Date("2020-01-01T00:00:00Z"),
    max: new Date("2030-12-31T23:59:59Z"),
  })
  .filter((d) => !isNaN(d.getTime()))
  .map((d) => d.toISOString());

/**
 * Arbitrary: generate an optional audio filename.
 */
const audioFilenameArb = fc.option(
  fc.string({ minLength: 8, maxLength: 16, unit: fc.constantFrom(...'0123456789abcdef'.split('')) }).map((h) => `${h}.mp3`),
  { nil: null }
);

describe("Storage Property-Based Tests", () => {
  beforeEach(() => {
    const testDb = new Database(":memory:");
    testDb.pragma("journal_mode = WAL");
    _resetForTesting(testDb);
    initDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  // Feature: sentence-learning, Property 7: Sentence Record Round-Trip
  // **Validates: Requirements 5.1, 7.3**
  it("Property 7: Sentence record round-trip — inserted records can be retrieved by id with identical fields", () => {
    fc.assert(
      fc.property(
        sentenceArb,
        analysisArb,
        audioFilenameArb,
        timestampArb,
        (sentence, analysis, audioFilename, createdAt) => {
          // Fresh DB for each iteration
          const testDb = new Database(":memory:");
          testDb.pragma("journal_mode = WAL");
          _resetForTesting(testDb);
          initDatabase();

          const input: Omit<SentenceRecord, "id"> = {
            sentence,
            correctedSentence: analysis.correctedSentence || sentence,
            analysis,
            audioFilename,
            createdAt,
          };

          const inserted = insertSentence(input);
          const retrieved = getSentenceById(inserted.id);

          expect(retrieved).toBeDefined();
          expect(retrieved!.sentence).toBe(sentence);
          expect(retrieved!.correctedSentence).toBe(input.correctedSentence);
          expect(retrieved!.analysis).toEqual(analysis);
          expect(retrieved!.audioFilename).toBe(audioFilename);
          expect(retrieved!.createdAt).toBe(createdAt);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: sentence-learning, Property 5: Sentence Submission Idempotence (DB layer)
  // **Validates: Requirements 3.3, 5.3**
  it("Property 5 (DB layer): findSentenceByText returns the same record that was inserted", () => {
    fc.assert(
      fc.property(
        sentenceArb,
        analysisArb,
        audioFilenameArb,
        timestampArb,
        (sentence, analysis, audioFilename, createdAt) => {
          const testDb = new Database(":memory:");
          testDb.pragma("journal_mode = WAL");
          _resetForTesting(testDb);
          initDatabase();

          const input: Omit<SentenceRecord, "id"> = {
            sentence,
            correctedSentence: analysis.correctedSentence || sentence,
            analysis,
            audioFilename,
            createdAt,
          };

          const inserted = insertSentence(input);
          const found = findSentenceByText(sentence);

          expect(found).toBeDefined();
          expect(found!.id).toBe(inserted.id);
          expect(found!.sentence).toBe(inserted.sentence);
          expect(found!.analysis).toEqual(inserted.analysis);
          expect(found!.audioFilename).toBe(inserted.audioFilename);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: sentence-learning, Property 8: Sentence List Chronological Order
  // **Validates: Requirements 5.2, 7.2**
  it("Property 8: getAllSentences returns records in reverse chronological order", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            sentence: sentenceArb,
            analysis: analysisArb,
            audioFilename: audioFilenameArb,
            createdAt: timestampArb,
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (records) => {
          const testDb = new Database(":memory:");
          testDb.pragma("journal_mode = WAL");
          _resetForTesting(testDb);
          initDatabase();

          // Deduplicate sentences to avoid UNIQUE constraint violations
          const seen = new Set<string>();
          const uniqueRecords = records.filter((r) => {
            if (seen.has(r.sentence)) return false;
            seen.add(r.sentence);
            return true;
          });

          if (uniqueRecords.length < 2) return; // Need at least 2 for ordering check

          for (const record of uniqueRecords) {
            insertSentence({
              ...record,
              correctedSentence: record.analysis.correctedSentence || record.sentence,
            });
          }

          const allSentences = getAllSentences();

          // Verify reverse chronological order: each createdAt >= next createdAt
          for (let i = 0; i < allSentences.length - 1; i++) {
            expect(allSentences[i].createdAt >= allSentences[i + 1].createdAt).toBe(
              true
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
