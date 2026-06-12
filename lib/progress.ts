import type { ProgressData, ProgressPoint, ProgressRow } from "@/lib/types";

const MASTERED_STAGE = 8;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Build the daily progress series from raw sentence rows.
 *
 * Cumulative + per-day "added" are reconstructed from createdAt. The due series
 * is forward-looking: each sentence is bucketed by its next_review_at, with
 * everything overdue collapsed onto today (the only honest reading, since we
 * store the current due date, not its history).
 */
export function buildProgressData(
  rows: ProgressRow[],
  now: Date = new Date(),
  pastDays = 30,
  futureDays = 14
): ProgressData {
  const todayKey = dayKey(now);
  const nowMs = now.getTime();

  const windowStart = addDays(now, -(pastDays - 1));
  const windowStartKey = dayKey(windowStart);
  const windowEndKey = dayKey(addDays(now, futureDays));

  const dates: string[] = [];
  for (let d = new Date(windowStart); dayKey(d) <= windowEndKey; d = addDays(d, 1)) {
    dates.push(dayKey(d));
  }

  const addedByDay = new Map<string, number>();
  const dueByDay = new Map<string, number>();
  for (const key of dates) {
    addedByDay.set(key, 0);
    dueByDay.set(key, 0);
  }

  let totalSentences = 0;
  let baselineCumulative = 0;
  let masteredCount = 0;
  let overdueCount = 0;

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

    if (row.hasAudio && row.nextReviewAt) {
      const dueMs = new Date(row.nextReviewAt).getTime();
      if (Number.isNaN(dueMs)) continue;
      if (dueMs <= nowMs) {
        overdueCount += 1;
        dueByDay.set(todayKey, (dueByDay.get(todayKey) ?? 0) + 1);
      } else {
        const dueKey = dayKey(new Date(row.nextReviewAt));
        if (dueByDay.has(dueKey)) {
          dueByDay.set(dueKey, (dueByDay.get(dueKey) ?? 0) + 1);
        }
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
      dueForecast: dueByDay.get(date) ?? 0,
      isFuture: date > todayKey,
      isToday: date === todayKey,
    };
  });

  return {
    points,
    totalSentences,
    addedToday: addedByDay.get(todayKey) ?? 0,
    overdueCount,
    masteredCount,
  };
}
