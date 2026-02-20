import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { GET } from "@/app/api/audio/[filename]/route";

const AUDIO_DIR = path.join(process.cwd(), "data", "audio");
const TEST_FILENAME = "a1b2c3d4e5f6a7b8.mp3";
const TEST_FILEPATH = path.join(AUDIO_DIR, TEST_FILENAME);
const TEST_AUDIO_CONTENT = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x01, 0x02]);

function buildRequest(filename: string) {
  const url = `http://localhost:3000/api/audio/${filename}`;
  const request = new NextRequest(url);
  const params = Promise.resolve({ filename });
  return { request, params };
}

describe("GET /api/audio/[filename]", () => {
  beforeEach(() => {
    if (!fs.existsSync(AUDIO_DIR)) {
      fs.mkdirSync(AUDIO_DIR, { recursive: true });
    }
    fs.writeFileSync(TEST_FILEPATH, TEST_AUDIO_CONTENT);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_FILEPATH)) {
      fs.unlinkSync(TEST_FILEPATH);
    }
  });

  it("should return audio file with correct Content-Type", async () => {
    const { request, params } = buildRequest(TEST_FILENAME);
    const res = await GET(request, { params });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(res.headers.get("Content-Length")).toBe(
      TEST_AUDIO_CONTENT.length.toString()
    );

    const body = await res.arrayBuffer();
    expect(Buffer.from(body)).toEqual(TEST_AUDIO_CONTENT);
  });

  it("should return 404 for non-existent file", async () => {
    const { request, params } = buildRequest("0000000000000000.mp3");
    const res = await GET(request, { params });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Audio file not found");
  });

  it("should return 404 for path traversal attempt with ..", async () => {
    const { request, params } = buildRequest("../etc/passwd");
    const res = await GET(request, { params });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Audio file not found");
  });

  it("should return 404 for filename with forward slash", async () => {
    const { request, params } = buildRequest("sub/a1b2c3d4e5f6a7b8.mp3");
    const res = await GET(request, { params });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Audio file not found");
  });

  it("should return 404 for filename with backslash", async () => {
    const { request, params } = buildRequest("sub\\a1b2c3d4e5f6a7b8.mp3");
    const res = await GET(request, { params });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Audio file not found");
  });

  it("should return 404 for non-hex filename", async () => {
    const { request, params } = buildRequest("notahexname.mp3");
    const res = await GET(request, { params });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Audio file not found");
  });

  it("should return 404 for non-mp3 extension", async () => {
    const { request, params } = buildRequest("a1b2c3d4e5f6a7b8.wav");
    const res = await GET(request, { params });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Audio file not found");
  });

  it("should return 404 for empty filename", async () => {
    const { request, params } = buildRequest("");
    const res = await GET(request, { params });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Audio file not found");
  });

  it("should return 500 when filesystem throws an error", async () => {
    const spy = vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("EACCES: permission denied");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { request, params } = buildRequest(TEST_FILENAME);
    const res = await GET(request, { params });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Internal server error");

    spy.mockRestore();
    consoleSpy.mockRestore();
  });
});
