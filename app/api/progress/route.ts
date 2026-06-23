import { NextRequest, NextResponse } from "next/server";
import {
  getProgressRows,
  getReviewCounts,
  initDatabase,
} from "@/lib/sentence-store";
import { getUserIdFromRequest } from "@/lib/request-user";
import { buildProgressData, PROGRESS_PAST_DAYS, windowStartKey } from "@/lib/progress";

export async function GET(request: NextRequest) {
  try {
    await initDatabase();
    const userId = (await getUserIdFromRequest(request)) ?? undefined;

    const now = new Date();
    const rows = await getProgressRows(userId);
    const reviewLog = await getReviewCounts(windowStartKey(now, PROGRESS_PAST_DAYS), userId);
    const data = buildProgressData(rows, now, PROGRESS_PAST_DAYS, reviewLog);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
