import {
  DEFAULT_LEARNER_ID,
  getNextReviewStage,
  scheduleNextReviewAt,
} from "@/lib/review";
import type {
  AnalysisResult,
  ReviewQueueItem,
  ReviewQueueResult,
  ReviewResult,
  SentenceRecord,
  SentenceReviewState,
  SentenceTag,
  SearchOptions,
  SearchResult,
} from "@/lib/types";
import * as sqliteDb from "@/lib/db";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

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

type PostgresReviewStateRow = {
  learner_id: string;
  stage: number;
  next_review_at: string | Date;
  last_reviewed_at: string | Date | null;
  last_result: ReviewResult | null;
};

type PostgresReviewQueueRow = PostgresSentenceRow &
  PostgresReviewStateRow & {
    sentence_id: number;
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

function normalizeTimestamp(value: string | Date | null): string | null {
  if (value === null) return null;
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
  let parsedAnalysis: AnalysisResult;
  try {
    parsedAnalysis = JSON.parse(row.analysis) as AnalysisResult;
  } catch {
    parsedAnalysis = {} as AnalysisResult;
  }

  return {
    id: Number(row.id),
    sentence: row.sentence,
    correctedSentence: row.corrected_sentence,
    analysis: parsedAnalysis,
    audioFilename: row.audio_filename,
    tag:
      row.tag_type && row.tag_name
        ? { type: row.tag_type, name: row.tag_name }
        : null,
    createdAt: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
  };
}

function toReviewState(row: PostgresReviewStateRow): SentenceReviewState {
  return {
    learnerId: row.learner_id,
    stage: Number(row.stage),
    nextReviewAt: normalizeTimestamp(row.next_review_at) ?? new Date().toISOString(),
    lastReviewedAt: normalizeTimestamp(row.last_reviewed_at),
    lastResult: row.last_result,
  };
}

function toReviewQueueItem(row: PostgresReviewQueueRow): ReviewQueueItem {
  return {
    sentence: toSentenceRecord(row),
    reviewState: toReviewState(row),
  };
}

async function ensurePostgresReviewState(
  pool: PgPool,
  sentenceId: number,
  createdAt: string,
  learnerId = DEFAULT_LEARNER_ID
): Promise<void> {
  const nextReviewAt = scheduleNextReviewAt(1, createdAt);

  await pool.query(
    `
      INSERT INTO sentence_review_states (
        sentence_id,
        learner_id,
        stage,
        next_review_at,
        last_reviewed_at,
        last_result,
        created_at,
        updated_at
      )
      VALUES ($1, $2, 1, $3, NULL, NULL, $4, $4)
      ON CONFLICT (sentence_id, learner_id) DO NOTHING
    `,
    [sentenceId, learnerId, nextReviewAt, createdAt]
  );
}

async function getPostgresReviewState(
  pool: PgPool,
  sentenceId: number,
  learnerId = DEFAULT_LEARNER_ID
): Promise<SentenceReviewState | undefined> {
  const result = await pool.query<PostgresReviewStateRow>(
    `
      SELECT learner_id, stage, next_review_at, last_reviewed_at, last_result
      FROM sentence_review_states
      WHERE sentence_id = $1 AND learner_id = $2
      LIMIT 1
    `,
    [sentenceId, learnerId]
  );

  if (result.rows.length === 0) return undefined;
  return toReviewState(result.rows[0]);
}

async function initPostgresSchema(): Promise<void> {
  if (postgresInitPromise) {
    return postgresInitPromise;
  }

  postgresInitPromise = (async () => {
    const pool = getPostgresPool();

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sentences (
        id SERIAL PRIMARY KEY,
        sentence TEXT NOT NULL,
        corrected_sentence TEXT NOT NULL,
        analysis TEXT NOT NULL,
        audio_filename TEXT,
        tag_type TEXT,
        tag_name TEXT,
        user_id INTEGER REFERENCES users(id),
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
      `ALTER TABLE sentences ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)`
    );

    // Drop UNIQUE constraint on sentence if it exists (allow different users to have same sentence)
    await pool.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'sentences_sentence_key' AND conrelid = 'sentences'::regclass
        ) THEN
          ALTER TABLE sentences DROP CONSTRAINT sentences_sentence_key;
        END IF;
      END $$;
    `);

    // Create default "vergil" user and assign orphaned data
    const vergilCheck = await pool.query<{ id: number }>(
      `SELECT id FROM users WHERE username = 'vergil'`
    );
    if (vergilCheck.rows.length === 0) {
      const hash = bcrypt.hashSync("yamato", 10);
      const insertResult = await pool.query<{ id: number }>(
        `INSERT INTO users (username, password_hash) VALUES ('vergil', $1) RETURNING id`,
        [hash]
      );
      const vergilId = insertResult.rows[0].id;
      await pool.query(
        `UPDATE sentences SET user_id = $1 WHERE user_id IS NULL`,
        [vergilId]
      );
      await pool.query(
        `UPDATE sentence_review_states SET learner_id = $1 WHERE learner_id = $2`,
        [String(vergilId), DEFAULT_LEARNER_ID]
      );
    } else {
      await pool.query(
        `UPDATE sentences SET user_id = $1 WHERE user_id IS NULL`,
        [vergilCheck.rows[0].id]
      );
    }

    await pool.query(
      `UPDATE sentences SET corrected_sentence = sentence WHERE corrected_sentence IS NULL`
    );
    await pool.query(
      `UPDATE sentences SET tag_type = NULL, tag_name = NULL WHERE tag_type IS NULL OR tag_name IS NULL`
    );

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sentence_review_states (
        sentence_id INTEGER NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
        learner_id TEXT NOT NULL,
        stage INTEGER NOT NULL DEFAULT 1,
        next_review_at TIMESTAMPTZ NOT NULL,
        last_reviewed_at TIMESTAMPTZ,
        last_result TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (sentence_id, learner_id)
      );
    `);

    const now = new Date().toISOString();
    await pool.query(
      `
        INSERT INTO sentence_review_states (
          sentence_id,
          learner_id,
          stage,
          next_review_at,
          last_reviewed_at,
          last_result,
          created_at,
          updated_at
        )
        SELECT s.id, $1, 1, $2, NULL, NULL, $2, $2
        FROM sentences s
        LEFT JOIN sentence_review_states rs
          ON rs.sentence_id = s.id
         AND rs.learner_id = $1
        WHERE rs.sentence_id IS NULL
      `,
      [DEFAULT_LEARNER_ID, now]
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
  sentence: string,
  userId?: number
): Promise<SentenceRecord | undefined> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const sql = userId
      ? `SELECT id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at FROM sentences WHERE sentence = $1 AND user_id = $2 LIMIT 1`
      : `SELECT id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at FROM sentences WHERE sentence = $1 LIMIT 1`;
    const params = userId ? [sentence, userId] : [sentence];
    const result = await pool.query<PostgresSentenceRow>(sql, params);

    if (result.rows.length === 0) return undefined;
    return toSentenceRecord(result.rows[0]);
  }

  return sqliteDb.findSentenceByText(sentence, userId);
}

export async function insertSentence(
  record: Omit<SentenceRecord, "id">,
  userId?: number
): Promise<SentenceRecord> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<PostgresSentenceRow>(
      `
        INSERT INTO sentences (sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, user_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at
      `,
      [
        record.sentence,
        record.correctedSentence,
        JSON.stringify(record.analysis),
        record.audioFilename,
        record.tag?.type ?? null,
        record.tag?.name ?? null,
        userId ?? null,
        record.createdAt,
      ]
    );

    const saved = toSentenceRecord(result.rows[0]);
    const learnerId = userId ? String(userId) : DEFAULT_LEARNER_ID;
    await ensurePostgresReviewState(pool, saved.id, saved.createdAt, learnerId);
    return saved;
  }

  return sqliteDb.insertSentence(record, userId);
}

export async function getAllSentences(userId?: number): Promise<SentenceRecord[]> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const sql = userId
      ? `SELECT id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at FROM sentences WHERE user_id = $1 ORDER BY created_at DESC, id DESC`
      : `SELECT id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at FROM sentences ORDER BY created_at DESC, id DESC`;
    const params = userId ? [userId] : [];
    const result = await pool.query<PostgresSentenceRow>(sql, params);

    return result.rows.map(toSentenceRecord);
  }

  return sqliteDb.getAllSentences(userId);
}

export async function getSentenceById(
  id: number
): Promise<SentenceRecord | undefined> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<PostgresSentenceRow>(
      `
        SELECT id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at
        FROM sentences
        WHERE id = $1
        LIMIT 1
      `,
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
      `
        SELECT id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at
        FROM sentences
        WHERE audio_filename = $1
        LIMIT 1
      `,
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
      `
        UPDATE sentences
        SET tag_type = $1, tag_name = $2
        WHERE id = $3
        RETURNING id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at
      `,
      [tag?.type ?? null, tag?.name ?? null, id]
    );

    if (result.rows.length === 0) return undefined;
    return toSentenceRecord(result.rows[0]);
  }

  return sqliteDb.updateSentenceTag(id, tag);
}

export async function updateSentenceAnalysis(
  id: number,
  payload: {
    correctedSentence: string;
    analysis: AnalysisResult;
    audioFilename: string | null;
  }
): Promise<SentenceRecord | undefined> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<PostgresSentenceRow>(
      `
        UPDATE sentences
        SET corrected_sentence = $1, analysis = $2, audio_filename = $3
        WHERE id = $4
        RETURNING id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at
      `,
      [
        payload.correctedSentence,
        JSON.stringify(payload.analysis),
        payload.audioFilename,
        id,
      ]
    );

    if (result.rows.length === 0) return undefined;
    return toSentenceRecord(result.rows[0]);
  }

  return sqliteDb.updateSentenceAnalysis(id, payload);
}

export async function searchSentences(
  options: SearchOptions & { userId?: number } = {}
): Promise<SearchResult> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const { query, tagType, tagName, limit = 20, offset = 0, userId } = options;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (userId) {
      conditions.push(`user_id = $${paramIdx++}`);
      params.push(userId);
    }
    if (query) {
      conditions.push(`sentence ILIKE $${paramIdx++}`);
      params.push(`%${query}%`);
    }
    if (tagType) {
      conditions.push(`tag_type = $${paramIdx++}`);
      params.push(tagType);
    }
    if (tagName) {
      conditions.push(`tag_name = $${paramIdx++}`);
      params.push(tagName);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM sentences ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await pool.query<PostgresSentenceRow>(
      `
        SELECT id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at
        FROM sentences
        ${where}
        ORDER BY created_at DESC, id DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `,
      [...params, limit, offset]
    );

    return {
      sentences: dataResult.rows.map(toSentenceRecord),
      total,
    };
  }

  return sqliteDb.searchSentences(options);
}

export async function getReviewQueue(options?: {
  learnerId?: string;
  userId?: number;
  limit?: number;
  now?: string;
}): Promise<ReviewQueueResult> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const learnerId = options?.userId ? String(options.userId) : (options?.learnerId ?? DEFAULT_LEARNER_ID);
    const limit = options?.limit ?? 10;
    const now = options?.now ?? new Date().toISOString();
    const userFilter = options?.userId ? ` WHERE user_id = ${options.userId}` : "";

    const [totalCountResult, dueCountResult, masteredCountResult, queueResult] =
      await Promise.all([
        pool.query<{ count: string }>(
          `SELECT COUNT(*) as count FROM sentences${userFilter}`
        ),
        pool.query<{ count: string }>(
          `
            SELECT COUNT(*) as count
            FROM sentences
            INNER JOIN sentence_review_states
              ON sentence_review_states.sentence_id = sentences.id
             AND sentence_review_states.learner_id = $1
            WHERE sentences.audio_filename IS NOT NULL
              AND sentence_review_states.next_review_at <= $2
          `,
          [learnerId, now]
        ),
        pool.query<{ count: string }>(
          `
            SELECT COUNT(*) as count
            FROM sentence_review_states
            WHERE learner_id = $1
              AND stage >= 8
          `,
          [learnerId]
        ),
        pool.query<PostgresReviewQueueRow>(
          `
            SELECT
              sentences.id,
              sentences.sentence,
              sentences.corrected_sentence,
              sentences.analysis,
              sentences.audio_filename,
              sentences.tag_type,
              sentences.tag_name,
              sentences.created_at,
              sentence_review_states.sentence_id,
              sentence_review_states.learner_id,
              sentence_review_states.stage,
              sentence_review_states.next_review_at,
              sentence_review_states.last_reviewed_at,
              sentence_review_states.last_result
            FROM sentences
            INNER JOIN sentence_review_states
              ON sentence_review_states.sentence_id = sentences.id
             AND sentence_review_states.learner_id = $1
            WHERE sentences.audio_filename IS NOT NULL
              AND sentence_review_states.next_review_at <= $2
            ORDER BY sentence_review_states.next_review_at ASC, sentences.created_at DESC, sentences.id DESC
            LIMIT $3
          `,
          [learnerId, now, limit]
        ),
      ]);

    return {
      learnerId,
      items: queueResult.rows.map(toReviewQueueItem),
      totalSentences: parseInt(totalCountResult.rows[0].count, 10),
      dueCount: parseInt(dueCountResult.rows[0].count, 10),
      masteredCount: parseInt(masteredCountResult.rows[0].count, 10),
    };
  }

  return sqliteDb.getReviewQueue(options);
}

export async function submitSentenceReview(
  sentenceId: number,
  result: ReviewResult,
  options?: {
    learnerId?: string;
    userId?: number;
    reviewedAt?: string;
  }
): Promise<SentenceReviewState | undefined> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const learnerId = options?.userId ? String(options.userId) : (options?.learnerId ?? DEFAULT_LEARNER_ID);
    const reviewedAt = options?.reviewedAt ?? new Date().toISOString();

    const sentence = await getSentenceById(sentenceId);
    if (!sentence) return undefined;

    await ensurePostgresReviewState(pool, sentenceId, sentence.createdAt, learnerId);

    const currentState = await getPostgresReviewState(pool, sentenceId, learnerId);
    if (!currentState) return undefined;

    const nextStage = getNextReviewStage(currentState.stage, result);
    const nextReviewAt = scheduleNextReviewAt(nextStage, reviewedAt);

    await pool.query(
      `
        UPDATE sentence_review_states
        SET stage = $1,
            next_review_at = $2,
            last_reviewed_at = $3,
            last_result = $4,
            updated_at = $3
        WHERE sentence_id = $5 AND learner_id = $6
      `,
      [nextStage, nextReviewAt, reviewedAt, result, sentenceId, learnerId]
    );

    return getPostgresReviewState(pool, sentenceId, learnerId);
  }

  return sqliteDb.submitSentenceReview(sentenceId, result, options);
}

export async function deleteSentenceById(
  id: number
): Promise<SentenceRecord | undefined> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    await pool.query("DELETE FROM sentence_review_states WHERE sentence_id = $1", [id]);
    const result = await pool.query<PostgresSentenceRow>(
      `
        DELETE FROM sentences
        WHERE id = $1
        RETURNING id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at
      `,
      [id]
    );

    if (result.rows.length === 0) return undefined;
    return toSentenceRecord(result.rows[0]);
  }

  return sqliteDb.deleteSentenceById(id);
}

// ── User management ──

export async function getUserByUsername(
  username: string
): Promise<{ id: number; username: string; password_hash: string } | undefined> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<{ id: number; username: string; password_hash: string }>(
      `SELECT id, username, password_hash FROM users WHERE username = $1 LIMIT 1`,
      [username]
    );
    return result.rows[0] ?? undefined;
  }

  return sqliteDb.getUserByUsername(username);
}

export async function createUser(
  username: string,
  passwordHash: string
): Promise<{ id: number; username: string }> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<{ id: number; username: string }>(
      `INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username`,
      [username, passwordHash]
    );
    return result.rows[0];
  }

  return sqliteDb.createUser(username, passwordHash);
}

export async function getUserCount(): Promise<number> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users`
    );
    return parseInt(result.rows[0].count, 10);
  }

  return sqliteDb.getUserCount();
}

export async function getUserById(
  id: number
): Promise<{ id: number; username: string } | undefined> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<{ id: number; username: string }>(
      `SELECT id, username FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? undefined;
  }

  return sqliteDb.getUserById(id);
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
