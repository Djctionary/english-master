// GET /api/sentences — List/search sentence records with optional pagination
// Requirements: 5.2, 7.2

import { NextRequest, NextResponse } from "next/server";
import { initDatabase, searchSentences, getAllSentences } from "@/lib/sentence-store";

export async function GET(request: NextRequest) {
  try {
    await initDatabase();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const tagType = searchParams.get("tagType") ?? undefined;
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    // If any search/pagination params provided, use searchSentences
    if (q !== undefined || tagType !== undefined || limit !== null || offset !== null) {
      const result = await searchSentences({
        query: q,
        tagType,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      });
      return NextResponse.json(result);
    }

    // Backward compatible: no params returns flat array
    const sentences = await getAllSentences();
    return NextResponse.json(sentences);
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
