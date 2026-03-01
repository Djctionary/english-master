import type { AnalysisResult, SentenceRecord, SentenceTag } from "@/lib/types";
import * as sqliteDb from "@/lib/db";
import { Pool } from "pg";

type Provider = "sqlite" | "postgres";

type PgPool = Pool;

type PostgresSentenceRow = {
  id: number;
  sentence: string;
  corrected_sentence: string;
  analysis: string;
  audio_filename: string | null;
  tag_type: string | null;
  tag_name: string | null;
  created_at: string | Date;
};

let postgresPool: PgPool | null = null;
let postgresInitPromise: Promise<void> | null = null;

function resolveProvider(): Provider {
  const forcedProvider = process.env.DATASTORE_PROVIDER?.trim().toLowerCase();
  if (forcedProvider === "sqlite" || forcedProvider === "postgres") {
    return forcedProvider;
  }

  if (process.env.NODE_ENV === "test") {
    return "sqlite";
  }

  return process.env.DATABASE_URL?.trim() ? "postgres" : "sqlite";
}

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "Postgres provider selected, but DATABASE_URL is missing. Set DATABASE_URL or use DATASTORE_PROVIDER=sqlite."
    );
  }
  return databaseUrl;
}

function getPostgresPool(): PgPool {
  if (postgresPool) return postgresPool;

  postgresPool = new Pool({
    connectionString: getDatabaseUrl(),
  });
  return postgresPool;
}

function normalizeCreatedAt(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return value;
}

function toSentenceRecord(row: PostgresSentenceRow): SentenceRecord {
  return {
    id: Number(row.id),
    sentence: row.sentence,
    correctedSentence: row.corrected_sentence,
    analysis: JSON.parse(row.analysis) as AnalysisResult,
    audioFilename: row.audio_filename,
    tag:
      row.tag_type && row.tag_name
        ? { type: row.tag_type, name: row.tag_name }
        : null,
    createdAt: normalizeCreatedAt(row.created_at),
  };
}

async function initPostgresSchema(): Promise<void> {
  if (postgresInitPromise) {
    return postgresInitPromise;
  }

  postgresInitPromise = (async () => {
    const pool = getPostgresPool();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sentences (
        id SERIAL PRIMARY KEY,
        sentence TEXT NOT NULL UNIQUE,
        corrected_sentence TEXT NOT NULL,
        analysis TEXT NOT NULL,
        audio_filename TEXT,
        tag_type TEXT,
        tag_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(
      `ALTER TABLE sentences ADD COLUMN IF NOT EXISTS corrected_sentence TEXT`
    );
    await pool.query(
      `ALTER TABLE sentences ADD COLUMN IF NOT EXISTS tag_type TEXT`
    );
    await pool.query(
      `ALTER TABLE sentences ADD COLUMN IF NOT EXISTS tag_name TEXT`
    );

    await pool.query(
      `UPDATE sentences SET corrected_sentence = sentence WHERE corrected_sentence IS NULL`
    );
    await pool.query(
      `UPDATE sentences SET tag_type = NULL, tag_name = NULL WHERE tag_type IS NULL OR tag_name IS NULL`
    );
  })();

  try {
    await postgresInitPromise;
  } catch (error) {
    postgresInitPromise = null;
    throw error;
  }
}

export async function initDatabase(): Promise<void> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    return;
  }

  sqliteDb.initDatabase();
}

export async function findSentenceByText(
  sentence: string
): Promise<SentenceRecord | undefined> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<PostgresSentenceRow>(
      `SELECT id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at
       FROM sentences
       WHERE sentence = $1
       LIMIT 1`,
      [sentence]
    );

    if (result.rows.length === 0) return undefined;
    return toSentenceRecord(result.rows[0]);
  }

  return sqliteDb.findSentenceByText(sentence);
}

export async function insertSentence(
  record: Omit<SentenceRecord, "id">
): Promise<SentenceRecord> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<PostgresSentenceRow>(
      `INSERT INTO sentences (sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at`,
      [
        record.sentence,
        record.correctedSentence,
        JSON.stringify(record.analysis),
        record.audioFilename,
        record.tag?.type ?? null,
        record.tag?.name ?? null,
        record.createdAt,
      ]
    );

    return toSentenceRecord(result.rows[0]);
  }

  return sqliteDb.insertSentence(record);
}

export async function getAllSentences(): Promise<SentenceRecord[]> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<PostgresSentenceRow>(
      `SELECT id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at
       FROM sentences
       ORDER BY created_at DESC, id DESC`
    );

    return result.rows.map(toSentenceRecord);
  }

  return sqliteDb.getAllSentences();
}

export async function getSentenceById(
  id: number
): Promise<SentenceRecord | undefined> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<PostgresSentenceRow>(
      `SELECT id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at
       FROM sentences
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) return undefined;
    return toSentenceRecord(result.rows[0]);
  }

  return sqliteDb.getSentenceById(id);
}

export async function getSentenceByAudioFilename(
  audioFilename: string
): Promise<SentenceRecord | undefined> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<PostgresSentenceRow>(
      `SELECT id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at
       FROM sentences
       WHERE audio_filename = $1
       LIMIT 1`,
      [audioFilename]
    );

    if (result.rows.length === 0) return undefined;
    return toSentenceRecord(result.rows[0]);
  }

  return sqliteDb.getSentenceByAudioFilename(audioFilename);
}

export async function updateSentenceTag(
  id: number,
  tag: SentenceTag | null
): Promise<SentenceRecord | undefined> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<PostgresSentenceRow>(
      `UPDATE sentences
       SET tag_type = $1, tag_name = $2
       WHERE id = $3
       RETURNING id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at`,
      [tag?.type ?? null, tag?.name ?? null, id]
    );

    if (result.rows.length === 0) return undefined;
    return toSentenceRecord(result.rows[0]);
  }

  return sqliteDb.updateSentenceTag(id, tag);
}

export async function closeDatabase(): Promise<void> {
  if (resolveProvider() === "postgres") {
    if (postgresPool) {
      await postgresPool.end();
      postgresPool = null;
    }
    postgresInitPromise = null;
    return;
  }

  sqliteDb.closeDatabase();
}
