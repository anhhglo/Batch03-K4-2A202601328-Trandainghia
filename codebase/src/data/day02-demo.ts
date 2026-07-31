import type { LearningTraceInput } from "@/lib/llm/learning-trace-contract";
import type {
  LearningDay,
  LearningTrace,
  SourceReference,
} from "@/types/learning-trace";

/**
 * Anonymized Day02 input for the live demo. This is request data, not a mock
 * analysis: every displayed topic/review item is returned by the real API.
 */
const officialSources = [
  {
    sourceId: "T01-074",
    label: "Transcript Day02 · T01-074",
    title: "Ma trận tác động – nỗ lực",
    excerpt:
      "Sau khi gom các vấn đề, đánh giá tác động đạt được nếu giải quyết và công sức cần bỏ ra để khoanh vùng việc đáng ưu tiên.",
  },
] as const;

export const day02DemoInput: LearningTraceInput = {
  learnerId: "U0230",
  conversationId: "C0103",
  dayCode: "day02-c301",
  interactions: [
    {
      turnId: "T0132",
      page: "17",
      question:
        'Giải thích đoạn được chọn: "Ma trận Tác động – Nỗ lực (Impact-Effort)".',
      tutorAnswer:
        "Tutor giải thích đây là công cụ ưu tiên theo tác động và nỗ lực, với citation trang 17.",
    },
  ],
  sources: officialSources.map((source) => ({ ...source })),
};

export const day02DemoSources: SourceReference[] = officialSources.map(
  ({ sourceId, ...source }) => ({ id: sourceId, ...source }),
);

export const day02DemoDayShell: Pick<
  LearningDay,
  "id" | "number" | "label" | "title" | "statusLabel" | "slideCount"
> = {
  id: day02DemoInput.dayCode,
  number: "02",
  label: "Day 02",
  title: "Xác định bài toán cho AI",
  statusLabel: "Sẵn sàng tổng hợp",
  slideCount: 29,
};

const initialDay: LearningDay = {
  ...day02DemoDayShell,
  interactionCount: day02DemoInput.interactions.length,
  groundedSourceCount: 0,
  topics: [],
  reviewItems: [],
  sources: day02DemoSources,
  interactions: day02DemoInput.interactions.map((interaction) => ({
    turnId: interaction.turnId,
    page: interaction.page ?? "",
    question: interaction.question,
    topicId: "",
  })),
  unassessableNote: "Learning Trace chưa được tạo.",
};

export const day02DemoTrace: LearningTrace = {
  session: {
    eyebrow: "VLearn · Learning Trace",
    title: "Dấu vết học tập của bạn",
    subtitle:
      "Tổng hợp một buổi học từ lịch sử hỏi Tutor và học liệu chính thức.",
    course: "AI Product & Learning Experience",
    collectionLabel: "Day02 · Dữ liệu đã ẩn danh",
  },
  days: [initialDay],
};
