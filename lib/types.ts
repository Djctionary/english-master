// Core TypeScript interfaces and types for Sentence Learning
// Requirements: 2.3, 3.2, 4.2

/**
 * Represents a single spelling or grammar correction applied to the original sentence.
 */
export interface Correction {
  /** The original text that was wrong */
  original: string;
  /** The corrected text */
  corrected: string;
  /** Brief reason for the correction */
  reason: string;
}

/**
 * Represents a clause identified in the sentence (Layer 1 — Clause Level).
 */
export interface Clause {
  /** The clause text */
  text: string;
  /** e.g., "independent", "relative clause", "adverbial clause" */
  type: string;
  /** e.g., "main clause", "modifies subject", "condition" */
  role: string;
}

/**
 * Represents a phrase-level grammar component (Layer 2 — Phrase/Chunk Level).
 */
export interface GrammarComponent {
  /** The exact text span of this chunk */
  text: string;
  /** Grammatical function: "subject", "predicate", "direct_object", etc. */
  role: string;
  /** Start character index (0-based, inclusive) */
  startIndex: number;
  /** End character index (exclusive) */
  endIndex: number;
  /** Brief explanation of its role */
  description: string;
}

/**
 * Represents a key vocabulary item (Layer 3 — Word Level).
 */
export interface VocabularyItem {
  /** Word as it appears in the sentence */
  word: string;
  /** IPA phonetic transcription */
  phonetic: string;
  /** Part of speech */
  partOfSpeech: string;
  /** Detailed multi-sentence definition */
  definition: string;
  /** How the word functions in this specific sentence */
  usageNote: string;
  /** Why this word is hard or important for English learners */
  difficultyReason: string;
  /** One example sentence demonstrating the word's meaning */
  exampleSentence: string;
}

/**
 * Deep sentence structure analysis (Layer 4 — Deep Structure Analysis).
 * Written in accessible language for CET-4 level learners.
 */
export interface StructureAnalysis {
  /** How clauses connect and why (coordination, subordination, logical relationships) */
  clauseConnections: string;
  /** Tense choices and reasoning — why this tense, what would change with another */
  tenseLogic: string;
  /** Phrases, idioms, fixed collocations explained */
  phraseExplanations: string;
}

/**
 * The complete multi-layer analysis result returned by the Sentence Analyzer.
 */
export interface AnalysisResult {
  /** The user's original input */
  originalSentence: string;
  /** The corrected version of the sentence */
  correctedSentence: string;
  /** List of corrections made */
  corrections: Correction[];
  /** Clause-level breakdown */
  clauses: Clause[];
  /** Phrase-level chunks (indices relative to correctedSentence) */
  components: GrammarComponent[];
  /** Key vocabulary items */
  vocabulary: VocabularyItem[];
  /** Deep structure analysis breakdown */
  structureAnalysis: StructureAnalysis;
  /** Notable grammar points */
  grammarNotes: string[];
  /** Overall meaning paraphrase */
  paraphrase: string;
}

/**
 * A contextual tag for memory cues (e.g., "Game: Arknights").
 */
export interface SentenceTag {
  /** Category type, e.g., "Game", "Music" */
  type: string;
  /** Specific source name, e.g., "Arknights" */
  name: string;
}

/**
 * A complete sentence record stored in the database.
 */
export interface SentenceRecord {
  id: number;
  /** Original English sentence */
  sentence: string;
  /** Corrected version of the sentence */
  correctedSentence: string;
  /** Analysis result (stored as JSON in DB) */
  analysis: AnalysisResult;
  /** Audio filename (null if TTS failed) */
  audioFilename: string | null;
  /** Optional context tag selected/created by the user */
  tag?: SentenceTag | null;
  /** ISO 8601 timestamp */
  createdAt: string;
}

/**
 * JSON Schema for OpenAI Structured Outputs (response_format: { type: "json_schema" }).
 * Enforces the AnalysisResult structure in GPT API responses.
 */
export const analysisResultSchema = {
  name: "analysis_result",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      originalSentence: {
        type: "string" as const,
        description: "The user's original input sentence",
      },
      correctedSentence: {
        type: "string" as const,
        description: "The corrected version of the sentence",
      },
      corrections: {
        type: "array" as const,
        description: "List of spelling/grammar corrections made",
        items: {
          type: "object" as const,
          properties: {
            original: {
              type: "string" as const,
              description: "The original text that was wrong",
            },
            corrected: {
              type: "string" as const,
              description: "The corrected text",
            },
            reason: {
              type: "string" as const,
              description: "Brief reason for the correction",
            },
          },
          required: ["original", "corrected", "reason"],
          additionalProperties: false,
        },
      },
      clauses: {
        type: "array" as const,
        description: "Clause-level breakdown of the sentence",
        items: {
          type: "object" as const,
          properties: {
            text: {
              type: "string" as const,
              description: "The clause text",
            },
            type: {
              type: "string" as const,
              description:
                "Clause type, e.g., independent, relative clause, adverbial clause",
            },
            role: {
              type: "string" as const,
              description:
                "Role of the clause, e.g., main clause, modifies subject, condition",
            },
          },
          required: ["text", "type", "role"],
          additionalProperties: false,
        },
      },
      components: {
        type: "array" as const,
        description: "Phrase-level grammar components/chunks (indices relative to correctedSentence)",
        items: {
          type: "object" as const,
          properties: {
            text: {
              type: "string" as const,
              description: "The exact text span of this chunk",
            },
            role: {
              type: "string" as const,
              description:
                "Grammatical function: subject, predicate, direct_object, etc.",
            },
            startIndex: {
              type: "number" as const,
              description: "Start character index (0-based, inclusive)",
            },
            endIndex: {
              type: "number" as const,
              description: "End character index (exclusive)",
            },
            description: {
              type: "string" as const,
              description: "Brief explanation of its role in the sentence",
            },
          },
          required: ["text", "role", "startIndex", "endIndex", "description"],
          additionalProperties: false,
        },
      },
      vocabulary: {
        type: "array" as const,
        description: "Key vocabulary items (B2+ level, difficult/uncommon words)",
        items: {
          type: "object" as const,
          properties: {
            word: {
              type: "string" as const,
              description: "Word as it appears in the sentence",
            },
            phonetic: {
              type: "string" as const,
              description: "IPA phonetic transcription",
            },
            partOfSpeech: {
              type: "string" as const,
              description: "Part of speech",
            },
            definition: {
              type: "string" as const,
              description: "Detailed multi-sentence definition",
            },
            usageNote: {
              type: "string" as const,
              description:
                "How the word functions in this specific sentence",
            },
            difficultyReason: {
              type: "string" as const,
              description:
                "Why this word is hard or important for English learners",
            },
            exampleSentence: {
              type: "string" as const,
              description:
                "One example sentence demonstrating the word's meaning",
            },
          },
          required: [
            "word",
            "phonetic",
            "partOfSpeech",
            "definition",
            "usageNote",
            "difficultyReason",
            "exampleSentence",
          ],
          additionalProperties: false,
        },
      },
      structureAnalysis: {
        type: "object" as const,
        description: "Deep sentence structure analysis for CET-4 level learners",
        properties: {
          clauseConnections: {
            type: "string" as const,
            description: "How clauses connect and why (coordination, subordination, logical relationships)",
          },
          tenseLogic: {
            type: "string" as const,
            description: "Tense choices and reasoning — why this tense is used",
          },
          phraseExplanations: {
            type: "string" as const,
            description: "Phrases, idioms, fixed collocations explained",
          },
        },
        required: ["clauseConnections", "tenseLogic", "phraseExplanations"],
        additionalProperties: false,
      },
      grammarNotes: {
        type: "array" as const,
        description:
          "Notable grammar points (tenses, voice, mood, notable constructions)",
        items: {
          type: "string" as const,
        },
      },
      paraphrase: {
        type: "string" as const,
        description:
          "Overall meaning of the sentence in one clear paraphrase",
      },
    },
    required: [
      "originalSentence",
      "correctedSentence",
      "corrections",
      "clauses",
      "components",
      "vocabulary",
      "structureAnalysis",
      "grammarNotes",
      "paraphrase",
    ],
    additionalProperties: false,
  },
} as const;
