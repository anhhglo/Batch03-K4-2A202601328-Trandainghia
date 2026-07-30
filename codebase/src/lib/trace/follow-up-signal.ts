/**
 * B6 — Phát hiện signal "hỏi lại cùng nội dung sau khi đã được giải thích".
 *
 * Spec §4 cho phép đúng ba loại signal sinh `possible_gap`. Hai loại đọc được
 * trực tiếp từ chữ học viên ("nói rõ chưa hiểu", "phản biện"), riêng loại này
 * là quan hệ giữa HAI lượt nên phải định nghĩa bằng quy tắc — đó là nội dung B6
 * trong research/handoff-data-evidence.md.
 *
 * Vì sao quy tắc phải chặt: định nghĩa thô "hai lượt cùng một trang" gắn cờ
 * 318 lượt (25,2%) và lẫn đầy rác — "d", "gg", "ádlkajdka". Cùng trang KHÔNG
 * đồng nghĩa cùng nội dung, nhất là trang 1 vốn là trang mặc định.
 *
 * Quy tắc hiện tại gắn cờ 29 lượt (2,3%), audit tay 100%: 25 đúng → precision
 * 86,2%. Bảng so sánh các định nghĩa đã thử: research/b6-follow-up-signal.md
 *
 * QUAN TRỌNG: signal này KHÔNG được tự động thành `possible_gap`. Xem ghi chú
 * ở cuối file.
 *
 * Owner: Phó Hiếu Anh (Data & Evidence) · Chốt quy tắc: Nguyễn Xuân Đức (AI Evaluation).
 */

import type { NormalizedInteraction } from "@/lib/trace/normalize";

/**
 * Ranh giới từ nhận biết Unicode. KHÔNG dùng `\b` — `\b` của JavaScript chỉ
 * hiểu ký tự ASCII, nên với tiếng Việt có dấu nó sinh ranh giới ở giữa từ
 * ("vậy" bị cắt tại "ậ"). Bản Python dùng lookaround tương đương và có test
 * đối chiếu chéo bắt buộc hai bản khớp nhau trên toàn bộ 1.261 lượt thật.
 */
const FOLLOW_UP_MARKER =
  /(?<!\p{L})(?:vậy|thế|nhưng|còn|tại sao|sao lại|vẫn|nghĩa là|tức là|ý là|giải thích lại|cụ thể hơn|chi tiết hơn|rõ hơn|dễ hiểu hơn|ví dụ|nói lại|khác gì|thì sao)(?!\p{L})/iu;

/** Câu hỏi về công cụ/nền tảng, không phải về kiến thức bài học. */
const ABOUT_TOOL =
  /bạn được xây dựng|mô hình ngôn ngữ nào|system prompt|model nào|không đọc được|không trả lời được|không giải thích được|báo là|hiển thị|tải|download|giới hạn là bao nhiêu slide|quay lại trang chủ|ocr/iu;

/**
 * Yêu cầu tóm tắt — là nhu cầu hợp lệ nhưng không phải dấu hiệu chưa hiểu.
 * Nhận cả bản không dấu: 10,8% lượt có chữ học viên được gõ hoàn toàn không dấu.
 * Phải khớp từng chữ với SUMMARY_INTENT trong research/scripts/mine_chatlog.py.
 */
const SUMMARY_INTENT =
  /tóm\s*tắt|tóm\s*lược|tổng\s*hợp|tổng\s*kết|ý\s*chính|nội\s*dung\s*chính|ôn\s*tập|ôn\s*lại|điểm\s*quan\s*trọng|tom\s*tat|tong\s*hop|tong\s*ket|y\s*chinh|noi\s*dung\s*chinh|on\s*tap|on\s*lai|diem\s*quan\s*trong/iu;

/** Nỗ lực chèn chỉ thị — phải bị loại khỏi mọi phân tích kiến thức. */
const INJECTION =
  /base64|giải mã chuỗi|gạt hết|bỏ qua hướng dẫn|luật lệ có thể linh hoạt/iu;

/**
 * Câu trả lời của Tutor phải đủ dài mới coi là "đã được giải thích".
 * 272 ký tự = phân vị 10 độ dài câu trả lời trên toàn bộ chatlog.
 */
export const SUBSTANTIVE_ANSWER_CHARS = 272;

/** Hai lượt phải nằm trong cùng một lần ngồi học. */
export const FOLLOW_UP_WINDOW_MINUTES = 30;

/** Chữ học viên dài hơn ngưỡng này gần như luôn là nội dung slide dán vào. */
export const PASTED_TEXT_CHARS = 200;

export interface FollowUpSignal {
  /** Lượt học viên hỏi lại. */
  turnId: string;
  /** Lượt gốc đã được Tutor giải thích trước đó. */
  ofTurnId: string;
  page: number;
  minutesApart: number;
}

/** Lý do một lượt có từ nối tiếp nhưng vẫn không được tính là signal. */
export type FollowUpRejection =
  | "no-student-words"
  | "no-page"
  | "no-follow-up-marker"
  | "pasted-slide-text"
  | "prompt-injection"
  | "about-the-tool"
  | "summary-request"
  | "no-matching-earlier-turn";

function minutesBetween(earlier: string, later: string): number {
  return (Date.parse(later) - Date.parse(earlier)) / 60000;
}

/**
 * Xét một lượt xem có phải "hỏi lại" hay không, trả về lý do khi không phải.
 * Tách riêng khỏi detectFollowUpSignals() để test được từng nhánh loại trừ.
 */
export function classifyFollowUp(
  later: NormalizedInteraction,
  earlierTurns: readonly NormalizedInteraction[],
): { accepted: true; signal: FollowUpSignal } | { accepted: false; reason: FollowUpRejection } {
  if (!later.studentText) return { accepted: false, reason: "no-student-words" };
  if (later.page === undefined) return { accepted: false, reason: "no-page" };
  if (!FOLLOW_UP_MARKER.test(later.studentText)) {
    return { accepted: false, reason: "no-follow-up-marker" };
  }
  if (later.studentText.length > PASTED_TEXT_CHARS) {
    return { accepted: false, reason: "pasted-slide-text" };
  }
  if (INJECTION.test(later.studentText)) return { accepted: false, reason: "prompt-injection" };
  if (ABOUT_TOOL.test(later.studentText)) return { accepted: false, reason: "about-the-tool" };
  if (SUMMARY_INTENT.test(later.studentText)) return { accepted: false, reason: "summary-request" };

  for (const earlier of earlierTurns) {
    if (earlier.page !== later.page) continue;
    if (earlier.tutorAnswerLength < SUBSTANTIVE_ANSWER_CHARS) continue;
    const minutesApart = minutesBetween(earlier.createdAt, later.createdAt);
    if (minutesApart < 0 || minutesApart > FOLLOW_UP_WINDOW_MINUTES) continue;
    return {
      accepted: true,
      signal: {
        turnId: later.turnId,
        ofTurnId: earlier.turnId,
        page: later.page,
        minutesApart: Math.round(minutesApart * 10) / 10,
      },
    };
  }

  return { accepted: false, reason: "no-matching-earlier-turn" };
}

/**
 * Quét một phiên và trả về mọi lượt là "hỏi lại".
 *
 * Đầu vào phải là các lượt CỦA CÙNG MỘT học viên trong CÙNG MỘT buổi —
 * normalizeInteractions() đã đảm bảo điều đó.
 */
export function detectFollowUpSignals(
  interactions: readonly NormalizedInteraction[],
): FollowUpSignal[] {
  const ordered = [...interactions].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );

  const signals: FollowUpSignal[] = [];
  for (let i = 0; i < ordered.length; i += 1) {
    const verdict = classifyFollowUp(ordered[i], ordered.slice(0, i));
    if (verdict.accepted) signals.push(verdict.signal);
  }
  return signals;
}

/**
 * KHÔNG được biến signal này thành possible_gap một cách tự động.
 *
 * Ba lý do, theo thứ tự quan trọng:
 *
 * 1. Precision 86,2% nghĩa là cứ 7 gợi ý thì có 1 cái sai. Spec §4 đặt
 *    cost-of-error ở đây rất cao: nói sai rằng học viên chưa vững làm họ ôn sai
 *    trọng tâm và mất niềm tin.
 *
 * 2. 5/25 lượt đúng là dạng "cho ví dụ đi" — xin thêm ví dụ là hành vi học tập
 *    lành mạnh, không nhất thiết là chưa hiểu.
 *
 * 3. Toàn bộ chatlog chỉ có 8 lượt học viên nói thẳng là chưa hiểu (0,6%).
 *    Không có tập signal mạnh nào để hiệu chỉnh quy tắc này dựa vào.
 *
 * Cách dùng đúng: đưa vào `possible_gaps` với `confidence: "low"`, kèm lý do
 * trỏ về cả hai `turn_id`, và bắt buộc học viên xác nhận trước khi nó được coi
 * là điểm cần ôn. Đây đúng là nhánh "gợi ý cần xác nhận" của spec §4b (G2).
 */
export const FOLLOW_UP_CONFIDENCE = "low" as const;
