/**
 * B2 — Gom các lượt "chưa đủ dữ liệu để kết luận" thành danh sách có truy vết.
 *
 * Spec §4 đòi `unassessable_items` là một trong ba nhóm kết quả, và đòi "mỗi
 * nhận định trỏ được về lượt chat liên quan". Muốn giữ được lời hứa đó thì mỗi
 * mục phải mang `turnId` riêng — tức phải là MẢNG, không thể là một câu ghi chú
 * chung cho cả buổi.
 *
 * Dữ liệu thật nói rõ điều này (research/b2-b3-output-shape.md):
 *   - 518/563 phiên (92,0%) có ít nhất một lượt không đánh giá được;
 *   - 246/563 phiên (43,7%) có TỪ HAI lượt trở lên;
 *   - phiên nhiều nhất có 30 lượt.
 *
 * Với 43,7% số phiên, một chuỗi `unassessableNote` không thể trỏ về lượt nào cả.
 *
 * Owner: Phó Hiếu Anh (Data & Evidence) · Chốt kiểu output: Trần Đại Nghĩa + Hoàng Trọng Đại.
 */

import type { LearningTraceInput, NormalizedInteraction } from "@/lib/trace/normalize";

export type UnassessableReason =
  /** Không gõ chữ nào VÀ đoạn bôi đen cũng không đủ để biết chủ đề. 32 lượt (2,5%). */
  | "template-only"
  /** Câu quá ngắn, chỉ chào hỏi, và không có đoạn bôi đen làm chỗ dựa. 77 lượt (6,1%). */
  | "too-short"
  /** Câu hỏi logistics — spec §5 kịch bản 5 loại khỏi trace kiến thức. 9 lượt (0,7%). */
  | "logistics"
  /** Nỗ lực chèn chỉ thị hoặc đòi việc ngoài thẩm quyền. 11 lượt (0,9%). */
  | "out-of-scope"
  /** Không ánh xạ được `day_code` sang học liệu nào. 1.038 lượt (82,3%). */
  | "source-unmappable";

export interface UnassessableItem {
  turnId: string;
  reason: UnassessableReason;
  /** Câu giải thích hiển thị được cho học viên, không phải mã lỗi. */
  explanation: string;
  page?: number;
}

/** Câu hỏi logistics, không phải nội dung bài học. */
const LOGISTICS =
  /deadline|hạn\s*nộp|nộp\s*bài|điểm\s*danh|tải\s*(xuống|về)|download|link\s|đăng\s*ký|lịch\s*học|phòng\s*học/iu;

/** Chèn chỉ thị hoặc đòi hệ thống làm việc ngoài phạm vi. */
const OUT_OF_SCOPE =
  /base64|giải mã chuỗi|gạt hết|bỏ qua hướng dẫn|luật lệ có thể linh hoạt|chấm điểm|xếp hạng|so với các bạn/iu;

/** Dưới ngưỡng này thì phần chữ học viên gõ không đủ để biết đang hỏi gì. */
export const MIN_MEANINGFUL_CHARS = 8;

/**
 * Đoạn bôi đen dài hơn ngưỡng này đủ để xác định CHỦ ĐỀ, kể cả khi học viên
 * không gõ gì hoặc chỉ gõ vài chữ.
 *
 * Đây là điểm test bắt được: lượt T1067 có studentText "là gì" (5 ký tự) nhưng
 * đoạn bôi đen là "Affinity Mapping". Cộng lại thì đó là câu hỏi rõ nghĩa về
 * Affinity Mapping. Chấm "quá ngắn" chỉ dựa vào chữ học viên gõ sẽ vứt nhầm
 * chủ đề mà học viên thật sự đã tìm hiểu.
 *
 * Ranh giới đúng theo spec §4: đoạn bôi đen đủ để xếp vào `topics_explored`,
 * nhưng KHÔNG đủ để kết luận mức độ hiểu — phần đó cần chữ học viên tự gõ.
 * Xem canAssessUnderstanding().
 */
export const MIN_SELECTION_CHARS = 8;

const EXPLANATIONS: Record<UnassessableReason, string> = {
  "template-only":
    "Lượt này không có câu hỏi và đoạn tài liệu được chọn cũng quá ngắn, nên chưa đủ " +
    "căn cứ để xác định bạn đang tìm hiểu chủ đề nào.",
  "too-short":
    "Nội dung lượt này quá ngắn để xác định bạn đang tìm hiểu chủ đề nào.",
  logistics:
    "Lượt này hỏi về thủ tục lớp học, không thuộc nội dung kiến thức nên không đưa vào " +
    "bản tổng hợp.",
  "out-of-scope":
    "Lượt này nằm ngoài phạm vi tổng hợp kiến thức của Learning Trace.",
  "source-unmappable":
    "Chưa xác định được học liệu chính thức của buổi này nên không đối chiếu được nội dung.",
};

/**
 * Xác định vì sao một lượt không đánh giá được. Trả `null` nếu lượt đó dùng được.
 *
 * Thứ tự xét là cố ý và phải giữ nguyên: nó khớp với thứ tự trong
 * `research/scripts/mine_chatlog.py`, nên mọi con số trong
 * `research/b2-b3-output-shape.md` mới kiểm lại được. Đổi thứ tự thì phải đo lại.
 */
export function classifyUnassessable(
  interaction: NormalizedInteraction,
  sourceIsMappable: boolean,
): UnassessableReason | null {
  const { studentText, selection } = interaction;
  const hasTopicAnchor = selection.trim().length >= MIN_SELECTION_CHARS;

  if (OUT_OF_SCOPE.test(studentText)) return "out-of-scope";
  if (LOGISTICS.test(studentText)) return "logistics";
  if (!studentText && !hasTopicAnchor) return "template-only";
  if (studentText.length < MIN_MEANINGFUL_CHARS && !hasTopicAnchor) return "too-short";
  if (!sourceIsMappable) return "source-unmappable";
  return null;
}

/**
 * Lượt này có đủ căn cứ để nói gì đó về MỨC ĐỘ HIỂU của học viên không?
 *
 * Khác với classifyUnassessable(): một lượt có thể xếp được vào `topics_explored`
 * nhờ đoạn bôi đen, nhưng vẫn không được dùng để suy ra `possible_gaps` vì học
 * viên không diễn đạt gì. 355/1.261 lượt (28,2%) rơi vào trường hợp này.
 */
export function canAssessUnderstanding(interaction: NormalizedInteraction): boolean {
  return interaction.studentText.trim().length >= MIN_MEANINGFUL_CHARS;
}

/**
 * Gom mọi lượt không đánh giá được trong một phiên.
 *
 * Trả mảng rỗng nghĩa là cả phiên đều dùng được — chỉ 45/563 phiên (8,0%) như vậy.
 */
export function collectUnassessableItems(input: LearningTraceInput): UnassessableItem[] {
  const mappable = input.sourceResolution.status === "mapped";

  const items: UnassessableItem[] = [];
  for (const interaction of input.interactions) {
    const reason = classifyUnassessable(interaction, mappable);
    if (!reason) continue;
    items.push({
      turnId: interaction.turnId,
      reason,
      explanation:
        reason === "source-unmappable" && input.sourceResolution.status === "unmappable"
          ? input.sourceResolution.hint
          : EXPLANATIONS[reason],
      page: interaction.page,
    });
  }
  return items;
}

/** Các lượt còn lại — dùng được để rút chủ đề và signal. */
export function assessableInteractions(
  input: LearningTraceInput,
): NormalizedInteraction[] {
  const mappable = input.sourceResolution.status === "mapped";
  return input.interactions.filter(
    (interaction) => classifyUnassessable(interaction, mappable) === null,
  );
}
