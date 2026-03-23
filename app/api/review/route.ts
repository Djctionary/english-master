import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_LEARNER_ID } from "@/lib/review";
import { getReviewQueue, initDatabase } from "@/lib/sentence-store";

export async function GET(request: NextRequest) {
  try {
    await initDatabase();

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
      return NextResponse.json(
        { error: "Invalid limit" },
        { status: 400 }
      );
    }

    const queue = await getReviewQueue({
      learnerId: DEFAULT_LEARNER_ID,
      limit,
    });

    return NextResponse.json(queue);
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
