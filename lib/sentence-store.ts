import {
  DEFAULT_LEARNER_ID,
  buildListeningHighlights,
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
  const sentence = toSentenceRecord(row);
  return {
    sentence,
    reviewState: toReviewState(row),
    listeningHighlights: buildListeningHighlights(sentence.analysis),
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
  sentence: string
): Promise<SentenceRecord | undefined> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<PostgresSentenceRow>(
      `
        SELECT id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at
        FROM sentences
        WHERE sentence = $1
        LIMIT 1
      `,
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
      `
        INSERT INTO sentences (sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at
      `,
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

    const saved = toSentenceRecord(result.rows[0]);
    await ensurePostgresReviewState(pool, saved.id, saved.createdAt);
    return saved;
  }

  return sqliteDb.insertSentence(record);
}

export async function getAllSentences(): Promise<SentenceRecord[]> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<PostgresSentenceRow>(
      `
        SELECT id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at
        FROM sentences
        ORDER BY created_at DESC, id DESC
      `
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
  options: SearchOptions = {}
): Promise<SearchResult> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const { query, tagType, tagName, limit = 20, offset = 0 } = options;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

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
  limit?: number;
  now?: string;
}): Promise<ReviewQueueResult> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const learnerId = options?.learnerId ?? DEFAULT_LEARNER_ID;
    const limit = options?.limit ?? 10;
    const now = options?.now ?? new Date().toISOString();

    const [reviewableCountResult, dueCountResult, skippedNoAudioResult, queueResult] =
      await Promise.all([
        pool.query<{ count: string }>(
          `
            SELECT COUNT(*) as count
            FROM sentences
            INNER JOIN sentence_review_states
              ON sentence_review_states.sentence_id = sentences.id
             AND sentence_review_states.learner_id = $1
            WHERE sentences.audio_filename IS NOT NULL
          `,
          [learnerId]
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
            FROM sentences
            INNER JOIN sentence_review_states
              ON sentence_review_states.sentence_id = sentences.id
             AND sentence_review_states.learner_id = $1
            WHERE sentences.audio_filename IS NULL
              AND sentence_review_states.next_review_at <= $2
          `,
          [learnerId, now]
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
      dueCount: parseInt(dueCountResult.rows[0].count, 10),
      reviewableCount: parseInt(reviewableCountResult.rows[0].count, 10),
      skippedNoAudioCount: parseInt(skippedNoAudioResult.rows[0].count, 10),
    };
  }

  return sqliteDb.getReviewQueue(options);
}

export async function submitSentenceReview(
  sentenceId: number,
  result: ReviewResult,
  options?: {
    learnerId?: string;
    reviewedAt?: string;
  }
): Promise<SentenceReviewState | undefined> {
  if (resolveProvider() === "postgres") {
    await initPostgresSchema();
    const pool = getPostgresPool();
    const learnerId = options?.learnerId ?? DEFAULT_LEARNER_ID;
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
