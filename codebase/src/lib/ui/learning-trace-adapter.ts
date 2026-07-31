import { mockLearningTrace } from "@/data/mock-learning-trace";
import type {
  ConfidenceLevel,
  LearningDay,
  LearningTrace,
  SourceReference,
} from "@/types/learning-trace";

/**
 * Provisional mirror of workflow.md §3 (`LearningTraceAnalysis`). Trần Đại Nghĩa
 * owns the frozen version at contracts/learning-trace-output.schema.json — once
 * that file exists, replace these types with ones generated/copied from it
 * instead of extending these by guesswork.
 */
export interface LearningTraceRequestInput {
  learnerId: string;
  dayCode: string;
  conversationId: string;
  interactions: Array<{
    turnId: string;
    question: string;
    tutorAnswer: string;
    page?: string;
  }>;
  sources: SourceReference[];
}

export interface AnalysisTopic {
  id: string;
  title: string;
  summary: string;
  /** One or more grounding source ids from the request's `sources[]`. */
  sourceIds: string[];
}

export interface AnalysisReviewItem {
  id: string;
  title: string;
  confidence: ConfidenceLevel;
  reason: string;
  turnId: string;
  sourceIds: string[];
  relatedTopicId: string;
}

export interface AnalysisUnassessableItem {
  turnId: string;
  reason: string;
}

export interface MindmapRelationship {
  topicId: string;
  label: string;
}

export interface LearningTraceAnalysis {
  dayCode: string;
  topics: AnalysisTopic[];
  reviewItems: AnalysisReviewItem[];
  unassessableItems: AnalysisUnassessableItem[];
  relationships: MindmapRelationship[];
  meta: {
    model: string;
    promptVersion: string;
    groundedOnly: boolean;
  };
}

/** Display metadata the analyzer doesn't produce — comes from the day directory/request, not the LLM. */
export type DayShell = Pick<
  LearningDay,
  "id" | "number" | "label" | "title" | "statusLabel" | "slideCount"
>;

const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  medium: "Cần xác nhận",
  low: "Tín hiệu yếu",
};

const FALLBACK_SLIDE = "Không có slide tham chiếu";
const FALLBACK_TRANSCRIPT = "Không có transcript tham chiếu";

function resolveSourceLabels(
  sourceIds: string[],
  sources: SourceReference[],
): { slide: string; transcript: string } {
  const labels = sourceIds
    .map((id) => sources.find((source) => source.id === id)?.label)
    .filter((label): label is string => Boolean(label));

  const slide = labels.find((label) => label.startsWith("Slide"));
  const transcript = labels.find((label) => label.startsWith("["));

  return {
    slide: slide ?? labels[0] ?? FALLBACK_SLIDE,
    transcript: transcript ?? labels[1] ?? FALLBACK_TRANSCRIPT,
  };
}

function resolvePrimarySourceLabel(
  sourceIds: string[],
  sources: SourceReference[],
): string {
  const label = sourceIds
    .map((id) => sources.find((source) => source.id === id)?.label)
    .find((value): value is string => Boolean(value));
  return label ?? FALLBACK_SLIDE;
}

/**
 * Maps one LLM analysis result (per day/conversation) onto the shape the UI
 * already renders. Pure function — no fetch, no state — so it's easy to unit
 * test against fixtures and reuse for both the mock path and the real API path.
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
    const { slide, transcript } = resolveSourceLabels(
      topic.sourceIds,
      sources,
    );
    const relationship = analysis.relationships.find(
      (rel) => rel.topicId === topic.id,
    );

    return {
      id: topic.id,
      title: topic.title,
      summary: topic.summary,
      slide,
      transcript,
      learnedLabel: "Đã tìm hiểu",
      mindmapChild: relationship?.label ?? "Chưa có liên kết ghi nhận",
    };
  });

  const reviewItems = analysis.reviewItems.map((item) => ({
    id: item.id,
    title: item.title,
    confidence: item.confidence,
    confidenceLabel: CONFIDENCE_LABEL[item.confidence],
    reason: item.reason,
    evidenceTurnId: item.turnId,
    slide: resolvePrimarySourceLabel(item.sourceIds, sources),
    relatedTopicId: item.relatedTopicId,
  }));

  const groundedSourceIds = new Set([
    ...analysis.topics.flatMap((topic) => topic.sourceIds),
    ...analysis.reviewItems.flatMap((item) => item.sourceIds),
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

/** Replaces the matching day (by `dayCode` === `LearningDay.id`) inside a trace. */
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
      existing.id === analysis.dayCode ? day : existing,
    ),
  };
}

export class LearningTraceApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "LearningTraceApiError";
  }
}

/**
 * Real call to Trần Tuấn Anh's `POST /api/learning-trace` (contracts/route.ts).
 * Not wired into LearningTraceApp yet — the endpoint doesn't exist until Phase 2.
 */
export async function fetchLearningTraceAnalysis(
  input: LearningTraceRequestInput,
): Promise<LearningTraceAnalysis> {
  const response = await fetch("/api/learning-trace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new LearningTraceApiError(
      response.status,
      detail || `Learning trace request failed (${response.status})`,
    );
  }

  return response.json() as Promise<LearningTraceAnalysis>;
}

/**
 * Phase 1 fixture: a hand-written analysis for Day02 shaped exactly like the
 * future API response, built from the same facts as mock-learning-trace.ts.
 * Lets the mapping pipeline (mapAnalysisToDay/mapAnalysisToTrace) run end to
 * end before the LLM analyzer or API route exist — matches CP3's "chạy được
 * với fixture Day02" requirement.
 */
export const mockDay02Analysis: LearningTraceAnalysis = {
  dayCode: "day-02",
  topics: [
    {
      id: "problem-statement",
      title: "Problem Statement",
      summary:
        "Chuyển một yêu cầu mơ hồ thành phát biểu rõ người dùng, nhu cầu, trở ngại và kết quả mong muốn.",
      sourceIds: ["day02-slide-25"],
    },
    {
      id: "impact-effort",
      title: "Ma trận Impact–Effort",
      summary:
        "So sánh các ứng viên theo quy mô ảnh hưởng, tần suất và nỗ lực để ưu tiên đúng lát cắt.",
      sourceIds: ["day02-slide-16", "day02-transcript"],
    },
    {
      id: "automation",
      title: "Mức độ tự động hóa",
      summary:
        "Chọn augment, conditional hay automate dựa trên hậu quả khi hệ thống đưa ra quyết định sai.",
      sourceIds: ["day02-slide-18"],
    },
  ],
  reviewItems: [
    {
      id: "day02-augment-vs-automate",
      title: "Phân biệt Augment và Automate",
      confidence: "medium",
      reason: "Bạn đã hỏi lại về mức tự động hóa sau phần giải thích của Tutor.",
      turnId: "T0241",
      sourceIds: ["day02-slide-18"],
      relatedTopicId: "automation",
    },
    {
      id: "day02-estimate-impact",
      title: "Ước lượng impact trước khi chọn giải pháp",
      confidence: "low",
      reason: "Bạn hỏi cách tính impact một lần; chưa có thêm tương tác để kết luận.",
      turnId: "T0234",
      sourceIds: ["day02-slide-16"],
      relatedTopicId: "impact-effort",
    },
  ],
  unassessableItems: [
    {
      turnId: "T0198",
      reason: "Một lượt hỏi ngắn chưa đủ ngữ cảnh đã được giữ ngoài phần gợi ý ôn tập.",
    },
  ],
  relationships: [
    { topicId: "problem-statement", label: "User · Pain · Outcome" },
    { topicId: "impact-effort", label: "Impact × Frequency × Cost" },
    { topicId: "automation", label: "Augment · Conditional · Automate" },
  ],
  meta: {
    model: "mock-fixture",
    promptVersion: "v1",
    groundedOnly: true,
  },
};

function toDayShell(day: LearningDay): DayShell {
  const { id, number, label, title, statusLabel, slideCount } = day;
  return { id, number, label, title, statusLabel, slideCount };
}

const mockDay02 = mockLearningTrace.days.find((day) => day.id === "day-02");
if (!mockDay02) {
  throw new Error("mock-learning-trace.ts is missing day-02, fixture is stale");
}

export const mockDay02Shell: DayShell = toDayShell(mockDay02);
export const mockDay02Sources: SourceReference[] = mockDay02.sources;
export const mockDay02InteractionCount: number = mockDay02.interactionCount;
