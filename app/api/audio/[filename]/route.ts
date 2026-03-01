// GET /api/audio/[filename] — Serve audio file stream
// Requirements: 7.4

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAudioDir } from "@/lib/storage-paths";
import { generateAudio } from "@/lib/openai";
import {
  getSentenceByAudioFilename,
  initDatabase,
} from "@/lib/sentence-store";

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

    // In serverless environments the filesystem is ephemeral. If the MP3 is missing,
    // recover by regenerating from the persisted sentence record.
    if (!fs.existsSync(filepath)) {
      await initDatabase();
      const record = await getSentenceByAudioFilename(filename);

      if (!record) {
        return NextResponse.json(
          { error: "Audio file not found" },
          { status: 404 }
        );
      }

      try {
        await generateAudio(record.correctedSentence);
      } catch {
        return NextResponse.json(
          { error: "Audio generation failed" },
          { status: 502 }
        );
      }
    }

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
