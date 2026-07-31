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
    // Nhiều source cùng một mạch giảng: đủ căn cứ cho nhiều topic và cho các
    // quan hệ giữa chúng, nên mindmap mới có thể lớn hơn một, hai nhánh.
    id: "day02-problem-framing-full",
    title: "Day02 · Từ phân kỳ đến phát biểu bài toán",
    description:
      "Toàn mạch xác định vấn đề: mở rộng góc nhìn, gom nhóm, đào root cause, rồi ưu tiên.",
    dayCode: "day02-c301",
    starterQuestion:
      "Vì sao quy trình xác định vấn đề phải có cả pha phân kỳ và pha hội tụ?",
    sources: [
      {
        sourceId: "T01-069",
        label: "Transcript Day02 · T01-069",
        title: "Phân kỳ và hội tụ",
        excerpt:
          "Phân kỳ là mở rộng không gian khám phá để có nhiều ứng cử viên; hội tụ là quy nạp lại, tìm điểm chung và sắp xếp theo thứ tự ưu tiên.",
      },
      {
        sourceId: "T01-071",
        label: "Transcript Day02 · T01-071",
        title: "Kỹ thuật của pha phân kỳ",
        excerpt:
          "Bước khám phá và mở góc nhìn dùng các kỹ thuật: quan sát, phỏng vấn, khảo sát, hoặc thu log hành vi người dùng, để thu được nhiều insight nhất có thể.",
      },
      {
        sourceId: "T01-074",
        label: "Transcript Day02 · T01-074",
        title: "Các kỹ thuật của pha hội tụ",
        excerpt:
          "Pha hội tụ gồm nhóm lại, đặt câu hỏi Five Whys để đào lý do sâu hơn, lọc trùng, và ma trận tác động – nỗ lực: với mỗi vấn đề xác định impact đạt được và công sức phải bỏ ra.",
      },
      {
        sourceId: "T01-077",
        label: "Transcript Day02 · T01-077",
        title: "Lọc trùng, gom nhóm và root cause",
        excerpt:
          "Những thứ liệt kê và quan sát được có thể vẫn ở bề mặt, nên đào sâu bằng Five Whys. Có thể liệt kê ra 10 vấn đề nhưng trong đó năm vấn đề cùng một root cause.",
      },
      {
        sourceId: "T01-078",
        label: "Transcript Day02 · T01-078",
        title: "Đánh giá tác động sau khi gom cụm",
        excerpt:
          "Ma trận được dùng sau khi đã gom thành các cụm; các cụm liên quan có thể cùng một giải pháp. Tác động là phần tiết kiệm được hoặc lợi ích đạt thêm nếu giải được vấn đề.",
      },
      {
        sourceId: "T01-079",
        label: "Transcript Day02 · T01-079",
        title: "Bốn cung của ma trận và quick win",
        excerpt:
          "Đặt các vấn đề lên bảng hai trục rồi xếp vào các cung. Nhóm high impact và low effort mang lại quick win sớm; nhóm high effort mà low impact thì bỏ.",
      },
      {
        sourceId: "T01-080",
        label: "Transcript Day02 · T01-080",
        title: "Chốt ưu tiên và phát biểu bài toán",
        excerpt:
          "Khi làm theo nhóm, cả nhóm ngồi vote để cùng chọn ra một vấn đề. Từ kết quả đó mới viết lại phát biểu bài toán.",
      },
    ],
  },
  {
    // Cụm khái niệm nối nhau của Day01: token → context → attention → cách dùng.
    id: "day01-llm-foundation-full",
    title: "Day01 · Token, context và attention",
    description:
      "Mạch khái niệm nền: mô hình dự đoán token, giới hạn ngữ cảnh, và cơ chế chú ý.",
    dayCode: "day01-foundation",
    starterQuestion:
      "Token, context window và attention liên quan với nhau như thế nào?",
    sources: [
      {
        sourceId: "T04-047",
        label: "Transcript Day01 · T04-047",
        title: "Mô hình ngôn ngữ dự đoán, không phải tra cứu",
        excerpt:
          "Bản chất của hệ thống Transformer và các mô hình ngôn ngữ lớn là dự đoán. Nó không biết sẵn tri thức, mà đang dự đoán những từ tiếp theo.",
      },
      {
        sourceId: "T04-049",
        label: "Transcript Day01 · T04-049",
        title: "Token là đơn vị tính",
        excerpt:
          "Token là một đơn vị tính, không phải từ cũng không phải chữ cái. Mô hình không nhìn toàn bộ văn bản một cách nguyên vẹn.",
      },
      {
        sourceId: "T04-051",
        label: "Transcript Day01 · T04-051",
        title: "Context và cửa sổ ngữ cảnh",
        excerpt:
          "Context là toàn bộ thông tin mô hình có thể tiêu thụ trong một lần. Context window là giới hạn ngữ cảnh đó; context càng nhiều thì tiêu thụ được càng nhiều thông tin.",
      },
      {
        sourceId: "T04-052",
        label: "Transcript Day01 · T04-052",
        title: "Context rot",
        excerpt:
          "Càng đưa nhiều ngữ cảnh thì về sau mô hình càng kém đi và thường quên thông tin lúc đầu. Không phải cứ context lớn là tốt.",
      },
      {
        sourceId: "T04-040",
        label: "Transcript Day01 · T04-040",
        title: "Attention đọc cả cụm",
        excerpt:
          "Thay vì lần lượt đọc và dịch từng chữ một, Transformer đọc cả cụm để nhận ra các từ quan trọng và mối liên hệ giữa chúng.",
      },
      {
        sourceId: "T04-055",
        label: "Transcript Day01 · T04-055",
        title: "Khác biệt với cách tiếp cận cũ",
        excerpt:
          "Trước đây mỗi chữ chỉ nhìn được các từ cạnh nó, không gian quan sát hẹp hơn. Nhưng ngữ pháp các ngôn ngữ rất khác nhau, từ quan trọng không nhất thiết đứng cạnh nhau.",
      },
      {
        sourceId: "T04-056",
        label: "Transcript Day01 · T04-056",
        title: "Multi-head attention",
        excerpt:
          "Multi-head là kỹ thuật để thay vì chỉ một con mắt nhìn, mô hình sinh ra nhiều con mắt cùng nhìn, nhằm nhận ra nhiều quy luật và đặc trưng khác nhau.",
      },
      {
        sourceId: "T04-057",
        label: "Transcript Day01 · T04-057",
        title: "Quản lý sự chú ý và context",
        excerpt:
          "Bài học rút ra là hãy quản lý sự chú ý của mô hình và quản lý context đưa vào; làm tốt việc đó thì sản phẩm có năng lực tốt hơn và tiết kiệm chi phí hơn.",
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
