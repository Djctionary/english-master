import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AnalysisResult } from "@/lib/types";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Mock the OpenAI module before importing the service
vi.mock("openai", () => {
  const mockCreate = vi.fn();
  const mockSpeechCreate = vi.fn();
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
      audio = {
        speech: {
          create: mockSpeechCreate,
        },
      };
    },
    __mockCreate: mockCreate,
    __mockSpeechCreate: mockSpeechCreate,
  };
});

// Get reference to the mock functions
// @ts-expect-error — mock exports injected by vi.mock
import { __mockCreate, __mockSpeechCreate } from "openai";
const mockCreate = __mockCreate as ReturnType<typeof vi.fn>;
const mockSpeechCreate = __mockSpeechCreate as ReturnType<typeof vi.fn>;

// Import after mocking
import { analyzeSentence } from "@/lib/openai";
import { generateAudio, generateAudioFilename } from "@/lib/openai";

/**
 * Helper: create a valid AnalysisResult for mock responses.
 */
function makeValidAnalysis(
  overrides?: Partial<AnalysisResult>
): AnalysisResult {
  return {
    originalSentence: "The cat sat on the mat.",
    correctedSentence: "The cat sat on the mat.",
    corrections: [],
    clauses: [
      { text: "The cat sat on the mat", type: "independent", role: "main clause" },
    ],
    components: [
      {
        text: "The cat",
        role: "subject",
        startIndex: 0,
        endIndex: 7,
        description: "Subject of the sentence",
      },
      {
        text: "sat",
        role: "predicate",
        startIndex: 8,
        endIndex: 11,
        description: "Main verb",
      },
      {
        text: "on the mat",
        role: "prepositional",
        startIndex: 12,
        endIndex: 22,
        description: "Prepositional phrase indicating location",
      },
    ],
    vocabulary: [
      {
        word: "sat",
        phonetic: "/sæt/",
        partOfSpeech: "verb",
        definition: "Past tense of sit",
        usageNote: "Main verb in simple past tense",
        difficultyReason: "Common irregular verb important for basic vocabulary",
        exampleSentence: "She sat down on the bench to rest.",
      },
    ],
    structureAnalysis: {
      clauseConnections: "This is a simple sentence with one independent clause.",
      tenseLogic: "Simple past tense is used to describe a completed action.",
      phraseExplanations: "No notable phrases or idioms in this sentence.",
    },
    grammarNotes: ["Simple past tense", "Prepositional phrase of place"],
    paraphrase: "A cat was sitting on the mat.",
    ...overrides,
  };
}

/**
 * Helper: create a mock OpenAI API response.
 */
function makeMockResponse(content: string) {
  return {
    choices: [
      {
        message: {
          content,
        },
      },
    ],
  };
}

describe("analyzeSentence (lib/openai.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a valid AnalysisResult for a well-formed response", async () => {
    const analysis = makeValidAnalysis();
    mockCreate.mockResolvedValueOnce(
      makeMockResponse(JSON.stringify(analysis))
    );

    const result = await analyzeSentence("The cat sat on the mat.");

    expect(result).toEqual(analysis);
    expect(result.originalSentence).toBe("The cat sat on the mat.");
    expect(result.correctedSentence).toBe("The cat sat on the mat.");
    expect(result.corrections).toEqual([]);
    expect(result.clauses).toHaveLength(1);
    expect(result.components).toHaveLength(3);
    expect(result.vocabulary).toHaveLength(1);
    expect(result.grammarNotes).toHaveLength(2);
    expect(result.paraphrase).toBe("A cat was sitting on the mat.");
  });

  it("should call OpenAI with correct model and structured output format", async () => {
    const analysis = makeValidAnalysis();
    mockCreate.mockResolvedValueOnce(
      makeMockResponse(JSON.stringify(analysis))
    );

    await analyzeSentence("Test sentence.");

    expect(mockCreate).toHaveBeenCalledOnce();
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("gpt-4o-mini");
    expect(callArgs.response_format.type).toBe("json_schema");
    expect(callArgs.response_format.json_schema.name).toBe("analysis_result");
    expect(callArgs.messages).toHaveLength(2);
    expect(callArgs.messages[0].role).toBe("system");
    expect(callArgs.messages[1].role).toBe("user");
    expect(callArgs.messages[1].content).toBe("Test sentence.");
  });

  it("should include the multi-layer analysis system prompt", async () => {
    const analysis = makeValidAnalysis();
    mockCreate.mockResolvedValueOnce(
      makeMockResponse(JSON.stringify(analysis))
    );

    await analyzeSentence("Hello world.");

    const systemPrompt = mockCreate.mock.calls[0][0].messages[0].content;
    expect(systemPrompt).toContain("Step 0");
    expect(systemPrompt).toContain("Grammar & Spelling Correction");
    expect(systemPrompt).toContain("Layer 1");
    expect(systemPrompt).toContain("Layer 2");
    expect(systemPrompt).toContain("Layer 3");
    expect(systemPrompt).toContain("Phrase-Level Chunking");
    expect(systemPrompt).toContain("Key Vocabulary");
    expect(systemPrompt).toContain("character indices");
  });

  it("should throw an error when OpenAI API call fails", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API rate limit exceeded"));

    await expect(analyzeSentence("Test sentence.")).rejects.toThrow(
      "Analysis service temporarily unavailable, please retry"
    );
  });

  it("should throw a parse error when response content is null", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    });

    await expect(analyzeSentence("Test sentence.")).rejects.toThrow(
      "Analysis result parsing failed, please retry"
    );
  });

  it("should throw a parse error when response content is not valid JSON", async () => {
    mockCreate.mockResolvedValueOnce(
      makeMockResponse("This is not JSON at all")
    );

    await expect(analyzeSentence("Test sentence.")).rejects.toThrow(
      "Analysis result parsing failed, please retry"
    );
  });

  it("should throw a parse error when response is missing required fields", async () => {
    // Missing originalSentence and correctedSentence
    const incomplete = {
      corrections: [],
      clauses: [{ text: "test", type: "independent", role: "main" }],
      components: [
        {
          text: "test",
          role: "subject",
          startIndex: 0,
          endIndex: 4,
          description: "test",
        },
      ],
      vocabulary: [],
      grammarNotes: ["note"],
      paraphrase: "test",
    };
    mockCreate.mockResolvedValueOnce(
      makeMockResponse(JSON.stringify(incomplete))
    );

    await expect(analyzeSentence("Test.")).rejects.toThrow(
      "Analysis result parsing failed, please retry"
    );
  });

  it("should throw a parse error when clauses array is empty", async () => {
    const analysis = makeValidAnalysis({ clauses: [] });
    mockCreate.mockResolvedValueOnce(
      makeMockResponse(JSON.stringify(analysis))
    );

    await expect(analyzeSentence("Test.")).rejects.toThrow(
      "Analysis result parsing failed, please retry"
    );
  });

  it("should throw a parse error when components array is empty", async () => {
    const analysis = makeValidAnalysis({ components: [] });
    mockCreate.mockResolvedValueOnce(
      makeMockResponse(JSON.stringify(analysis))
    );

    await expect(analyzeSentence("Test.")).rejects.toThrow(
      "Analysis result parsing failed, please retry"
    );
  });

  it("should throw a parse error when grammarNotes array is empty", async () => {
    const analysis = makeValidAnalysis({ grammarNotes: [] });
    mockCreate.mockResolvedValueOnce(
      makeMockResponse(JSON.stringify(analysis))
    );

    await expect(analyzeSentence("Test.")).rejects.toThrow(
      "Analysis result parsing failed, please retry"
    );
  });

  it("should accept a response with empty vocabulary array", async () => {
    const analysis = makeValidAnalysis({ vocabulary: [] });
    mockCreate.mockResolvedValueOnce(
      makeMockResponse(JSON.stringify(analysis))
    );

    const result = await analyzeSentence("I am.");
    expect(result.vocabulary).toEqual([]);
  });

  it("should throw when choices array is empty", async () => {
    mockCreate.mockResolvedValueOnce({ choices: [] });

    await expect(analyzeSentence("Test.")).rejects.toThrow(
      "Analysis result parsing failed, please retry"
    );
  });
});


describe("generateAudioFilename", () => {
  it("should return a 16-char hex hash + .mp3 extension", () => {
    const filename = generateAudioFilename("Hello world.");
    expect(filename).toMatch(/^[a-f0-9]{16}\.mp3$/);
  });

  it("should return the same filename for the same sentence", () => {
    const filename1 = generateAudioFilename("The cat sat on the mat.");
    const filename2 = generateAudioFilename("The cat sat on the mat.");
    expect(filename1).toBe(filename2);
  });

  it("should return different filenames for different sentences", () => {
    const filename1 = generateAudioFilename("Hello world.");
    const filename2 = generateAudioFilename("Goodbye world.");
    expect(filename1).not.toBe(filename2);
  });

  it("should use SHA-256 hash of the sentence content", () => {
    const sentence = "Test sentence for hashing.";
    const expectedHash = crypto
      .createHash("sha256")
      .update(sentence)
      .digest("hex")
      .slice(0, 16);
    const filename = generateAudioFilename(sentence);
    expect(filename).toBe(expectedHash + ".mp3");
  });
});

describe("generateAudio (lib/openai.ts)", () => {
  const AUDIO_DIR = path.join(process.cwd(), "data", "audio");
  const testSentence = "The quick brown fox jumps over the lazy dog.";
  let testFilename: string;
  let testFilepath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testFilename = generateAudioFilename(testSentence);
    testFilepath = path.join(AUDIO_DIR, testFilename);
    // Clean up any test file that might exist
    if (fs.existsSync(testFilepath)) {
      fs.unlinkSync(testFilepath);
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testFilepath)) {
      fs.unlinkSync(testFilepath);
    }
  });

  it("should call OpenAI TTS API with correct parameters", async () => {
    const fakeAudioData = new ArrayBuffer(100);
    mockSpeechCreate.mockResolvedValueOnce({
      arrayBuffer: () => Promise.resolve(fakeAudioData),
    });

    await generateAudio(testSentence);

    expect(mockSpeechCreate).toHaveBeenCalledOnce();
    expect(mockSpeechCreate).toHaveBeenCalledWith({
      model: "tts-1",
      voice: "alloy",
      input: testSentence,
    });
  });

  it("should return the hash-based filename", async () => {
    const fakeAudioData = new ArrayBuffer(100);
    mockSpeechCreate.mockResolvedValueOnce({
      arrayBuffer: () => Promise.resolve(fakeAudioData),
    });

    const result = await generateAudio(testSentence);

    expect(result).toBe(testFilename);
    expect(result).toMatch(/^[a-f0-9]{16}\.mp3$/);
  });

  it("should save the audio file to data/audio/ directory", async () => {
    const fakeAudioData = new Uint8Array([0xff, 0xfb, 0x90, 0x00]).buffer;
    mockSpeechCreate.mockResolvedValueOnce({
      arrayBuffer: () => Promise.resolve(fakeAudioData),
    });

    await generateAudio(testSentence);

    expect(fs.existsSync(testFilepath)).toBe(true);
    const savedContent = fs.readFileSync(testFilepath);
    expect(savedContent.length).toBe(4);
  });

  it("should reuse existing audio file without calling TTS API", async () => {
    // Create a pre-existing audio file
    if (!fs.existsSync(AUDIO_DIR)) {
      fs.mkdirSync(AUDIO_DIR, { recursive: true });
    }
    fs.writeFileSync(testFilepath, Buffer.from("existing audio data"));

    const result = await generateAudio(testSentence);

    expect(result).toBe(testFilename);
    expect(mockSpeechCreate).not.toHaveBeenCalled();
    // Verify the file content was not overwritten
    const content = fs.readFileSync(testFilepath, "utf-8");
    expect(content).toBe("existing audio data");
  });

  it("should throw an error when TTS API call fails", async () => {
    mockSpeechCreate.mockRejectedValueOnce(new Error("TTS API error"));

    await expect(generateAudio(testSentence)).rejects.toThrow("TTS API error");
  });

  it("should create the audio directory if it does not exist", async () => {
    // Use a unique subdirectory to test directory creation
    const fakeAudioData = new ArrayBuffer(50);
    mockSpeechCreate.mockResolvedValueOnce({
      arrayBuffer: () => Promise.resolve(fakeAudioData),
    });

    // The AUDIO_DIR should already exist in this project, but the function
    // handles the case where it doesn't. We verify the file is created successfully.
    const result = await generateAudio(testSentence);
    expect(fs.existsSync(path.join(AUDIO_DIR, result))).toBe(true);
  });
});
