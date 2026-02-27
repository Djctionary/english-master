import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import {
  _resetForTesting,
  initDatabase,
  closeDatabase,
  insertSentence,
} from "@/lib/db";
import type { AnalysisResult } from "@/lib/types";
import { GET, PATCH } from "@/app/api/sentences/[id]/route";
import { NextRequest } from "next/server";

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

function buildRequest(id: string) {
  const url = `http://localhost:3000/api/sentences/${id}`;
  const request = new NextRequest(url);
  const params = Promise.resolve({ id });
  return { request, params };
}

function buildPatchRequest(id: string, body: unknown) {
  const url = `http://localhost:3000/api/sentences/${id}`;
  const request = new NextRequest(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const params = Promise.resolve({ id });
  return { request, params };
}

describe("GET /api/sentences/[id]", () => {
  beforeEach(() => {
    const testDb = new Database(":memory:");
    testDb.pragma("journal_mode = WAL");
    _resetForTesting(testDb);
    initDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  it("should return a sentence record by ID", async () => {
    const analysis = makeAnalysis();
    insertSentence({
      sentence: "Hello world.",
      correctedSentence: "Hello world.",
      analysis,
      audioFilename: "abc.mp3",
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    const { request, params } = buildRequest("1");
    const res = await GET(request, { params });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.id).toBe(1);
    expect(data.sentence).toBe("Hello world.");
    expect(data.analysis).toEqual(analysis);
    expect(data.audioFilename).toBe("abc.mp3");
    expect(data.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("should return 404 for non-existent ID", async () => {
    const { request, params } = buildRequest("999");
    const res = await GET(request, { params });
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toBe("Sentence record not found");
  });

  it("should return 400 for non-integer ID", async () => {
    const { request, params } = buildRequest("abc");
    const res = await GET(request, { params });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Invalid sentence ID");
  });

  it("should return 400 for decimal ID", async () => {
    const { request, params } = buildRequest("1.5");
    const res = await GET(request, { params });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Invalid sentence ID");
  });

  it("should return 400 for negative ID", async () => {
    const { request, params } = buildRequest("-1");
    const res = await GET(request, { params });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Invalid sentence ID");
  });

  it("should return 400 for zero ID", async () => {
    const { request, params } = buildRequest("0");
    const res = await GET(request, { params });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Invalid sentence ID");
  });

  it("should return record with null audioFilename", async () => {
    insertSentence({
      sentence: "No audio here.",
      correctedSentence: "No audio here.",
      analysis: makeAnalysis(),
      audioFilename: null,
      createdAt: "2024-06-01T00:00:00.000Z",
    });

    const { request, params } = buildRequest("1");
    const res = await GET(request, { params });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.audioFilename).toBeNull();
  });

  it("should return 500 when database throws an error", async () => {
    closeDatabase();
    _resetForTesting(undefined);

    const dbModule = await import("@/lib/db");
    const spy = vi
      .spyOn(dbModule, "getSentenceById")
      .mockImplementation(() => {
        throw new Error("SQLITE_ERROR: disk I/O error");
      });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { request, params } = buildRequest("1");
    const res = await GET(request, { params });
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toBe("Internal server error");

    spy.mockRestore();
    consoleSpy.mockRestore();
  });
});

describe("PATCH /api/sentences/[id]", () => {
  beforeEach(() => {
    const testDb = new Database(":memory:");
    testDb.pragma("journal_mode = WAL");
    _resetForTesting(testDb);
    initDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  it("should update a sentence with a tag", async () => {
    insertSentence({
      sentence: "Tag me.",
      correctedSentence: "Tag me.",
      analysis: makeAnalysis(),
      audioFilename: null,
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    const { request, params } = buildPatchRequest("1", {
      tag: { type: "Game", name: "Arknights" },
    });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.tag).toEqual({ type: "Game", name: "Arknights" });
  });

  it("should clear an existing tag when tag is null", async () => {
    insertSentence({
      sentence: "Tag clear.",
      correctedSentence: "Tag clear.",
      analysis: makeAnalysis(),
      audioFilename: null,
      tag: { type: "Music", name: "Blue Bird" },
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    const { request, params } = buildPatchRequest("1", { tag: null });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.tag).toBeNull();
  });

  it("should return 400 for invalid tag payload", async () => {
    insertSentence({
      sentence: "Bad tag payload.",
      correctedSentence: "Bad tag payload.",
      analysis: makeAnalysis(),
      audioFilename: null,
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    const { request, params } = buildPatchRequest("1", { tag: "bad" });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Invalid tag format");
  });

  it("should return 404 when record does not exist", async () => {
    const { request, params } = buildPatchRequest("999", {
      tag: { type: "Game", name: "Arknights" },
    });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toBe("Sentence record not found");
  });

  it("should return 400 for non-integer ID", async () => {
    const { request, params } = buildPatchRequest("abc", {
      tag: { type: "Game", name: "Arknights" },
    });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Invalid sentence ID");
  });
});
