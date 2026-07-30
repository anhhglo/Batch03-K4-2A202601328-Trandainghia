/**
 * Source manifest — ánh xạ `day_code` của một buổi học sang học liệu chính thức.
 *
 * Module này trả lời đúng một câu hỏi, và trả lời nó một cách trung thực:
 * "Với buổi học này, hệ thống có thể đối chiếu nội dung với nguồn chính thức không?"
 *
 * Điểm cốt lõi: KHÔNG BAO GIỜ trả mảng rỗng im lặng. Với phần lớn dữ liệu thật,
 * câu trả lời là "không" — và nơi gọi phải nhận được lý do đọc được để hiển thị
 * cho học viên, thay vì tự suy diễn ra nội dung không có căn cứ.
 *
 * Số liệu nền (research/mining-log.md, chạy trên 1.261 lượt thật):
 *   - 108 lượt (8,6%) có day_code gọi tên Day 1 / Day 2
 *   - 41 lượt (3,3%) có citation NẰM TRONG 29 trang của bộ slide trong data pack
 *   - 397 lượt (31,5%) mang day_code placeholder "New learning material"
 *
 * Owner: Phó Hiếu Anh (Data & Evidence).
 */

export type DocumentKind = "slide-deck" | "transcript";

export interface SourceDocument {
  sourceId: string;
  kind: DocumentKind;
  label: string;
  /** Đường dẫn tương đối tính từ gốc repo. */
  path: string;
  /** Số trang của bản có trong data pack (chỉ với slide-deck). */
  pageCount?: number;
  /** Tiền tố mã đoạn để trích dẫn, ví dụ "T04" cho [T04-021]. */
  segmentPrefix?: string;
}

export type UnmappableReason =
  | "placeholder-day-code"
  | "document-not-in-pack"
  | "unknown-day-code";

export type SourceResolution =
  | {
      status: "mapped";
      dayCode: string;
      day: 1 | 2;
      documents: SourceDocument[];
    }
  | {
      status: "unmappable";
      dayCode: string;
      reason: UnmappableReason;
      /** Câu giải thích hiển thị được cho học viên. */
      hint: string;
    };

export type CitationCheck =
  | { verifiable: true; document: SourceDocument; page: number }
  | { verifiable: false; reason: string };

/**
 * Bộ slide bản hackathon là BẢN RÚT GỌN của slide gốc (29 trang/bộ), trong khi
 * Tutor trong production trích dẫn tới tận trang 96. Vì vậy `day_code` map được
 * KHÔNG đồng nghĩa với citation kiểm chứng được — xem verifyCitation().
 */
const PACK_DECK_PAGES = 29;

const DAY1_DECK: SourceDocument = {
  sourceId: "deck-day01",
  kind: "slide-deck",
  label: "Slide Day 1 — AI & LLM Foundation",
  path: "data/vlearn-pack/slides/d1-slide-hackathon.pdf",
  pageCount: PACK_DECK_PAGES,
};

const DAY2_DECK: SourceDocument = {
  sourceId: "deck-day02",
  kind: "slide-deck",
  label: "Slide Day 2 — Xác định bài toán cho AI",
  path: "data/vlearn-pack/slides/d2-slide-hackathon.pdf",
  pageCount: PACK_DECK_PAGES,
};

/** Sáu transcript bản sạch, mã đoạn dạng [Txx-NNN]. */
const TRANSCRIPTS: SourceDocument[] = [
  {
    sourceId: "transcript-04",
    kind: "transcript",
    label: "Day 1 — Foundation: cách LLM hoạt động",
    path: "data/vlearn-pack/transcript/transcript-04-clean.md",
    segmentPrefix: "T04",
  },
  {
    sourceId: "transcript-06",
    kind: "transcript",
    label: "Foundation: transformer & attention",
    path: "data/vlearn-pack/transcript/transcript-06-clean.md",
    segmentPrefix: "T06",
  },
  {
    sourceId: "transcript-01",
    kind: "transcript",
    label: "Day 2 sáng — Xác định bài toán kinh doanh cho AI",
    path: "data/vlearn-pack/transcript/transcript-01-clean.md",
    segmentPrefix: "T01",
  },
  {
    sourceId: "transcript-02",
    kind: "transcript",
    label: "Day 2 — Chỉ số thành công & mức tự động hoá",
    path: "data/vlearn-pack/transcript/transcript-02-clean.md",
    segmentPrefix: "T02",
  },
  {
    sourceId: "transcript-03",
    kind: "transcript",
    label: "Day 2 chiều — Soi bài toán các nhóm",
    path: "data/vlearn-pack/transcript/transcript-03-clean.md",
    segmentPrefix: "T03",
  },
];

const DAY1_DOCS = [DAY1_DECK, TRANSCRIPTS[0], TRANSCRIPTS[1]];
const DAY2_DOCS = [DAY2_DECK, TRANSCRIPTS[2], TRANSCRIPTS[3], TRANSCRIPTS[4]];

/** Giá trị mặc định của platform, không trỏ tới tài liệu nào. 397/1.261 lượt. */
const PLACEHOLDER_DAY_CODE = "New learning material";

/** day_code gọi tên buổi 1 hoặc buổi 2, ví dụ "day02-c301", "Day1-C302", "Day 2". */
const DAY_PATTERN = /day[\s_-]*0?([12])\b/i;

/**
 * 21 giá trị `day_code` quan sát được trong chatlog. Giữ danh sách tường minh để
 * phân biệt "mã đã biết nhưng tài liệu không có trong pack" với "mã hoàn toàn lạ" —
 * hai tình huống này cần thông báo khác nhau cho học viên.
 */
const KNOWN_DAY_CODES: readonly string[] = [
  "New learning material",
  "day02-c301",
  "Day1-C302",
  "Day1-C401",
  "Day1-D302",
  "Day 1",
  "Day 2",
  "Lecture_material_ms2044ey_k6uor3",
  "Lecture_material_ms203vsq_ob7vqp",
  "Lecture_material_ms2lb2ke_c1je8j",
  "Lecture_material_ms4ahenz_7cpqa2",
  "Lecture_material_ms204i6x_gqwyya",
  "Lecture_material_ms4x7dx1_t0qyxg",
  "Lecture_material_ms5rpr5o_wgl8wy",
  "Lecture_material_ms5r18w1_oe5xlz",
  "Lecture_material_ms2039d0_hnxpxy",
  "Lecture_material_ms204v3b_r9mo78",
  "Lecture_material_ms204yc9_gxpg9y",
  "Lecture_material_ms1ux6r8_nz0abf",
  "Lecture_material_ms1wxott_9fsh7f",
  "Lecture_material_ms203mb1_squf06",
];

/** Ánh xạ một `day_code` sang học liệu chính thức tương ứng. */
export function resolveSources(dayCode: string): SourceResolution {
  const code = dayCode.trim();

  if (code === PLACEHOLDER_DAY_CODE) {
    return {
      status: "unmappable",
      dayCode: code,
      reason: "placeholder-day-code",
      hint:
        "Buổi học này đang mang tên mặc định của hệ thống nên chưa xác định được " +
        "học liệu tương ứng. Learning Trace sẽ chỉ liệt kê các chủ đề bạn đã hỏi, " +
        "không tự sinh phần giải thích.",
    };
  }

  const match = DAY_PATTERN.exec(code);
  if (match) {
    const day = Number(match[1]) as 1 | 2;
    return {
      status: "mapped",
      dayCode: code,
      day,
      documents: day === 1 ? DAY1_DOCS : DAY2_DOCS,
    };
  }

  if (KNOWN_DAY_CODES.includes(code)) {
    return {
      status: "unmappable",
      dayCode: code,
      reason: "document-not-in-pack",
      hint:
        "Học liệu của buổi này không nằm trong bộ tài liệu hệ thống đang có, nên " +
        "không đối chiếu được nội dung. Bạn có thể mở lại lượt chat gốc để xem câu trả lời.",
    };
  }

  return {
    status: "unmappable",
    dayCode: code,
    reason: "unknown-day-code",
    hint: "Không nhận diện được buổi học này trong dữ liệu hiện có.",
  };
}

/**
 * Kiểm tra một citation có đối chiếu được với tài liệu thật hay không.
 *
 * Trả `verifiable: false` trong hai trường hợp, và người gọi phải xử lý khác nhau
 * ở phần hiển thị:
 *   - buổi không map được tài liệu;
 *   - map được nhưng số trang vượt quá bản rút gọn trong pack (Tutor production
 *     trích dẫn tới trang 96, pack chỉ có 29 trang).
 *
 * Chỉ 41/1.261 lượt (3,3%) vượt qua được phép kiểm này.
 */
export function verifyCitation(dayCode: string, page: number): CitationCheck {
  const resolution = resolveSources(dayCode);

  if (resolution.status === "unmappable") {
    return { verifiable: false, reason: resolution.hint };
  }

  if (!Number.isInteger(page) || page < 1) {
    return { verifiable: false, reason: `Số trang không hợp lệ: ${page}` };
  }

  const deck = resolution.documents.find((doc) => doc.kind === "slide-deck");
  if (!deck?.pageCount) {
    return { verifiable: false, reason: "Buổi này không có bộ slide để đối chiếu." };
  }

  if (page > deck.pageCount) {
    return {
      verifiable: false,
      reason:
        `Trang ${page} vượt quá ${deck.pageCount} trang của bản slide hệ thống đang có ` +
        "(bản rút gọn), nên chưa kiểm chứng được nội dung này.",
    };
  }

  return { verifiable: true, document: deck, page };
}

/** Danh sách `day_code` đã biết — dùng cho test và cho việc rà dữ liệu mới. */
export function listKnownDayCodes(): readonly string[] {
  return KNOWN_DAY_CODES;
}
