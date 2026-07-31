import type {
  LearningTraceAnalysis,
  LearningTraceInput,
} from "@/lib/llm/learning-trace-contract";
import type {
  ConfidenceLevel,
  LearningDay,
  LearningTrace,
  SourceReference,
} from "@/types/learning-trace";


/** Display metadata belongs to the UI, not to the LLM response. */
export type DayShell = Pick<
  LearningDay,
  "id" | "number" | "label" | "title" | "statusLabel" | "slideCount"
>;

const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  medium: "Cần xác nhận",
  low: "Tín hiệu yếu",
};

const FALLBACK_SOURCE = "Không có nguồn học liệu được đối chiếu";

function resolveSourceLabels(
  sourceIds: readonly string[],
  sources: readonly SourceReference[],
): { slide: string; transcript: string } {
  const labels = sourceIds
    .map((id) => sources.find((source) => source.id === id)?.label)
    .filter((label): label is string => Boolean(label));

  const transcript = labels.find((label) => /transcript|T\d{2}-\d+/i.test(label));
  const slide = labels.find((label) => /slide|trang/i.test(label));

  return {
    slide: slide ?? labels[0] ?? FALLBACK_SOURCE,
    transcript: transcript ?? labels[1] ?? FALLBACK_SOURCE,
  };
}

/**
 * Empty when the analyzer found no grounded relationship for this topic.
 *
 * It used to return "Chưa có liên kết có căn cứ", which the mindmap then drew
 * as a node under every branch — a placeholder occupying the position where
 * real knowledge belongs. Absence of a link is not a node; the mindmap simply
 * omits it now.
 */
function resolveRelationshipLabel(
  topicId: string,
  analysis: LearningTraceAnalysis,
): string {
  const relationship = analysis.relationships.find(
    (item) => item.fromTopicId === topicId || item.toTopicId === topicId,
  );
  return relationship?.label ?? "";
}

/**
 * Maps canonical server output to the existing UI view model. No LLM output is
 * trusted until it has passed the route/analyzer validation before this point.
 */
export function mapAnalysisToDay(
  analysis: LearningTraceAnalysis,
  context: {
    shell: DayShell;
    sources: SourceReference[];
    interactionCount: number;
  },
): LearningDay {
  const { shell, sources, interactionCount } = context;

  const topics = analysis.topics.map((topic) => {
    const { slide, transcript } = resolveSourceLabels(topic.sourceIds, sources);
    return {
      id: topic.id,
      title: topic.title,
      summary: topic.summary,
      slide,
      transcript,
      learnedLabel: "Đã tìm hiểu",
      mindmapChild: resolveRelationshipLabel(topic.id, analysis),
      // Carried through so the mindmap can show the content under each heading
      // instead of the heading alone.
      keyConcepts: topic.keyConcepts.map((concept) => ({
        id: concept.id,
        title: concept.title,
        summary: concept.summary,
      })),
    };
  });

  const reviewItems = analysis.reviewItems.map((item) => {
    const { slide, transcript } = resolveSourceLabels(item.sourceIds, sources);
    return {
      id: item.id,
      title: item.title,
      confidence: item.confidence,
      confidenceLabel: CONFIDENCE_LABEL[item.confidence],
      reason: item.reason,
      evidenceTurnId: item.evidenceTurnIds[0],
      slide,
      transcript,
      relatedTopicId: item.relatedTopicId,
    };
  });

  const groundedSourceIds = new Set([
    ...analysis.topics.flatMap((topic) => topic.sourceIds),
    ...analysis.reviewItems.flatMap((item) => item.sourceIds),
    ...analysis.relationships.flatMap((item) => item.sourceIds),
  ]);

  const hasFindings =
    analysis.topics.length > 0 || analysis.reviewItems.length > 0;

  /**
   * A run can legitimately produce nothing. It must still say why, otherwise
   * the learner sees a blank result and cannot tell silence-with-reason from a
   * broken analysis.
   */
  const unassessableNote =
    analysis.unassessableItems.length > 0
      ? analysis.unassessableItems.map((item) => item.reason).join(" ")
      : hasFindings
        ? "Không có tương tác nào bị loại khỏi gợi ý ôn tập."
        : "Học liệu được cấp cho buổi này chưa đủ căn cứ để rút ra chủ đề hoặc gợi ý ôn tập. Hãy mở lại lượt chat gốc để tự kiểm chứng.";

  return {
    ...shell,
    interactionCount,
    groundedSourceCount: groundedSourceIds.size,
    topics,
    reviewItems,
    sources,
    interactions: [],
    unassessableNote,
  };
}

/** Size a mindmap node aims for. Clauses may run over rather than be cut. */
export const MINDMAP_NODE_MAX_CHARS = 50;

/** Cap on nodes generated from one topic that has no key concepts of its own. */
export const MINDMAP_MAX_FALLBACK_NODES = 3;

/** Below this a node reads as a stray fragment and is merged with a neighbour. */
const MINDMAP_NODE_MIN_CHARS = 14;

/**
 * Clause boundaries, coarse to fine.
 *
 * Vietnamese writes each syllable as its own whitespace-separated token, so
 * "xử lý" and "khác nhau" are single words spelled across a space. Splitting on
 * whitespace therefore cuts words in half — the earlier version produced nodes
 * reading "…mô hình xử" then "lý". Only these boundaries are ever used, and a
 * clause that has none stays whole even if it runs past the target size: an
 * over-long node still reads, a severed word does not.
 */
const CLAUSE_SEPARATORS: RegExp[] = [
  /(?<=[.!?…])\s+/,
  /\s*;\s*/,
  /\s*,\s*/,
  // Split before a connective so it opens the next node and keeps reading on.
  /\s+(?=(?:và|hoặc|hay|nhưng|còn|để|nếu|khi|thì|nên|mà|vì|do|tuy)\s)/,
];

interface Atom {
  text: string;
  /** Separator that reattaches this atom to the previous one when merged. */
  glue: string;
}

/**
 * Breaks analyzer prose into node-sized pieces for the mindmap.
 *
 * Strategy, in order:
 *   1. cut only at clause boundaries — never inside a phrase;
 *   2. greedily pack neighbouring clauses back up to the target size, so the
 *      map does not fill with one-clause-per-node confetti;
 *   3. absorb any leftover fragment into an adjacent node.
 *
 * Nothing is dropped and no word is split; text only moves between nodes.
 */
export function splitIntoNodeText(
  text: string,
  maxChars: number = MINDMAP_NODE_MAX_CHARS,
): string[] {
  const trimmed = text.trim().replace(/[.,;]+$/, "");
  if (!trimmed) {
    return [];
  }

  return mergeFragments(packAtoms(toAtoms(trimmed), maxChars), maxChars);
}

/** Recursively cuts at the finest clause boundary that applies. */
function toAtoms(text: string, depth = 0): Atom[] {
  if (depth >= CLAUSE_SEPARATORS.length) {
    return [{ text, glue: " " }];
  }

  const parts = text.split(CLAUSE_SEPARATORS[depth]).filter((part) => part.trim());
  if (parts.length <= 1) {
    return toAtoms(text, depth + 1);
  }

  // Commas and semicolons are dropped by the split, so restore them on merge.
  const glue = depth === 1 ? "; " : depth === 2 ? ", " : " ";
  return parts.flatMap((part, index) =>
    toAtoms(part.trim(), depth + 1).map((atom, atomIndex) => ({
      ...atom,
      glue: index > 0 && atomIndex === 0 ? glue : atom.glue,
    })),
  );
}

/** Greedily fills each node up to the target before starting the next. */
function packAtoms(atoms: Atom[], maxChars: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const atom of atoms) {
    if (!current) {
      current = atom.text;
      continue;
    }
    const candidate = `${current}${atom.glue}${atom.text}`;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      chunks.push(current);
      current = atom.text;
    }
  }
  if (current) {
    chunks.push(current);
  }
  return chunks;
}

/** Pulls stray fragments back into a neighbour so no node reads as a scrap. */
function mergeFragments(chunks: string[], maxChars: number): string[] {
  if (chunks.length < 2) {
    return chunks;
  }

  const merged: string[] = [];
  for (const chunk of chunks) {
    const previous = merged[merged.length - 1];
    const isFragment = chunk.length < MINDMAP_NODE_MIN_CHARS;
    // Allow a generous overflow here: rejoining a scrap beats leaving it alone.
    if (previous && isFragment && previous.length + chunk.length <= maxChars * 2) {
      merged[merged.length - 1] = `${previous} ${chunk}`;
    } else {
      merged.push(chunk);
    }
  }
  return merged;
}

/**
 * Finer boundaries used only when condensing to a single line.
 *
 * Kept out of the general splitter on purpose: cutting here while building the
 * whole tree would put the map back to one fragment per node. It exists so a
 * long opening clause can still be shortened at a readable seam instead of
 * being chopped mid-phrase.
 */
const SOFT_SEPARATORS: RegExp[] = [
  /\s+(?=(?:có thể|bằng cách|nhằm|trong|với|theo|qua|về|từ)\s)/,
  /\s+(?=(?:được|cho|là)\s)/,
];

/**
 * Condenses analyzer prose down to the one line a node can carry.
 *
 * A mindmap is an index, not the document: one node per idea, with the full
 * wording a click away on the Personalized Note tab. Exploding every summary
 * into a column of leaves is what turned the map into confetti, so this keeps
 * the opening clause — the one carrying the definition — and stops there.
 *
 * The returned line never exceeds `maxChars`. An ellipsis is the last resort,
 * used only when a clause offers no seam at all.
 */
export function condenseToNodeText(
  text: string,
  maxChars: number = MINDMAP_NODE_MAX_CHARS,
): string {
  const opening = splitIntoNodeText(text, maxChars)[0] ?? "";
  if (opening.length <= maxChars) {
    return opening;
  }

  // Keep the most informative candidate that still fits.
  const candidates = SOFT_SEPARATORS.flatMap((separator) => {
    const parts = opening.split(separator).filter((part) => part.trim());
    if (parts.length < 2) {
      return [];
    }
    const packed = packAtoms(
      parts.map((part) => ({ text: part.trim(), glue: " " })),
      maxChars,
    )[0];
    return packed && packed.length <= maxChars ? [packed] : [];
  });

  if (candidates.length > 0) {
    return candidates.reduce((best, item) =>
      item.length > best.length ? item : best,
    );
  }

  return truncateAtBoundary(opening, maxChars);
}

/** Cuts at the last space that fits and marks the cut, never mid-token. */
function truncateAtBoundary(value: string, maxChars: number): string {
  const limit = maxChars - 1;
  const head = value.slice(0, limit);
  const lastSpace = head.lastIndexOf(" ");
  return `${(lastSpace > 0 ? head.slice(0, lastSpace) : head).trimEnd()}…`;
}

const WORD_SPLIT = /\s+/;

/**
 * Drops the trailing context a child node repeats from its parent.
 *
 * The analyzer writes self-contained titles, so a key concept under "Phân kỳ và
 * hội tụ trong Design Thinking" comes back as "Phân kỳ (Diversification) trong
 * Design Thinking" — 47 characters, most of them already on the parent node. In
 * a mindmap the parent supplies that context, so repeating it only makes the
 * node unreadable. Nothing is lost: the stripped words stay visible one level up.
 */
export function stripParentContext(
  childTitle: string,
  parentTitle: string,
): string {
  const childWords = childTitle.trim().split(WORD_SPLIT).filter(Boolean);
  const parentText = ` ${parentTitle.toLowerCase()} `;

  // Longest repeated suffix wins, but never strip down to a single word.
  for (let size = childWords.length - 2; size >= 2; size -= 1) {
    const suffix = childWords.slice(childWords.length - size).join(" ");
    if (parentText.includes(` ${suffix.toLowerCase()} `)) {
      return childWords.slice(0, childWords.length - size).join(" ");
    }
  }

  return childTitle.trim();
}

/** Sorts "Day 01" before "Day 02"; unparsable numbers fall back to id order. */
export function compareDays(a: LearningDay, b: LearningDay): number {
  const left = Number(a.number);
  const right = Number(b.number);
  if (Number.isNaN(left) || Number.isNaN(right)) {
    return a.id.localeCompare(b.id);
  }
  return left - right;
}

/**
 * Adds one analyzed day to the day-cards grid. Re-analyzing a day replaces that
 * card in place, so earlier days stay on the grid instead of being wiped.
 */
export function upsertAnalyzedDay(
  days: readonly LearningDay[],
  day: LearningDay,
): LearningDay[] {
  const isKnownDay = days.some((existing) => existing.id === day.id);
  const next = isKnownDay
    ? days.map((existing) => (existing.id === day.id ? day : existing))
    : [...days, day];
  return [...next].sort(compareDays);
}

export function mapAnalysisToTrace(
  analysis: LearningTraceAnalysis,
  context: {
    shell: DayShell;
    sources: SourceReference[];
    interactionCount: number;
  },
  currentTrace: LearningTrace,
): LearningTrace {
  const day = mapAnalysisToDay(analysis, context);
  return {
    ...currentTrace,
    days: currentTrace.days.map((existing) =>
      existing.id === context.shell.id ? day : existing,
    ),
  };
}

export class LearningTraceApiError extends Error {
  // Plain fields, not TypeScript parameter properties, so this module stays
  // loadable by `node --experimental-strip-types` in research/scripts/ts.
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "LearningTraceApiError";
    this.status = status;
    this.code = code;
  }
}

interface SafeApiError {
  error?: { code?: unknown; message?: unknown };
}

/** Calls the real server route; all provider interaction remains server-side. */
export async function fetchLearningTraceAnalysis(
  input: LearningTraceInput,
): Promise<LearningTraceAnalysis> {
  const response = await fetch("/api/learning-trace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as SafeApiError;
    throw new LearningTraceApiError(
      response.status,
      typeof error.error?.message === "string"
        ? error.error.message
        : "Không thể tổng hợp Learning Trace vào lúc này.",
      typeof error.error?.code === "string" ? error.error.code : undefined,
    );
  }

  return (await response.json()) as LearningTraceAnalysis;
}
