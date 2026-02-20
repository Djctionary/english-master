// GET /api/sentences/[id] — Get a single sentence record by ID
// Requirements: 7.3

import { NextRequest, NextResponse } from "next/server";
import { initDatabase, getSentenceById, updateSentenceTag } from "@/lib/db";
import type { SentenceTag } from "@/lib/types";

export async function GET(
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

    initDatabase();
    const record = getSentenceById(id);

    if (!record) {
      return NextResponse.json(
        { error: "Sentence record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/sentences/[id] — Update a sentence record tag
export async function PATCH(
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

    let body: { tag?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!("tag" in body)) {
      return NextResponse.json(
        { error: "Missing tag in request body" },
        { status: 400 }
      );
    }

    let normalizedTag: SentenceTag | null;
    if (body.tag === null) {
      normalizedTag = null;
    } else if (body.tag && typeof body.tag === "object") {
      const candidate = body.tag as { type?: unknown; name?: unknown };
      const type =
        typeof candidate.type === "string" ? candidate.type.trim() : "";
      const name =
        typeof candidate.name === "string" ? candidate.name.trim() : "";

      if (!type || !name) {
        return NextResponse.json(
          { error: "Tag type and name must be non-empty strings" },
          { status: 400 }
        );
      }

      if (type.length > 40 || name.length > 100) {
        return NextResponse.json(
          { error: "Tag type or name is too long" },
          { status: 400 }
        );
      }

      normalizedTag = { type, name };
    } else {
      return NextResponse.json(
        { error: "Invalid tag format" },
        { status: 400 }
      );
    }

    initDatabase();
    const updated = updateSentenceTag(id, normalizedTag);

    if (!updated) {
      return NextResponse.json(
        { error: "Sentence record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
