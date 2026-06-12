import { NextRequest, NextResponse } from "next/server";
import { getProgressRows, initDatabase } from "@/lib/sentence-store";
import { getUserIdFromRequest } from "@/lib/request-user";
import { buildProgressData } from "@/lib/progress";

export async function GET(request: NextRequest) {
  try {
    await initDatabase();
    const userId = (await getUserIdFromRequest(request)) ?? undefined;

    const rows = await getProgressRows(userId);
    const data = buildProgressData(rows, new Date());

    return NextResponse.json(data);
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
