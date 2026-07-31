import type { LearningTraceInput } from "@/lib/llm/learning-trace-contract";
import type {
  LearningDay,
  LearningTrace,
  SourceReference,
} from "@/types/learning-trace";

/**
 * Anonymized Day02 request for the live demo. It is input data only: every
 * topic, review item and relationship displayed in the UI comes from the real
 * API response.
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

function getDayLabel(dayCode: string): string {
  const match = /day\D*0?(\d+)/i.exec(dayCode);
  return match ? `Day ${match[1].padStart(2, "0")}` : "Ngày demo";
}

export function createDemoSources(
  input: LearningTraceInput,
): SourceReference[] {
  return input.sources.map(({ sourceId, ...source }) => ({
    id: sourceId,
    ...source,
  }));
}

export function createDemoDayShell(
  input: LearningTraceInput,
): Pick<
  LearningDay,
  "id" | "number" | "label" | "title" | "statusLabel" | "slideCount"
> {
  const label = getDayLabel(input.dayCode);
  return {
    id: input.dayCode,
    number: label.replace("Day ", ""),
    label,
    title: "Learning Trace thử nghiệm",
    statusLabel: "Sẵn sàng tổng hợp",
    slideCount: 29,
  };
}

export function createDemoTrace(input: LearningTraceInput): LearningTrace {
  const shell = createDemoDayShell(input);
  const sources = createDemoSources(input);

  return {
    session: {
      eyebrow: "VLearn · Learning Trace",
      title: "Dấu vết học tập của bạn",
      subtitle:
        "Tổng hợp một buổi học từ lịch sử hỏi Tutor và học liệu chính thức.",
      course: "AI Product & Learning Experience",
      collectionLabel: `${shell.label} · Dữ liệu demo đã ẩn danh`,
    },
    days: [
      {
        ...shell,
        interactionCount: input.interactions.length,
        groundedSourceCount: 0,
        topics: [],
        reviewItems: [],
        sources,
        interactions: input.interactions.map((interaction) => ({
          turnId: interaction.turnId,
          page: interaction.page ?? "",
          question: interaction.question,
          topicId: "",
        })),
        unassessableNote: "Learning Trace chưa được tạo.",
      },
    ],
  };
}

export const day02DemoDayShell = createDemoDayShell(day02DemoInput);
export const day02DemoSources = createDemoSources(day02DemoInput);
export const day02DemoTrace = createDemoTrace(day02DemoInput);
