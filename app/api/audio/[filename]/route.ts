// GET /api/audio/[filename] — Serve audio file stream
// Requirements: 7.4

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAudioDir } from "@/lib/storage-paths";

/** Valid audio filename pattern: 1+ hex chars followed by .mp3 */
const FILENAME_PATTERN = /^[a-f0-9]+\.mp3$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Security: reject path traversal and invalid filenames
    if (
      !filename ||
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\") ||
      !FILENAME_PATTERN.test(filename)
    ) {
      return NextResponse.json(
        { error: "Audio file not found" },
        { status: 404 }
      );
    }

    const filepath = path.join(getAudioDir(), filename);

    if (!fs.existsSync(filepath)) {
      return NextResponse.json(
        { error: "Audio file not found" },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(filepath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
