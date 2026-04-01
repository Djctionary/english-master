import type { ReviewResult } from "@/lib/types";

export const DEFAULT_LEARNER_ID = "VR7IL";

const REVIEW_STAGE_INTERVALS_MS = [
  8 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
  14 * 24 * 60 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000,
  60 * 24 * 60 * 60 * 1000,
  120 * 24 * 60 * 60 * 1000,
];

export function clampReviewStage(stage: number): number {
  if (!Number.isFinite(stage)) return 1;
  return Math.min(REVIEW_STAGE_INTERVALS_MS.length, Math.max(1, Math.floor(stage)));
}

export function getReviewIntervalMs(stage: number): number {
  return REVIEW_STAGE_INTERVALS_MS[clampReviewStage(stage) - 1];
}

export function getNextReviewStage(
  currentStage: number,
  result: ReviewResult
): number {
  const safeStage = clampReviewStage(currentStage);

  if (result === "full") {
    return clampReviewStage(safeStage + 1);
  }
  if (result === "partial") {
    return clampReviewStage(safeStage - 1);
  }
  return 1;
}

export function scheduleNextReviewAt(
  stage: number,
  from: string | Date
): string {
  const baseTime = from instanceof Date ? from.getTime() : new Date(from).getTime();
  const safeBaseTime = Number.isNaN(baseTime) ? Date.now() : baseTime;
  return new Date(safeBaseTime + getReviewIntervalMs(stage)).toISOString();
}

