import "server-only";

import type { LearningTraceSourceInput } from "@/lib/llm/learning-trace-contract";
import type { TutorScenarioSummary } from "@/lib/tutor/types";

export interface TutorScenario {
  id: string;
  title: string;
  description: string;
  dayCode: string;
  defaultPage?: string;
  starterQuestion: string;
  sources: LearningTraceSourceInput[];
}

const tutorScenarios: readonly TutorScenario[] = [
  {
    id: "day02-double-diamond",
    title: "Double Diamond · phân kỳ và hội tụ",
    description: "Khám phá vì sao cần mở rộng rồi thu hẹp trước khi chọn vấn đề.",
    dayCode: "day02-c301",
    defaultPage: "16",
    starterQuestion: "Vì sao Double Diamond cần cả phân kỳ và hội tụ?",
    sources: [
      {
        sourceId: "T01-069",
        label: "Transcript Day02 · T01-069",
        title: "Phân kỳ và hội tụ trong Double Diamond",
        excerpt:
          "Trong design thinking, phân kỳ là mở rộng không gian khám phá để có nhiều ứng viên; hội tụ là quy nạp, tìm điểm chung và sắp xếp theo thứ tự ưu tiên trước khi lựa chọn vấn đề hoặc giải pháp.",
      },
    ],
  },
  {
    id: "day02-impact-effort",
    title: "Impact–Effort · ưu tiên vấn đề",
    description: "Dùng tác động và nỗ lực để khoanh vùng việc đáng làm.",
    dayCode: "day02-c301",
    defaultPage: "17",
    starterQuestion: "Ma trận Impact–Effort giúp ưu tiên vấn đề như thế nào?",
    sources: [
      {
        sourceId: "T01-074",
        label: "Transcript Day02 · T01-074",
        title: "Ma trận tác động – nỗ lực",
        excerpt:
          "Sau khi gom các vấn đề, đánh giá tác động đạt được nếu giải quyết và công sức cần bỏ ra để khoanh vùng việc đáng ưu tiên. Một việc tốn nguồn lực lớn nhưng lợi ích thấp có thể không đáng ưu tiên.",
      },
    ],
  },
  {
    id: "day01-transformer-attention",
    title: "Foundation · Transformer và attention",
    description: "Tìm hiểu Transformer xử lý mối quan hệ giữa các từ trong chuỗi.",
    dayCode: "day01-foundation",
    starterQuestion: "Attention giúp Transformer xử lý câu dài như thế nào?",
    sources: [
      {
        sourceId: "T04-040",
        label: "Transcript Foundation · T04-040",
        title: "Attention trong Transformer",
        excerpt:
          "Transformer nhìn cả cụm văn bản để nhận diện các từ hoặc cụm từ quan trọng và mối liên hệ giữa chúng, thay vì chỉ xử lý tuần tự từng từ. Cách này hỗ trợ xử lý ngữ cảnh dài tốt hơn.",
      },
    ],
  },
] as const;

function cloneScenarioSummary(scenario: TutorScenario): TutorScenarioSummary {
  return {
    id: scenario.id,
    title: scenario.title,
    description: scenario.description,
    dayCode: scenario.dayCode,
    sourceCount: scenario.sources.length,
  };
}

export function listTutorScenarioSummaries(): TutorScenarioSummary[] {
  return tutorScenarios.map(cloneScenarioSummary);
}

export function getTutorScenario(id: string): TutorScenario | undefined {
  return tutorScenarios.find((scenario) => scenario.id === id);
}

export function getTutorScenarioSummary(
  scenario: TutorScenario,
): TutorScenarioSummary {
  return cloneScenarioSummary(scenario);
}
