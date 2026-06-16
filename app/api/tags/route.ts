// GET /api/tags — Distinct tags across the user's whole library
// (independent of pagination/search), so tag pickers stay in sync.

import { NextRequest, NextResponse } from "next/server";
import { initDatabase, getDistinctTags } from "@/lib/sentence-store";
import { getUserIdFromRequest } from "@/lib/request-user";

export async function GET(request: NextRequest) {
  try {
    await initDatabase();
    const userId = (await getUserIdFromRequest(request)) ?? undefined;

    const tags = await getDistinctTags(userId);
    return NextResponse.json(tags);
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
