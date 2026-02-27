// OpenAI Service Layer
// Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3

import OpenAI from "openai";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { AnalysisResult, analysisResultSchema } from "@/lib/types";
import { getAudioDir } from "@/lib/storage-paths";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  timeout: 60_000, // 60 seconds
});

const ANALYSIS_SYSTEM_PROMPT = `You are an expert English linguist and language teacher helping an English learner at CET-4 vocabulary level (~3500 words, roughly CEFR A2-B1, TOEFL score ~80). The learner is weak at pronunciation, listening, and complex/hard words. They want to deeply understand how English sentences are constructed.

All output must be in English.

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

Layer 3 — Key Vocabulary (focus on words ABOVE CET-4 level):
- Select words that are above CET-4 level (~3500 common English words). Include academic words, uncommon words, and words commonly confused by English learners.
- For each word, provide:
  - The word form as it appears
  - IPA phonetic transcription
  - Part of speech
  - A CONCISE definition (one clear sentence — not a multi-sentence explanation)
  - A usage note explaining how the word functions in this specific sentence
  - A difficulty reason explaining why this word is hard or important for English learners
  - One example sentence that best demonstrates the word's meaning, simple enough for CET-4 level learners

Layer 4 — Deep Structure Analysis:
Provide an accessible breakdown of how this sentence is constructed. Write in simple, clear language that a CET-4 level learner can understand.
- clauseConnections: Explain how the clauses in this sentence connect to each other. What type of connection is it (coordination with "and/but/or", subordination with "because/although/when/that", etc.)? Why does the author connect them this way? What logical relationship does it express?
- tenseLogic: Explain the tense(s) used in this sentence. Why is this tense chosen? What would change if a different tense were used? Keep the explanation simple and practical.
- phraseExplanations: Identify any notable phrases, idioms, fixed collocations, or phrasal verbs. Explain what they mean and how they work in this sentence.

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
    !parsed.paraphrase ||
    !parsed.structureAnalysis ||
    !parsed.structureAnalysis.clauseConnections ||
    !parsed.structureAnalysis.tenseLogic ||
    !parsed.structureAnalysis.phraseExplanations ||
    parsed.vocabulary.some((v) => !v.exampleSentence)
  ) {
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
 * Generates audio for an English sentence using OpenAI TTS API.
 * Uses SHA-256 hash-based filename and caches audio files to avoid regeneration.
 *
 * @param sentence - The English sentence to generate audio for
 * @returns The audio filename (e.g., "a1b2c3d4e5f6g7h8.mp3")
 * @throws Error if the OpenAI TTS API call fails or audio cannot be saved
 */
export async function generateAudio(sentence: string): Promise<string> {
  const audioDir = getAudioDir();
  const filename = generateAudioFilename(sentence);
  const filepath = path.join(audioDir, filename);

  // Reuse existing audio file if it already exists (Requirement 3.3)
  if (fs.existsSync(filepath)) {
    return filename;
  }

  // Ensure the audio directory exists
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
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
