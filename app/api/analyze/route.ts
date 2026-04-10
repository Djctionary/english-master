// POST /api/analyze — Analyze an English sentence
// Requirements: 1.1, 1.2, 2.1, 3.1, 3.4, 5.1, 5.3, 7.1

import { NextRequest, NextResponse } from "next/server";
import {
  findSentenceByText,
  insertSentence,
  initDatabase,
  updateSentenceAnalysis,
} from "@/lib/sentence-store";
import { analyzeSentence, generateAudio } from "@/lib/openai";
import { getUserIdFromRequest } from "@/lib/request-user";
import type { SentenceRecord } from "@/lib/types";

export async function POST(request: NextRequest) {
  // Step 1: Parse request body and validate input
  let body: { sentence?: string; force?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Sentence cannot be empty" },
      { status: 400 }
    );
  }

  const sentence = body.sentence;
  const forceRegenerate = body.force === true;

  // Reject blank/whitespace-only input (Requirement 1.2)
  if (!sentence || typeof sentence !== "string" || sentence.trim().length === 0) {
    return NextResponse.json(
      { error: "Sentence cannot be empty" },
      { status: 400 }
    );
  }

  const trimmedSentence = sentence.trim();

  try {
    // Ensure database is initialized
    await initDatabase();
    const userId = await getUserIdFromRequest(request) ?? undefined;

    // Step 2: Check DB for existing sentence — return cached if found (Requirement 5.3)
    const existing = await findSentenceByText(trimmedSentence, userId);
    if (existing && !forceRegenerate) {
      return NextResponse.json(existing);
    }

    // Step 3: Call analyzeSentence (Requirement 2.1)
    let analysis;
    try {
      analysis = await analyzeSentence(trimmedSentence);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Analysis service temporarily unavailable, please retry";

      // Distinguish between parse errors and API failures — both return 502
      if (message.includes("parsing failed")) {
        return NextResponse.json(
          { error: "Analysis result parsing failed, please retry" },
          { status: 502 }
        );
      }
      return NextResponse.json(
        { error: "Analysis service temporarily unavailable, please retry" },
        { status: 502 }
      );
    }

    // Step 4: Call generateAudio — handle TTS failure gracefully (Requirement 3.4)
    let audioFilename: string | null = null;
    try {
      audioFilename = await generateAudio(analysis.correctedSentence);
    } catch {
      // TTS failure is non-fatal — audioFilename stays null (degraded mode)
      audioFilename = null;
    }

    // Step 5: Store record in database (Requirement 5.1)
    if (existing) {
      const updated = await updateSentenceAnalysis(existing.id, {
        correctedSentence: analysis.correctedSentence,
        analysis,
        audioFilename,
      });

      if (!updated) {
        throw new Error("Failed to update sentence analysis");
      }

      return NextResponse.json(updated);
    }

    const record: Omit<SentenceRecord, "id"> = {
      sentence: trimmedSentence,
      correctedSentence: analysis.correctedSentence,
      analysis,
      audioFilename,
      tag: null,
      createdAt: new Date().toISOString(),
    };

    const savedRecord = await insertSentence(record, userId);

    // Step 6: Return the SentenceRecord
    return NextResponse.json(savedRecord);
  } catch (error) {
    // Database operation failure (Requirement 7.5)
    console.error("Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
