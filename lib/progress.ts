import type { ProgressData, ProgressPoint, ProgressRow, ReviewCount } from "@/lib/types";

const MASTERED_STAGE = 8;

/** Number of past days (including today) shown on the progress chart. */
export const PROGRESS_PAST_DAYS = 30;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** First day (YYYY-MM-DD, UTC) of the chart window — for querying the due log. */
export function windowStartKey(now: Date, pastDays = PROGRESS_PAST_DAYS): string {
  return dayKey(addDays(now, -(pastDays - 1)));
}

/**
 * Build the daily progress series from raw sentence rows.
 *
 * The series is past-only (last `pastDays` days through today). Per-day "added"
 * and the running cumulative total are reconstructed from createdAt.
 *
 * The per-day "reviewed" series counts review events, which aren't derivable
 * from sentence rows (SM-2 only stores each sentence's *latest* review), so
 * it's read from `reviewLog` — a per-day tally recorded as reviews happen. Days
 * before logging began (or with no reviews) default to 0.
 */
export function buildProgressData(
  rows: ProgressRow[],
  now: Date = new Date(),
  pastDays = PROGRESS_PAST_DAYS,
  reviewLog: ReviewCount[] = []
): ProgressData {
  const todayKey = dayKey(now);
  const nowMs = now.getTime();

  const windowStart = addDays(now, -(pastDays - 1));
  const windowStartKey = dayKey(windowStart);

  const dates: string[] = [];
  for (let d = new Date(windowStart); dayKey(d) <= todayKey; d = addDays(d, 1)) {
    dates.push(dayKey(d));
  }

  const addedByDay = new Map<string, number>();
  const reviewedByDay = new Map<string, number>();
  for (const key of dates) {
    addedByDay.set(key, 0);
    reviewedByDay.set(key, 0);
  }
  for (const entry of reviewLog) {
    if (reviewedByDay.has(entry.day)) {
      reviewedByDay.set(entry.day, entry.count);
    }
  }

  let totalSentences = 0;
  let baselineCumulative = 0;
  let masteredCount = 0;
  let dueCount = 0;

  for (const row of rows) {
    totalSentences += 1;

    const createdKey = dayKey(new Date(row.createdAt));
    if (createdKey < windowStartKey) {
      baselineCumulative += 1;
    } else if (addedByDay.has(createdKey)) {
      addedByDay.set(createdKey, (addedByDay.get(createdKey) ?? 0) + 1);
    }

    if ((row.stage ?? 0) >= MASTERED_STAGE) {
      masteredCount += 1;
    }

    // "Due now" backlog: reviewable (has audio) and past its next-review time.
    if (row.hasAudio && row.nextReviewAt) {
      const dueMs = new Date(row.nextReviewAt).getTime();
      if (!Number.isNaN(dueMs) && dueMs <= nowMs) {
        dueCount += 1;
      }
    }
  }

  let running = baselineCumulative;
  const points: ProgressPoint[] = dates.map((date) => {
    const added = addedByDay.get(date) ?? 0;
    running += added;
    return {
      date,
      added,
      cumulative: running,
      reviewed: reviewedByDay.get(date) ?? 0,
      isToday: date === todayKey,
    };
  });

  return {
    points,
    totalSentences,
    addedToday: addedByDay.get(todayKey) ?? 0,
    dueCount,
    masteredCount,
  };
}
