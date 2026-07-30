/**
 * Fixture cho Learning Trace — dữ liệu đầu vào thật để chạy POST /api/learning-trace
 * mà không cần DB.
 *
 * Ba fixture, không phải một, vì spec §6 đòi bốn đường đi của trải nghiệm và mỗi
 * đường cần một hình dạng dữ liệu khác nhau. Cả ba đều lấy từ chatlog thật
 * (mã ẩn danh U/C/T), câu hỏi giữ nguyên văn.
 *
 * Câu trả lời của Tutor được CẮT NGẮN còn ~200 ký tự theo quy định bảo mật data
 * pack ("trích ngắn để minh hoạ, không dán nguyên văn dài"). Khi chạy thật với
 * toàn văn, Tuấn Anh đọc trực tiếp từ nguồn qua normalizeInteractions().
 *
 * Owner: Phó Hiếu Anh (Data & Evidence).
 */

import type { RawTutorRow } from "@/lib/trace/normalize";

/**
 * HAPPY PATH — `U0323` × `day02-c301`, 4 lượt, cùng hội thoại `C0302`.
 *
 * Vì sao chọn phiên này:
 *   - `day02-c301` nằm trong 8,6% day_code ánh xạ được sang bộ slide Day 2;
 *   - cả 4 lượt đều có citation, và trang 16/17 nằm trong 29 trang của pack nên
 *     citation kiểm chứng được — chỉ 3,3% lượt trong toàn bộ chatlog đạt được điều này;
 *   - `T0611` rồi `T0223` là hai lượt hỏi về CÙNG Trang 16, trong đó lượt sau hỏi
 *     lại chính khái niệm vừa được giải thích → signal "hỏi lại" hợp lệ theo spec §4,
 *     tức phiên này sinh ra được possible_gap có bằng chứng thật.
 */
export const day02HappyRows: RawTutorRow[] = [
  {
    turnId: "T0611",
    userId: "U0323",
    conversationId: "C0302",
    dayCode: "day02-c301",
    studentContent:
      '(Trang 16, đoạn được chọn: "Mô hình Double Diamond — Don Norman / British Design Council 2005") giải thích hình ảnh này',
    tutorContent:
      'Mô hình "Double Diamond" (Hai viên kim cương) là khung tư duy giúp tách biệt quá trình tư duy mở rộng và thu hẹp thành bốn giai đoạn: Discover, Define, Develop, Deliver.',
    citations: [16],
    rating: null,
  },
  {
    turnId: "T0223",
    userId: "U0323",
    conversationId: "C0302",
    dayCode: "day02-c301",
    studentContent:
      '(Trang 16, đoạn được chọn: "vậy nó liên quan gì đến diamond ?") vậy nó liên quan gì đến diamond ?',
    tutorContent:
      'Tên gọi "Double Diamond" xuất phát từ hình dạng của hai biểu đồ được ghép lại: mỗi viên kim cương thể hiện một lần mở rộng rồi thu hẹp phạm vi suy nghĩ.',
    citations: [16],
    rating: null,
  },
  {
    turnId: "T1067",
    userId: "U0323",
    conversationId: "C0302",
    dayCode: "day02-c301",
    studentContent: '(Trang 17, đoạn được chọn: "Affinity Mapping") là gì',
    tutorContent:
      "**Affinity Mapping** (sơ đồ gom nhóm) là kỹ thuật thuộc giai đoạn Define, dùng để gom các quan sát rời rạc thành nhóm chủ đề có ý nghĩa.",
    citations: [17],
    rating: null,
  },
  {
    turnId: "T0326",
    userId: "U0323",
    conversationId: "C0302",
    dayCode: "day02-c301",
    studentContent:
      '(Trang 17, đoạn được chọn: "Ma trận Tác động – Nỗ lực Impact-Effort)\n· Biểu quyết bằng chấm tròn Dot Voting") Giải thích chi tiết 3 nội dung này',
    tutorContent:
      "Trong giai đoạn **Define (Hội tụ)** của Double Diamond, ba kỹ thuật này giúp nhóm chọn ra vấn đề đáng giải quyết nhất thay vì làm tất cả.",
    citations: [17],
    rating: null,
  },
];

/**
 * LOW-CONFIDENCE — `U0211` × `day02-c301`, đúng 1 lượt.
 *
 * Đây là hình dạng của ĐA SỐ dữ liệu thật: 292/563 phiên (51,9%) chỉ có một lượt
 * hỏi. Kết quả đúng cho fixture này là chỉ có "đã tìm hiểu", `possible_gaps` rỗng
 * và ghi rõ chưa đủ dữ liệu — không được suy ra học viên yếu.
 */
export const thinSessionRows: RawTutorRow[] = [
  {
    turnId: "T0209",
    userId: "U0211",
    conversationId: "C0250",
    dayCode: "day02-c301",
    studentContent: '(Trang 8, đoạn được chọn: "dich nghia") dich nghia',
    tutorContent:
      "Đoạn bạn chọn ở trang 8 nói về việc chuyển yêu cầu mơ hồ của người dùng thành một phát biểu bài toán cụ thể.",
    citations: [8],
    rating: null,
  },
];

/**
 * FAILURE / KHÔNG CÓ CĂN CỨ — `U0005` × `New learning material`, 2 lượt.
 *
 * `day_code` là giá trị mặc định của platform (397/1.261 lượt, 31,5%) nên không
 * ánh xạ được sang tài liệu nào. Đáng chú ý: lượt `T0742` có Tutor trích dẫn
 * trang 62, nhưng vì không biết đó là tài liệu gì nên citation đó KHÔNG kiểm
 * chứng được — hệ thống không được phép chép lại nó như thể đã xác minh.
 *
 * Kết quả đúng: liệt kê chủ đề đã hỏi, không sinh giải thích, không sinh quan hệ
 * mindmap, và báo rõ giới hạn cho học viên.
 */
export const unmappableSourceRows: RawTutorRow[] = [
  {
    turnId: "T0022",
    userId: "U0005",
    conversationId: "C0555",
    dayCode: "New learning material",
    studentContent:
      '(Trang 1, đoạn được chọn: "sao tôi không thấy tài liệu của thầy cô vậy") sao tôi không thấy tài liệu của thầy cô vậy',
    tutorContent:
      "Mình chỉ hỗ trợ nội dung học tập trong tài liệu đang mở. Về việc truy cập tài liệu, bạn liên hệ TA của lớp nhé.",
    citations: [1],
    rating: null,
  },
  {
    turnId: "T0742",
    userId: "U0005",
    conversationId: "C0555",
    dayCode: "New learning material",
    studentContent:
      '(Trang 15, đoạn được chọn: "giải thích slide 15 cho tôi") giải thích slide 15 cho tôi',
    tutorContent:
      "Trang 15 trình bày cách chia nhỏ một bài toán lớn thành các quyết định mà hệ thống phải đưa ra.",
    citations: [62],
    rating: null,
  },
];

export const fixtures = {
  day02Happy: day02HappyRows,
  thinSession: thinSessionRows,
  unmappableSource: unmappableSourceRows,
} as const;

export type FixtureName = keyof typeof fixtures;
