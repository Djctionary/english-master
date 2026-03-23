import type {
  AnalysisResult,
  ListeningHighlight,
  ReviewResult,
} from "@/lib/types";

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

function normalizeText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function limitText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildListeningHighlights(
  analysis: AnalysisResult
): ListeningHighlight[] {
  const highlights: ListeningHighlight[] = [];

  const vocabularyCandidate = analysis.vocabulary.find(
    (item) =>
      normalizeText(item.word) &&
      (normalizeText(item.phonetic) || normalizeText(item.difficultyReason))
  );

  if (vocabularyCandidate) {
    const phonetic = normalizeText(vocabularyCandidate.phonetic);
    const note = normalizeText(vocabularyCandidate.difficultyReason);

    highlights.push({
      kind: "pronunciation",
      label: "Pronunciation anchor",
      text: phonetic
        ? `${vocabularyCandidate.word} ${phonetic}`
        : vocabularyCandidate.word,
      note: note ? limitText(note, 110) : undefined,
    });
  }

  const chunkCandidate = analysis.components.find((component) => {
    const text = normalizeText(component.text);
    if (!text) return false;

    const role = component.role.toLowerCase();
    return role !== "subject" && text.split(/\s+/).length >= 2;
  });

  if (chunkCandidate) {
    highlights.push({
      kind: "chunk",
      label: "Key chunk",
      text: chunkCandidate.text.trim(),
      note: limitText(chunkCandidate.description.trim(), 110),
    });
  }

  const tipText =
    normalizeText(analysis.grammarNotes[0]) ??
    normalizeText(analysis.sentencePattern) ??
    normalizeText(analysis.structureAnalysis.phraseExplanations);

  if (tipText) {
    highlights.push({
      kind: "tip",
      label: "Listening tip",
      text: limitText(tipText, 120),
    });
  }

  return highlights.slice(0, 3);
}
