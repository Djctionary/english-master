import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_LEARNER_ID } from "@/lib/review";
import { initDatabase, submitSentenceReview } from "@/lib/sentence-store";
import type { ReviewResult } from "@/lib/types";

function isReviewResult(value: unknown): value is ReviewResult {
  return value === "full" || value === "partial" || value === "missed";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Invalid sentence ID" },
        { status: 400 }
      );
    }

    let body: { result?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!isReviewResult(body.result)) {
      return NextResponse.json(
        { error: "Invalid review result" },
        { status: 400 }
      );
    }

    await initDatabase();
    const state = await submitSentenceReview(id, body.result, {
      learnerId: DEFAULT_LEARNER_ID,
    });

    if (!state) {
      return NextResponse.json(
        { error: "Sentence record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(state);
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
