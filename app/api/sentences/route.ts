// GET /api/sentences — List all sentence records
// Requirements: 5.2, 7.2

import { NextResponse } from "next/server";
import { initDatabase, getAllSentences } from "@/lib/sentence-store";

export async function GET() {
  try {
    await initDatabase();
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
