// OpenAI Service Layer
// Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3

import OpenAI from "openai";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { AnalysisResult, analysisResultSchema } from "@/lib/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  timeout: 60_000, // 60 seconds
});

const ANALYSIS_SYSTEM_PROMPT = `You are an expert English linguist and language teacher helping a TOEFL-level English learner (score ~80) who is weak at pronunciation, listening, and complex/hard words.

Step 0 — Grammar & Spelling Correction:
- Check the input sentence for spelling and grammar errors.
- Produce a minimally corrected version: fix ONLY spelling and grammar errors. Do NOT change the user's word choices, sentence structure, or meaning.
- List each correction: the original text, the corrected text, and a brief reason.
- If no errors are found, set the corrected sentence equal to the original and return an empty corrections list.

Then analyze the CORRECTED sentence using a multi-layer approach:

Layer 1 — Clause Structure:
- Identify each clause (main and subordinate). For each clause, state its type (e.g., independent, relative clause, adverbial clause, noun clause) and its role in the sentence.

Layer 2 — Phrase-Level Chunking:
- Break the corrected sentence into functional phrases/chunks: subject, predicate (verb group), object (direct/indirect), complement, adverbial, prepositional phrase, etc.
- For each chunk, provide:
  - The exact text span
  - The start and end character indices (0-based, inclusive start, exclusive end) — indices are relative to the CORRECTED sentence
  - The grammatical function (e.g., "subject", "main verb", "direct object", "adverbial of time")
  - A brief explanation of its role in the sentence

Layer 3 — Key Vocabulary (focus on DIFFICULT words):
- Select words that are difficult, uncommon, or complex: B2+ level, academic words, words commonly confused by TOEFL-level learners.
- For each word, provide:
  - The word form as it appears
  - IPA phonetic transcription
  - Part of speech
  - A DETAILED definition (2-3 sentences, not just a one-liner)
  - A usage note explaining how the word functions in this specific sentence
  - A difficulty reason explaining why this word is hard or important for English learners

Also provide:
- A list of grammar points worth noting (tenses, voice, mood, notable constructions)
- The overall meaning of the sentence in one clear paraphrase

Be precise with character indices relative to the corrected sentence. Do not skip any part of the corrected sentence in the phrase-level chunking — every word must belong to exactly one chunk.`;

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
    response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Analysis result parsing failed, please retry");
  }

  let parsed: AnalysisResult;
  try {
    parsed = JSON.parse(content) as AnalysisResult;
  } catch {
    throw new Error("Analysis result parsing failed, please retry");
  }

  // Validate essential fields are present and non-empty
  if (
    !parsed.originalSentence ||
    !parsed.correctedSentence ||
    !Array.isArray(parsed.corrections) ||
    !Array.isArray(parsed.clauses) ||
    parsed.clauses.length === 0 ||
    !Array.isArray(parsed.components) ||
    parsed.components.length === 0 ||
    !Array.isArray(parsed.vocabulary) ||
    !Array.isArray(parsed.grammarNotes) ||
    parsed.grammarNotes.length === 0 ||
    !parsed.paraphrase
  ) {
    throw new Error("Analysis result parsing failed, please retry");
  }

  return parsed;
}

/** Directory where audio files are stored */
const AUDIO_DIR = path.join(process.cwd(), "data", "audio");

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
 * Generates audio for an English sentence using OpenAI TTS API.
 * Uses SHA-256 hash-based filename and caches audio files to avoid regeneration.
 *
 * @param sentence - The English sentence to generate audio for
 * @returns The audio filename (e.g., "a1b2c3d4e5f6g7h8.mp3")
 * @throws Error if the OpenAI TTS API call fails or audio cannot be saved
 */
export async function generateAudio(sentence: string): Promise<string> {
  const filename = generateAudioFilename(sentence);
  const filepath = path.join(AUDIO_DIR, filename);

  // Reuse existing audio file if it already exists (Requirement 3.3)
  if (fs.existsSync(filepath)) {
    return filename;
  }

  // Ensure the audio directory exists
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }

  // Call OpenAI TTS API (Requirement 3.1)
  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: sentence,
  });

  // Convert response to Buffer and save to filesystem (Requirement 3.2)
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(filepath, buffer);

  return filename;
}
