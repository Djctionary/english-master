// GET /api/audio/[filename] — Serve audio MP3 from the database.
// Audio binaries are stored in the `sentences.audio_data` column so they
// survive serverless cold starts (previously a critical bug: files on
// ephemeral /tmp were wiped between invocations, causing silent ElevenLabs
// regeneration on every playback).

import { NextRequest, NextResponse } from "next/server";
import { generateAudio } from "@/lib/openai";
import {
  getAudioByFilename,
  initDatabase,
  saveAudioData,
} from "@/lib/sentence-store";

/** Valid audio filename pattern: 1+ hex chars followed by .mp3 */
const FILENAME_PATTERN = /^[a-f0-9]+\.mp3$/;

function audioResponse(data: Buffer): NextResponse {
  const body = new Uint8Array(data);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": data.length.toString(),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

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

    await initDatabase();
    const record = await getAudioByFilename(filename);

    if (!record) {
      return NextResponse.json(
        { error: "Audio file not found" },
        { status: 404 }
      );
    }

    if (record.data && record.data.length > 0) {
      return audioResponse(record.data);
    }

    // Legacy record with no persisted binary — regenerate once, cache forever.
    let audio;
    try {
      audio = await generateAudio(record.correctedSentence);
    } catch {
      return NextResponse.json(
        { error: "Audio generation failed" },
        { status: 502 }
      );
    }

    await saveAudioData(filename, audio.data);
    return audioResponse(audio.data);
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
