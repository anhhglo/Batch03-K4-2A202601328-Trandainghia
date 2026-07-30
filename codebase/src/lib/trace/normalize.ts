/**
 * Normalizer — biến log Tutor thô thành input đã sạch cho LLM Analyzer.
 *
 * Đây là cổng duy nhất dữ liệu đi qua trước khi tới model. Nhiệm vụ quan trọng
 * nhất của nó không phải đổi tên trường, mà là TÁCH CHỮ CỦA HỌC VIÊN KHỎI CHỮ
 * CỦA GIẢNG VIÊN.
 *
 * Vì sao: 99,3% lượt hỏi có tiền tố platform kèm đoạn tài liệu học viên bôi đen,
 * và 28,3% là câu hỏi do platform sinh sẵn. Đọc thẳng trường `content`, model sẽ
 * coi chữ trên slide là lời học viên.
 *
 * Đây không phải lo xa. Khi mining evidence, phép đếm chạy trên `content` thô đã
 * thổi phồng số lượt "học viên nói rõ chưa hiểu" lên 6,1 lần (49 so với 8 thật),
 * và gán nhãn logistics cho 7 lượt mà cụm khớp thực ra nằm trong đề bài trên
 * slide. Chi tiết: research/mining-log.md mục 6.
 *
 * Logic bóc text ở đây là bản port của research/scripts/mine_chatlog.py và được
 * test đối chiếu chéo trên toàn bộ 1.261 lượt thật.
 *
 * Owner: Phó Hiếu Anh (Data & Evidence).
 */

import type { SourceResolution } from "@/lib/grounding/source-manifest";

/** Một dòng log thô, khớp schema chatlog của VLearn. */
export interface RawTutorRow {
  turnId: string;
  userId: string;
  conversationId: string;
  dayCode: string;
  /** Nội dung nguyên văn tin nhắn học viên, còn nguyên tiền tố platform. */
  studentContent: string;
  tutorContent: string;
  citations: number[];
  rating?: "up" | "down" | null;
  /** ISO 8601. Bắt buộc: dùng để sắp thứ tự khi phát hiện signal "hỏi lại". */
  createdAt: string;
  /**
   * Độ dài câu trả lời gốc, tính bằng ký tự. Chỉ khai báo khi `tutorContent` đã
   * bị cắt ngắn (fixture cắt còn ≤250 ký tự theo quy định bảo mật data pack).
   * Nếu bỏ trống, độ dài được lấy từ chính `tutorContent`.
   */
  tutorAnswerSourceLength?: number;
}

export interface InteractionFlags {
  /** Câu hỏi do platform sinh sẵn — không mang signal về mức độ hiểu bài. */
  isTemplateQuestion: boolean;
  /** Sau khi bóc hết nội dung học liệu, học viên không gõ chữ nào. */
  hasNoStudentWords: boolean;
  /** Học viên hỏi ≥2 lượt về cùng một trang trong phiên này. */
  repeatsPageInSession: boolean;
}

export interface NormalizedInteraction {
  turnId: string;
  /** Câu hỏi đã bỏ tiền tố "(Trang N, đoạn được chọn: …)". */
  question: string;
  /**
   * CHỈ phần chữ do học viên tự gõ. Mọi suy luận về mức độ hiểu bài phải đọc
   * trường này, không đọc `question`.
   */
  studentText: string;
  page?: number;
  /** Đoạn tài liệu học viên bôi đen — là chữ của giảng viên, không phải của học viên. */
  selection: string;
  tutorAnswer: string;
  citations: number[];
  rating?: "up" | "down";
  /** ISO 8601, mang theo từ log gốc để sắp thứ tự lượt trong phiên. */
  createdAt: string;
  /**
   * Độ dài câu trả lời TRONG NGUỒN, không phải độ dài `tutorAnswer` ở đây.
   * Hai giá trị lệch nhau khi dữ liệu đã bị cắt ngắn để đưa vào repo.
   */
  tutorAnswerLength: number;
  flags: InteractionFlags;
}

export interface LearningTraceInput {
  learnerId: string;
  dayCode: string;
  conversationId: string;
  interactions: NormalizedInteraction[];
  /** Kết quả ánh xạ học liệu — quyết định có được sinh giải thích hay không. */
  sourceResolution: SourceResolution;
}

export interface NormalizeFilter {
  learnerId: string;
  dayCode: string;
  conversationId?: string;
}

/** Tiền tố platform tự chèn khi học viên bôi đen một đoạn rồi hỏi. */
const SELECTION_PREFIX = /^\(Trang\s+(\d+),\s*đoạn được chọn:\s*"([\s\S]*?)"\)\s*/;

/** Câu hỏi platform sinh sẵn khi học viên chỉ bôi đen mà không gõ gì. */
const TEMPLATE_QUESTION = /Giải thích đoạn bôi đen ở Trang\s+\d+/i;

/** Câu template kèm phần trích nội dung slide phía sau — phải bỏ cả phần trích. */
const TEMPLATE_WITH_QUOTE = /Giải thích đoạn bôi đen ở Trang\s+\d+\s*:?\s*("[\s\S]*?"|[\s\S]*)$/i;

/** Đoạn còn lại trong ngoặc kép đều là học liệu dán vào, không phải chữ học viên. */
const QUOTED_SPAN = /"[^"]*"|“[^”]*”/g;

export interface StrippedSelection {
  question: string;
  page?: number;
  selection: string;
}

/** Tách tiền tố "(Trang N, đoạn được chọn: …)" khỏi câu hỏi thật. */
export function stripSelection(content: string): StrippedSelection {
  const match = SELECTION_PREFIX.exec(content);
  if (!match) {
    return { question: content.trim(), selection: "" };
  }
  return {
    question: content.slice(match[0].length).trim(),
    page: Number(match[1]),
    selection: match[2],
  };
}

/**
 * Lấy phần chữ do chính học viên gõ. Ba lớp bóc, theo đúng thứ tự:
 *   1. câu template kèm nội dung slide trích sau dấu hai chấm;
 *   2. mọi đoạn còn lại nằm trong ngoặc kép;
 *   3. chuẩn hoá khoảng trắng.
 *
 * Trả về chuỗi rỗng nghĩa là học viên không viết gì — chỉ bôi đen rồi bấm nút.
 */
export function extractStudentText(question: string): string {
  const withoutTemplate = question.replace(TEMPLATE_WITH_QUOTE, " ");
  const withoutQuotes = withoutTemplate.replace(QUOTED_SPAN, " ");
  return withoutQuotes.split(/\s+/).filter(Boolean).join(" ");
}

/**
 * Lọc log theo học viên + buổi, rồi chuẩn hoá thành input cho LLM Analyzer.
 *
 * Ràng buộc riêng tư (spec §4): chỉ dữ liệu của học viên đang xem, trong phạm vi
 * buổi được chọn. Hàm này là nơi ràng buộc đó được thực thi — mọi dòng không khớp
 * `learnerId` đều bị loại trước khi bất kỳ thứ gì khác chạy.
 *
 * `sourceResolution` được truyền vào thay vì tự gọi resolveSources(), để hàm này
 * thuần và test được độc lập với manifest.
 */
export function normalizeInteractions(
  rows: readonly RawTutorRow[],
  filter: NormalizeFilter,
  sourceResolution: SourceResolution,
): LearningTraceInput {
  const scoped = rows.filter(
    (row) =>
      row.userId === filter.learnerId &&
      row.dayCode === filter.dayCode &&
      (filter.conversationId === undefined ||
        row.conversationId === filter.conversationId),
  );

  const pageCounts = new Map<number, number>();
  for (const row of scoped) {
    const { page } = stripSelection(row.studentContent);
    if (page !== undefined) {
      pageCounts.set(page, (pageCounts.get(page) ?? 0) + 1);
    }
  }

  const interactions: NormalizedInteraction[] = scoped.map((row) => {
    const { question, page, selection } = stripSelection(row.studentContent);
    const studentText = extractStudentText(question);

    return {
      turnId: row.turnId,
      question,
      studentText,
      page,
      selection,
      tutorAnswer: row.tutorContent,
      citations: [...row.citations],
      rating: row.rating ?? undefined,
      createdAt: row.createdAt,
      tutorAnswerLength: row.tutorAnswerSourceLength ?? row.tutorContent.length,
      flags: {
        isTemplateQuestion: TEMPLATE_QUESTION.test(row.studentContent),
        hasNoStudentWords: studentText.length === 0,
        repeatsPageInSession: page !== undefined && (pageCounts.get(page) ?? 0) >= 2,
      },
    };
  });

  return {
    learnerId: filter.learnerId,
    dayCode: filter.dayCode,
    conversationId:
      filter.conversationId ?? scoped[0]?.conversationId ?? "",
    interactions,
    sourceResolution,
  };
}
