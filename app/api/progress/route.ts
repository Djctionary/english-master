import { NextRequest, NextResponse } from "next/server";
import {
  getDueSnapshots,
  getProgressRows,
  initDatabase,
  recordDueSnapshot,
} from "@/lib/sentence-store";
import { getUserIdFromRequest } from "@/lib/request-user";
import { buildProgressData, PROGRESS_PAST_DAYS, windowStartKey } from "@/lib/progress";

export async function GET(request: NextRequest) {
  try {
    await initDatabase();
    const userId = (await getUserIdFromRequest(request)) ?? undefined;

    const now = new Date();
    const rows = await getProgressRows(userId);
    const dueLog = await getDueSnapshots(windowStartKey(now, PROGRESS_PAST_DAYS), userId);
    const data = buildProgressData(rows, now, PROGRESS_PAST_DAYS, dueLog);

    // Log today's due count so it becomes history on future visits.
    const todayKey = new Date(now).toISOString().slice(0, 10);
    await recordDueSnapshot(todayKey, data.dueCount, userId);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
