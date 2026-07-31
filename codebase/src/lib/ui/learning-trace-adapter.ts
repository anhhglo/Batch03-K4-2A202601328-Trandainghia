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

function resolveRelationshipLabel(
  topicId: string,
  analysis: LearningTraceAnalysis,
): string {
  const relationship = analysis.relationships.find(
    (item) => item.fromTopicId === topicId || item.toTopicId === topicId,
  );
  return relationship?.label ?? "Chưa có liên kết có căn cứ";
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

  const unassessableNote =
    analysis.unassessableItems.length > 0
      ? analysis.unassessableItems.map((item) => item.reason).join(" ")
      : "Không có tương tác nào bị loại khỏi gợi ý ôn tập.";

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
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "LearningTraceApiError";
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
