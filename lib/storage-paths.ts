import path from "path";

const LOCAL_DATA_DIR = path.join(process.cwd(), "data");
const SERVERLESS_DATA_DIR = path.join("/tmp", "data");

function isServerlessRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/**
 * Resolve writable app data directory.
 * Priority:
 * 1) DATA_DIR env var override
 * 2) /tmp/data for serverless runtimes (e.g., Vercel)
 * 3) ./data for local/dev environments
 */
export function getDataDir(): string {
  const dataDirOverride = process.env.DATA_DIR?.trim();
  if (dataDirOverride) return dataDirOverride;

  if (isServerlessRuntime()) {
    return SERVERLESS_DATA_DIR;
  }

  return LOCAL_DATA_DIR;
}

export function getDatabasePath(): string {
  return path.join(getDataDir(), "sentences.db");
}

export function getAudioDir(): string {
  return path.join(getDataDir(), "audio");
}
