import Database from "better-sqlite3";
import fs from "fs";
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
} from "./types";
import { getDataDir, getDatabasePath } from "./storage-paths";

let db: Database.Database | null = null;

type SentenceRow = {
  id: number;
  sentence: string;
  corrected_sentence: string;
  analysis: string;
  audio_filename: string | null;
  tag_type: string | null;
  tag_name: string | null;
  created_at: string;
};

type ReviewStateRow = {
  learner_id: string;
  stage: number;
  next_review_at: string;
  last_reviewed_at: string | null;
  last_result: ReviewResult | null;
};

type ReviewQueueRow = SentenceRow &
  ReviewStateRow & {
    sentence_id: number;
  };

const SENTENCE_SELECT =
  "id, sentence, corrected_sentence, analysis, audio_filename, tag_type, tag_name, created_at";

function getDb(): Database.Database {
  if (!db) {
    const dbDir = getDataDir();
    const dbPath = getDatabasePath();

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    runMigrations(db);
  }

  return db;
}

function createTables(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS sentences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sentence TEXT NOT NULL UNIQUE,
      corrected_sentence TEXT NOT NULL,
      analysis TEXT NOT NULL,
      audio_filename TEXT,
      tag_type TEXT,
      tag_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS sentence_review_states (
      sentence_id INTEGER NOT NULL,
      learner_id TEXT NOT NULL,
      stage INTEGER NOT NULL DEFAULT 1,
      next_review_at TEXT NOT NULL,
      last_reviewed_at TEXT,
      last_result TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (sentence_id, learner_id)
    );
  `);
}

function runMigrations(database: Database.Database): void {
  createTables(database);
  migrateAddCorrectedSentence(database);
  migrateAddTagColumns(database);
  migrateCreateReviewStateTable(database);
  migrateBackfillReviewStates(database);
}

export function initDatabase(): void {
  const database = db ?? getDb();
  runMigrations(database);
}

function migrateAddCorrectedSentence(database: Database.Database): void {
  try {
    database.exec("ALTER TABLE sentences ADD COLUMN corrected_sentence TEXT");
  } catch {
    // Column already exists.
  }

  database.exec(
    "UPDATE sentences SET corrected_sentence = sentence WHERE corrected_sentence IS NULL"
  );
}

function migrateAddTagColumns(database: Database.Database): void {
  try {
    database.exec("ALTER TABLE sentences ADD COLUMN tag_type TEXT");
  } catch {
    // Column already exists.
  }

  try {
    database.exec("ALTER TABLE sentences ADD COLUMN tag_name TEXT");
  } catch {
    // Column already exists.
  }

  database.exec(
    "UPDATE sentences SET tag_type = NULL, tag_name = NULL WHERE tag_type IS NULL OR tag_name IS NULL"
  );
}

function migrateCreateReviewStateTable(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS sentence_review_states (
      sentence_id INTEGER NOT NULL,
      learner_id TEXT NOT NULL,
      stage INTEGER NOT NULL DEFAULT 1,
      next_review_at TEXT NOT NULL,
      last_reviewed_at TEXT,
      last_result TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (sentence_id, learner_id)
    );
  `);
}

function migrateBackfillReviewStates(database: Database.Database): void {
  const now = new Date().toISOString();

  database
    .prepare(
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
        SELECT
          sentences.id,
          ?,
          1,
          ?,
          NULL,
          NULL,
          ?,
          ?
        FROM sentences
        LEFT JOIN sentence_review_states
          ON sentence_review_states.sentence_id = sentences.id
         AND sentence_review_states.learner_id = ?
        WHERE sentence_review_states.sentence_id IS NULL
      `
    )
    .run(DEFAULT_LEARNER_ID, now, now, now, DEFAULT_LEARNER_ID);
}

function rowToSentenceRecord(row: SentenceRow): SentenceRecord {
  let parsedAnalysis: AnalysisResult;
  try {
    parsedAnalysis = JSON.parse(row.analysis) as AnalysisResult;
  } catch {
    parsedAnalysis = {} as AnalysisResult;
  }

  const tag: SentenceTag | null =
    row.tag_type && row.tag_name
      ? { type: row.tag_type, name: row.tag_name }
      : null;

  return {
    id: row.id,
    sentence: row.sentence,
    correctedSentence: row.corrected_sentence,
    analysis: parsedAnalysis,
    audioFilename: row.audio_filename,
    tag,
    createdAt: row.created_at,
  };
}

function rowToReviewState(row: ReviewStateRow): SentenceReviewState {
  return {
    learnerId: row.learner_id,
    stage: row.stage,
    nextReviewAt: row.next_review_at,
    lastReviewedAt: row.last_reviewed_at,
    lastResult: row.last_result,
  };
}

function rowToReviewQueueItem(row: ReviewQueueRow): ReviewQueueItem {
  return {
    sentence: rowToSentenceRecord(row),
    reviewState: rowToReviewState(row),
  };
}

function ensureReviewStateExists(
  database: Database.Database,
  sentenceId: number,
  createdAt: string,
  learnerId = DEFAULT_LEARNER_ID
): void {
  const nextReviewAt = scheduleNextReviewAt(1, createdAt);
  database
    .prepare(
      `
        INSERT OR IGNORE INTO sentence_review_states (
          sentence_id,
          learner_id,
          stage,
          next_review_at,
          last_reviewed_at,
          last_result,
          created_at,
          updated_at
        ) VALUES (?, ?, 1, ?, NULL, NULL, ?, ?)
      `
    )
    .run(sentenceId, learnerId, nextReviewAt, createdAt, createdAt);
}

function getSentenceReviewState(
  sentenceId: number,
  learnerId = DEFAULT_LEARNER_ID
): SentenceReviewState | undefined {
  const database = getDb();
  const row = database
    .prepare(
      `
        SELECT learner_id, stage, next_review_at, last_reviewed_at, last_result
        FROM sentence_review_states
        WHERE sentence_id = ? AND learner_id = ?
      `
    )
    .get(sentenceId, learnerId) as ReviewStateRow | undefined;

  if (!row) return undefined;
  return rowToReviewState(row);
}

export function findSentenceByText(sentence: string): SentenceRecord | undefined {
  const database = getDb();
  const row = database
    .prepare(`SELECT ${SENTENCE_SELECT} FROM sentences WHERE sentence = ?`)
    .get(sentence) as SentenceRow | undefined;

  if (!row) return undefined;
  return rowToSentenceRecord(row);
}

export function insertSentence(record: Omit<SentenceRecord, "id">): SentenceRecord {
  const database = getDb();
  const result = database
    .prepare(
      `
        INSERT INTO sentences (
          sentence,
          corrected_sentence,
          analysis,
          audio_filename,
          tag_type,
          tag_name,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      record.sentence,
      record.correctedSentence,
      JSON.stringify(record.analysis),
      record.audioFilename,
      record.tag?.type ?? null,
      record.tag?.name ?? null,
      record.createdAt
    );

  const insertedId = result.lastInsertRowid as number;
  ensureReviewStateExists(database, insertedId, record.createdAt);

  return {
    id: insertedId,
    sentence: record.sentence,
    correctedSentence: record.correctedSentence,
    analysis: record.analysis,
    audioFilename: record.audioFilename,
    tag: record.tag ?? null,
    createdAt: record.createdAt,
  };
}

export function getAllSentences(): SentenceRecord[] {
  const database = getDb();
  const rows = database
    .prepare(`SELECT ${SENTENCE_SELECT} FROM sentences ORDER BY created_at DESC, id DESC`)
    .all() as SentenceRow[];

  return rows.map(rowToSentenceRecord);
}

export function getSentenceById(id: number): SentenceRecord | undefined {
  const database = getDb();
  const row = database
    .prepare(`SELECT ${SENTENCE_SELECT} FROM sentences WHERE id = ?`)
    .get(id) as SentenceRow | undefined;

  if (!row) return undefined;
  return rowToSentenceRecord(row);
}

export function getSentenceByAudioFilename(
  audioFilename: string
): SentenceRecord | undefined {
  const database = getDb();
  const row = database
    .prepare(`SELECT ${SENTENCE_SELECT} FROM sentences WHERE audio_filename = ?`)
    .get(audioFilename) as SentenceRow | undefined;

  if (!row) return undefined;
  return rowToSentenceRecord(row);
}

export function updateSentenceTag(
  id: number,
  tag: SentenceTag | null
): SentenceRecord | undefined {
  const existing = getSentenceById(id);
  if (!existing) return undefined;

  const database = getDb();
  database
    .prepare("UPDATE sentences SET tag_type = ?, tag_name = ? WHERE id = ?")
    .run(tag?.type ?? null, tag?.name ?? null, id);

  return getSentenceById(id);
}

export function updateSentenceAnalysis(
  id: number,
  payload: {
    correctedSentence: string;
    analysis: AnalysisResult;
    audioFilename: string | null;
  }
): SentenceRecord | undefined {
  const existing = getSentenceById(id);
  if (!existing) return undefined;

  const database = getDb();
  database
    .prepare(
      "UPDATE sentences SET corrected_sentence = ?, analysis = ?, audio_filename = ? WHERE id = ?"
    )
    .run(
      payload.correctedSentence,
      JSON.stringify(payload.analysis),
      payload.audioFilename,
      id
    );

  return getSentenceById(id);
}

export function searchSentences(options: SearchOptions = {}): SearchResult {
  const database = getDb();
  const { query, tagType, tagName, limit = 20, offset = 0 } = options;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (query) {
    conditions.push("sentence LIKE ?");
    params.push(`%${query}%`);
  }
  if (tagType) {
    conditions.push("tag_type = ?");
    params.push(tagType);
  }
  if (tagName) {
    conditions.push("tag_name = ?");
    params.push(tagName);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const countRow = database
    .prepare(`SELECT COUNT(*) as count FROM sentences ${where}`)
    .get(...params) as { count: number };
  const total = countRow.count;

  const rows = database
    .prepare(
      `
        SELECT ${SENTENCE_SELECT}
        FROM sentences
        ${where}
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?
      `
    )
    .all(...params, limit, offset) as SentenceRow[];

  return {
    sentences: rows.map(rowToSentenceRecord),
    total,
  };
}

export function getReviewQueue(options?: {
  learnerId?: string;
  limit?: number;
  now?: string;
}): ReviewQueueResult {
  const database = getDb();
  const learnerId = options?.learnerId ?? DEFAULT_LEARNER_ID;
  const limit = options?.limit ?? 10;
  const now = options?.now ?? new Date().toISOString();

  const totalCountRow = database
    .prepare(`SELECT COUNT(*) as count FROM sentences`)
    .get() as { count: number };

  const dueCountRow = database
    .prepare(
      `
        SELECT COUNT(*) as count
        FROM sentences
        INNER JOIN sentence_review_states
          ON sentence_review_states.sentence_id = sentences.id
         AND sentence_review_states.learner_id = ?
        WHERE sentences.audio_filename IS NOT NULL
          AND sentence_review_states.next_review_at <= ?
      `
    )
    .get(learnerId, now) as { count: number };

  const masteredCountRow = database
    .prepare(
      `
        SELECT COUNT(*) as count
        FROM sentence_review_states
        WHERE learner_id = ?
          AND stage >= 8
      `
    )
    .get(learnerId) as { count: number };

  const rows = database
    .prepare(
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
         AND sentence_review_states.learner_id = ?
        WHERE sentences.audio_filename IS NOT NULL
          AND sentence_review_states.next_review_at <= ?
        ORDER BY sentence_review_states.next_review_at ASC, sentences.created_at DESC, sentences.id DESC
        LIMIT ?
      `
    )
    .all(learnerId, now, limit) as ReviewQueueRow[];

  return {
    learnerId,
    items: rows.map(rowToReviewQueueItem),
    totalSentences: totalCountRow.count,
    dueCount: dueCountRow.count,
    masteredCount: masteredCountRow.count,
  };
}

export function submitSentenceReview(
  sentenceId: number,
  result: ReviewResult,
  options?: {
    learnerId?: string;
    reviewedAt?: string;
  }
): SentenceReviewState | undefined {
  const sentence = getSentenceById(sentenceId);
  if (!sentence) return undefined;

  const database = getDb();
  const learnerId = options?.learnerId ?? DEFAULT_LEARNER_ID;
  const reviewedAt = options?.reviewedAt ?? new Date().toISOString();

  ensureReviewStateExists(database, sentenceId, sentence.createdAt, learnerId);

  const currentState = getSentenceReviewState(sentenceId, learnerId);
  if (!currentState) return undefined;

  const nextStage = getNextReviewStage(currentState.stage, result);
  const nextReviewAt = scheduleNextReviewAt(nextStage, reviewedAt);

  database
    .prepare(
      `
        UPDATE sentence_review_states
        SET stage = ?,
            next_review_at = ?,
            last_reviewed_at = ?,
            last_result = ?,
            updated_at = ?
        WHERE sentence_id = ? AND learner_id = ?
      `
    )
    .run(
      nextStage,
      nextReviewAt,
      reviewedAt,
      result,
      reviewedAt,
      sentenceId,
      learnerId
    );

  return getSentenceReviewState(sentenceId, learnerId);
}

export function deleteSentenceById(id: number): SentenceRecord | undefined {
  const existing = getSentenceById(id);
  if (!existing) return undefined;

  const database = getDb();
  database.prepare("DELETE FROM sentence_review_states WHERE sentence_id = ?").run(id);
  database.prepare("DELETE FROM sentences WHERE id = ?").run(id);
  return existing;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function _resetForTesting(testDb?: Database.Database): void {
  if (db) {
    try {
      db.close();
    } catch {
      // Ignore close errors during testing.
    }
  }

  db = testDb ?? null;
}
