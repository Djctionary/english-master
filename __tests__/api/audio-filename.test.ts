import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import Database from "better-sqlite3";
import {
  _resetForTesting,
  initDatabase,
  closeDatabase,
  insertSentence,
  getAudioByFilename,
} from "@/lib/db";
import type { AnalysisResult } from "@/lib/types";

vi.mock("@/lib/openai", () => ({
  generateAudio: vi.fn(),
  generateAudioFilename: vi.fn(),
}));

import { generateAudio } from "@/lib/openai";
import { GET } from "@/app/api/audio/[filename]/route";

const mockedAudio = vi.mocked(generateAudio);

const TEST_FILENAME = "a1b2c3d4e5f6a7b8.mp3";
const TEST_AUDIO_CONTENT = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x01, 0x02]);

function emptyAnalysis(): AnalysisResult {
  return {
    originalSentence: "Test.",
    correctedSentence: "Test.",
    corrections: [],
    clauses: [],
    components: [],
    vocabulary: [],
    structureAnalysis: {
      clauseConnections: "",
      tenseLogic: "",
      phraseExplanations: "",
    },
    grammarNotes: [],
    paraphrase: "",
  };
}

function buildRequest(filename: string) {
  const url = `http://localhost:3000/api/audio/${filename}`;
  const request = new NextRequest(url);
  const params = Promise.resolve({ filename });
  return { request, params };
}

describe("GET /api/audio/[filename]", () => {
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

  it("should return audio bytes from the database", async () => {
    insertSentence(
      {
        sentence: "Test.",
        correctedSentence: "Test.",
        analysis: emptyAnalysis(),
        audioFilename: TEST_FILENAME,
        tag: null,
        createdAt: new Date().toISOString(),
      },
      undefined,
      TEST_AUDIO_CONTENT
    );

    const { request, params } = buildRequest(TEST_FILENAME);
    const res = await GET(request, { params });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(res.headers.get("Content-Length")).toBe(
      TEST_AUDIO_CONTENT.length.toString()
    );

    const body = await res.arrayBuffer();
    expect(Buffer.from(body)).toEqual(TEST_AUDIO_CONTENT);
  });

  it("should lazily regenerate and persist audio when the DB row has no binary", async () => {
    insertSentence(
      {
        sentence: "Hello.",
        correctedSentence: "Hello.",
        analysis: emptyAnalysis(),
        audioFilename: TEST_FILENAME,
        tag: null,
        createdAt: new Date().toISOString(),
      },
      undefined,
      null
    );

    const regenerated = Buffer.from([0xaa, 0xbb, 0xcc]);
    mockedAudio.mockResolvedValueOnce({
      filename: TEST_FILENAME,
      data: regenerated,
    });

    const { request, params } = buildRequest(TEST_FILENAME);
    const res = await GET(request, { params });

    expect(res.status).toBe(200);
    expect(mockedAudio).toHaveBeenCalledWith("Hello.");

    const body = await res.arrayBuffer();
    expect(Buffer.from(body)).toEqual(regenerated);

    // Subsequent hits read from DB cache — no extra TTS call.
    const stored = getAudioByFilename(TEST_FILENAME);
    expect(stored?.data?.equals(regenerated)).toBe(true);
  });

  it("should return 502 when regeneration fails for a missing binary", async () => {
    insertSentence(
      {
        sentence: "Failing.",
        correctedSentence: "Failing.",
        analysis: emptyAnalysis(),
        audioFilename: TEST_FILENAME,
        tag: null,
        createdAt: new Date().toISOString(),
      },
      undefined,
      null
    );

    mockedAudio.mockRejectedValueOnce(new Error("ElevenLabs down"));

    const { request, params } = buildRequest(TEST_FILENAME);
    const res = await GET(request, { params });

    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toBe("Audio generation failed");
  });

  it("should return 404 when no DB row exists for the filename", async () => {
    const { request, params } = buildRequest("0000000000000000.mp3");
    const res = await GET(request, { params });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Audio file not found");
  });

  it("should return 404 for path traversal attempt with ..", async () => {
    const { request, params } = buildRequest("../etc/passwd");
    const res = await GET(request, { params });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Audio file not found");
  });

  it("should return 404 for filename with forward slash", async () => {
    const { request, params } = buildRequest("sub/a1b2c3d4e5f6a7b8.mp3");
    const res = await GET(request, { params });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Audio file not found");
  });

  it("should return 404 for filename with backslash", async () => {
    const { request, params } = buildRequest("sub\\a1b2c3d4e5f6a7b8.mp3");
    const res = await GET(request, { params });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Audio file not found");
  });

  it("should return 404 for non-hex filename", async () => {
    const { request, params } = buildRequest("notahexname.mp3");
    const res = await GET(request, { params });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Audio file not found");
  });

  it("should return 404 for non-mp3 extension", async () => {
    const { request, params } = buildRequest("a1b2c3d4e5f6a7b8.wav");
    const res = await GET(request, { params });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Audio file not found");
  });

  it("should return 404 for empty filename", async () => {
    const { request, params } = buildRequest("");
    const res = await GET(request, { params });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Audio file not found");
  });
});
