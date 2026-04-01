// OpenAI Service Layer
// Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3

import OpenAI from "openai";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { AnalysisResult, analysisResultSchema } from "@/lib/types";
import { getAudioDir } from "@/lib/storage-paths";

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (openaiClient) return openaiClient;

  const apiKey =
    process.env.OPENAI_API_KEY?.trim() ||
    (process.env.NODE_ENV === "test" ? "test-key" : "");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  openaiClient = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    timeout: 60_000, // 60 seconds
  });

  return openaiClient;
}

const ANALYSIS_MODEL = process.env.ANALYSIS_MODEL ?? "gpt-4.1-mini";

const ANALYSIS_SYSTEM_PROMPT = `Analyze an English sentence for a CET-6 learner. All output in English. Follow the JSON schema exactly.

Step 0 — Correct spelling/grammar only. Keep word choices and structure. List each correction.

Step 1 — Clauses: identify each clause with type and role.

Step 2 — Phrase-level chunking of CORRECTED sentence: exact text (copied verbatim), grammatical role. Cover every word in exactly one chunk. Leave description empty string.

Step 3 — Vocabulary (above CET-6): word, IPA, POS, concise definition (1 sentence), usage note, example sentence, and 2-4 common collocations (e.g. "rain heavily", "breathe heavily"). Set difficultyReason to empty string.

Step 4 — Structure analysis: set clauseConnections, tenseLogic, phraseExplanations all to empty string.

Step 5 — Paraphrase: one clear rephrasing of the meaning.

Step 6 — Sentence pattern: abstract reusable pattern, e.g. "Although [condition], [S] [V] [O] that [relative clause] [location]".

Step 7 — Sentence skeleton:
- core: bare subject+verb+object sentence
- layers: each adds info. Format: {label: "when"/"which"/"where"/"why"/"how"/etc., added: "actual text from sentence", explanation: "what this adds to meaning"}
Example for "Although it was raining heavily, she bought a book that I had never seen before at the small bookstore around the corner.":
  core: "She bought a book."
  layers: [{label:"when", added:"Although it was raining heavily", explanation:"sets up contrast: despite bad weather"}, {label:"which", added:"that I had never seen before", explanation:"specifies: it was an unfamiliar book"}, {label:"where", added:"at the small bookstore around the corner", explanation:"location detail"}]

Step 8 — Grammar notes: return empty array.`;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasAnalysisResultShape(value: unknown): value is AnalysisResult {
  if (!isObject(value)) return false;

  if (typeof value.originalSentence !== "string") return false;
  if (typeof value.correctedSentence !== "string") return false;
  if (!Array.isArray(value.corrections)) return false;
  if (!Array.isArray(value.clauses)) return false;
  if (!Array.isArray(value.components)) return false;
  if (!Array.isArray(value.vocabulary)) return false;
  if (!Array.isArray(value.grammarNotes)) return false;
  if (!value.grammarNotes.every((note: unknown) => typeof note === "string")) return false;
  if (typeof value.paraphrase !== "string") return false;

  if (!isObject(value.structureAnalysis)) return false;
  if (typeof value.structureAnalysis.clauseConnections !== "string") return false;
  if (typeof value.structureAnalysis.tenseLogic !== "string") return false;
  if (typeof value.structureAnalysis.phraseExplanations !== "string") return false;

  // Keep vocabulary entry shape checks lightweight but strict enough for rendering.
  if (
    !value.vocabulary.every(
      (v: unknown) =>
        isObject(v) &&
        typeof v.word === "string" &&
        typeof v.phonetic === "string" &&
        typeof v.partOfSpeech === "string" &&
        typeof v.definition === "string" &&
        typeof v.usageNote === "string" &&
        typeof v.difficultyReason === "string" &&
        typeof v.exampleSentence === "string"
    )
  ) {
    return false;
  }

  // New fields are optional for backward compatibility with stored records.
  if (value.simplifiedVersion !== undefined && typeof value.simplifiedVersion !== "string") return false;
  if (value.sentencePattern !== undefined && typeof value.sentencePattern !== "string") return false;
  if (value.sentenceSkeleton !== undefined) {
    if (!isObject(value.sentenceSkeleton)) return false;
    if (typeof value.sentenceSkeleton.core !== "string") return false;
    if (!Array.isArray(value.sentenceSkeleton.layers)) return false;
  }

  return true;
}

/**
 * Analyzes an English sentence using OpenAI Chat Completions API with structured outputs.
 * Returns a multi-layer analysis result containing clause structure, phrase-level grammar
 * components, key vocabulary, grammar notes, and a paraphrase.
 *
 * @param sentence - The English sentence to analyze
 * @returns The structured analysis result
 * @throws Error if the OpenAI API call fails or returns invalid data
 */
export async function analyzeSentence(
  sentence: string
): Promise<AnalysisResult> {
  let response;
  try {
    response = await getOpenAIClient().chat.completions.create({
      model: ANALYSIS_MODEL,
      messages: [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: sentence },
      ],
      response_format: {
        type: "json_schema",
        json_schema: analysisResultSchema,
      },
    });
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error(
      `Analysis service temporarily unavailable, please retry`
    );
  }

  const choice = response.choices[0];
  const content = choice?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    console.error("OpenAI analysis parsing error: empty response content", {
      finishReason: choice?.finish_reason,
      refusal:
        typeof (choice?.message as { refusal?: unknown } | undefined)?.refusal ===
        "string"
          ? (choice?.message as { refusal?: string }).refusal
          : null,
    });
    throw new Error("Analysis result parsing failed, please retry");
  }

  let parsed: AnalysisResult;
  try {
    parsed = JSON.parse(content) as AnalysisResult;
  } catch {
    console.error("OpenAI analysis parsing error: invalid JSON content", {
      contentPreview: content.slice(0, 500),
    });
    throw new Error("Analysis result parsing failed, please retry");
  }

  if (!hasAnalysisResultShape(parsed)) {
    console.error("OpenAI analysis parsing error: shape validation failed", {
      parsedPreview: JSON.stringify(parsed).slice(0, 500),
    });
    throw new Error("Analysis result parsing failed, please retry");
  }

  return parsed;
}

/**
 * Generates a SHA-256 hash-based filename for a given sentence.
 * Uses the first 16 hex characters of the hash + ".mp3".
 *
 * @param sentence - The sentence to hash
 * @returns The generated filename (e.g., "a1b2c3d4e5f6g7h8.mp3")
 */
export function generateAudioFilename(sentence: string): string {
  const hash = crypto.createHash("sha256").update(sentence).digest("hex");
  return hash.slice(0, 16) + ".mp3";
}

/**
 * Generates audio for an English sentence using ElevenLabs TTS API (Turbo v2.5).
 * Uses SHA-256 hash-based filename and caches audio files to avoid regeneration.
 *
 * @param sentence - The English sentence to generate audio for
 * @returns The audio filename (e.g., "a1b2c3d4e5f6g7h8.mp3")
 * @throws Error if the ElevenLabs TTS API call fails or audio cannot be saved
 */
export async function generateAudio(sentence: string): Promise<string> {
  const audioDir = getAudioDir();
  const filename = generateAudioFilename(sentence);
  const filepath = path.join(audioDir, filename);

  // Reuse existing audio file if it already exists
  if (fs.existsSync(filepath)) {
    return filename;
  }

  // Ensure the audio directory exists
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenLabsKey) {
    throw new Error("ELEVENLABS_API_KEY is missing");
  }

  // Use "Sarah" voice — mature, confident, natural conversational English
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL";

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: sentence,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown");
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(filepath, buffer);

  return filename;
}
