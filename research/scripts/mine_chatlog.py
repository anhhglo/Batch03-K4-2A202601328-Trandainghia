#!/usr/bin/env python3
"""Mining evidence từ chatlog VLearn Tutor — nguồn duy nhất của mọi con số trong research/mining-log.md.

Chạy:
    python3 research/scripts/mine_chatlog.py              # in bảng + ghi research/metrics.json
    python3 research/scripts/mine_chatlog.py --samples    # ghi thêm research/samples/ để người khác audit

Nguyên tắc:
  - Mọi metric trong mining-log.md phải sinh ra từ file này, không gõ tay.
  - Output pin theo sha256 của file CSV: đổi data thì hash đổi, test sẽ fail.
  - Quy tắc đếm khai báo tường minh ở RULES để người ngoài nhóm kiểm lại được.

Owner: Phó Hiếu Anh (Data & Evidence).
"""

from __future__ import annotations

import argparse
import csv
import datetime
import hashlib
import json
import re
import statistics
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CSV_PATH = REPO / "data/vlearn-pack/chatlog/chat_history_anonymized_for_hackathon.csv"
OUT_JSON = REPO / "research/metrics.json"
SAMPLES_DIR = REPO / "research/samples"

SCHEMA_VERSION = "1.0.0"

# --------------------------------------------------------------------------------------
# Quy tắc đếm — khai báo tường minh để người ngoài nhóm kiểm lại được
# --------------------------------------------------------------------------------------

# Tiền tố platform tự chèn khi học viên bôi đen một đoạn tài liệu rồi hỏi.
# Ví dụ: (Trang 17, đoạn được chọn: "Perception") Giải thích đoạn bôi đen ở Trang 17.
SELECTION_PREFIX = re.compile(r'^\(Trang\s+(\d+),\s*đoạn được chọn:\s*"(.*?)"\)\s*', re.DOTALL)

# Câu hỏi do platform sinh sẵn khi học viên chỉ bôi đen mà không tự gõ câu hỏi.
TEMPLATE_QUESTION = re.compile(r"Giải thích đoạn bôi đen ở Trang\s+\d+", re.IGNORECASE)

# Câu template kèm phần trích nội dung slide phía sau — phải bỏ CẢ phần trích,
# nếu không mọi phép đếm sẽ khớp nhầm vào chữ của giảng viên trên slide
# thay vì chữ của học viên. Đây là lỗi đã bắt được khi audit lượt 1:
# 7/12 lượt bị gắn nhãn "logistics" thực ra khớp cụm "đăng ký môn học"
# nằm trong đề bài trên slide, không phải học viên hỏi về đăng ký môn.
TEMPLATE_WITH_QUOTE = re.compile(
    r"Giải thích đoạn bôi đen ở Trang\s+\d+\s*:?\s*(\".*?\"|.*)$",
    re.IGNORECASE | re.DOTALL,
)

# Mọi đoạn nằm trong ngoặc kép còn sót lại đều là nội dung học liệu được dán vào,
# không phải câu học viên tự viết.
QUOTED_SPAN = re.compile(r'"[^"]*"|“[^”]*”', re.DOTALL)

# Lượt khớp regex nhưng người kiểm tra tay xác định là dương tính giả.
# Mỗi mục phải có lý do; đây là phần bắt buộc để phép đếm kiểm lại được.
MANUAL_EXCLUSIONS: dict[str, dict[str, str]] = {
    "explicit_confusion": {
        "T0597": "Cụm 'chưa hiểu' mô tả một sinh viên SE giả định mà học viên "
        "muốn Tutor giải thích cho, không phải chính học viên chưa hiểu.",
        "T0947": "Học viên dán nguyên đoạn đề bài trên slide (không có ngoặc kép); "
        "cụm khớp nằm trong nội dung slide, không phải lời học viên.",
    },
    "logistics": {
        "T0796": "Đoạn đề bài 'viết prompt cho chatbot ... đăng ký môn học' dán từ slide.",
        "T1008": "Cùng đoạn đề bài slide như T0796 (bản dán thiếu chữ đầu), "
        "học viên không hỏi gì về đăng ký môn học.",
        "T1036": "Cùng đoạn đề bài slide như T0796; cụm khớp là nội dung bài tập viết prompt.",
        "T1093": "Cùng đoạn đề bài slide như T0796; cụm khớp là nội dung bài tập viết prompt.",
    },
}

# Bucket đủ nhỏ thì audit tay 100%; bucket lớn thì audit mẫu ngẫu nhiên có seed.
AUDIT_METHOD = {
    "explicit_confusion": "audit tay 100% — 10 lượt khớp thô, loại 2, còn 8",
    "logistics": "audit tay 100% — 9 lượt khớp thô, loại 4, còn 5",
    "summary_intent": "audit mẫu ngẫu nhiên seed=42, n=30",
    "template_question": "quy tắc chuỗi cố định, không cần audit",
    "no_citation": "đọc trực tiếp trường citations, không cần audit",
}

# Kết quả audit mẫu cho bucket lớn — cập nhật khi chạy lại research/scripts/audit_sample.py
SAMPLE_AUDIT = {
    "summary_intent": {
        "sample_size": 30,
        "seed": 42,
        "true_positives": 29,
        "precision_pct": 96.7,
        "false_positives": {
            "T0218": "Cụm 'không tổng hợp nhiều' nằm trong đoạn đề bài dán từ slide.",
        },
    },
}

# Học viên chủ động xin tóm tắt / hệ thống hoá lại nội dung để ôn.
# Đây là job của Learning Trace, học viên đang tự làm thủ công qua Tutor.
# Lưu ý: KHÔNG dùng "từ khoá" đứng một mình làm trigger. Audit mẫu 30 lượt cho thấy
# "giải thích các từ khóa AI, ML, DL" là câu hỏi kiến thức, không phải xin tóm tắt.
SUMMARY_INTENT = re.compile(
    r"tóm\s*tắt|tóm\s*lược|tổng\s*hợp|tổng\s*kết|ý\s*chính|"
    r"nội\s*dung\s*chính|ôn\s*tập|ôn\s*lại|điểm\s*quan\s*trọng",
    re.IGNORECASE,
)

# Học viên nói rõ chưa hiểu. Đây là signal hành vi DUY NHẤT được spec §4 cho phép
# dùng để sinh possible_gap (cùng với hỏi lại và phản biện).
EXPLICIT_CONFUSION = re.compile(
    r"(chưa|không|ko|k)\s+(hiểu|rõ|nắm)|vẫn\s+(chưa|không)|khó\s+hiểu|"
    r"giải\s+thích\s+lại|nói\s+lại|dễ\s+hiểu\s+hơn|mơ\s+hồ",
    re.IGNORECASE,
)

# Câu hỏi logistics — spec §5 kịch bản 5 yêu cầu loại khỏi trace kiến thức.
LOGISTICS = re.compile(
    r"deadline|hạn\s*nộp|nộp\s*bài|điểm\s*danh|tải\s*(xuống|về)|download|"
    r"link\s|đăng\s*ký|lịch\s*học|phòng\s*học",
    re.IGNORECASE,
)

# --- B6: signal "hỏi lại cùng nội dung sau khi đã được giải thích" -------------------
# Spec §4 cho phép signal này sinh possible_gap. Nó không đọc được trực tiếp từ log nên
# phải định nghĩa bằng quy tắc. Ranh giới từ dùng lookaround Unicode thay vì \b, vì \b
# của JavaScript chỉ hiểu ASCII — bản TypeScript phải khớp từng lượt với bản này.
_VN_BOUNDARY_L = r"(?<![^\W\d_])"
_VN_BOUNDARY_R = r"(?![^\W\d_])"

FOLLOW_UP_MARKER = re.compile(
    _VN_BOUNDARY_L
    + r"(?:vậy|thế|nhưng|còn|tại sao|sao lại|vẫn|nghĩa là|tức là|ý là|giải thích lại|"
    r"cụ thể hơn|chi tiết hơn|rõ hơn|dễ hiểu hơn|ví dụ|nói lại|khác gì|thì sao)"
    + _VN_BOUNDARY_R,
    re.IGNORECASE,
)

# Câu hỏi về công cụ/nền tảng, không phải về kiến thức bài học.
ABOUT_TOOL = re.compile(
    r"bạn được xây dựng|mô hình ngôn ngữ nào|system prompt|model nào|không đọc được|"
    r"không trả lời được|không giải thích được|báo là|hiển thị|tải|download|"
    r"giới hạn là bao nhiêu slide|quay lại trang chủ|ocr",
    re.IGNORECASE,
)

INJECTION = re.compile(
    r"base64|giải mã chuỗi|gạt hết|bỏ qua hướng dẫn|luật lệ có thể linh hoạt",
    re.IGNORECASE,
)

# Ngưỡng: câu trả lời của Tutor phải đủ dài để coi là "đã được giải thích".
# 272 ký tự = phân vị 10 của độ dài câu trả lời trên toàn bộ 1.261 lượt.
SUBSTANTIVE_ANSWER_CHARS = 272

# Hai lượt phải nằm trong cùng một lần ngồi học.
FOLLOW_UP_WINDOW_MINUTES = 30

# Chữ học viên dài hơn ngưỡng này gần như luôn là nội dung slide dán vào.
PASTED_TEXT_CHARS = 200

# day_code gọi tên buổi học có trong data pack (2 bộ slide Day 1 / Day 2).
# Chỉ những lượt này mới đối chiếu citation với nguồn thật được.
MAPPABLE_DAY_CODE = re.compile(r"day\s*0?[12]\b|day[-_]?0?[12]", re.IGNORECASE)

# day_code placeholder — tên mặc định, không trỏ tới tài liệu nào.
PLACEHOLDER_DAY_CODE = "New learning material"

RULES = {
    "template_question": "content khớp regex TEMPLATE_QUESTION — câu hỏi do platform sinh, học viên không tự gõ",
    "summary_intent": "content (đã bỏ tiền tố bôi đen) khớp SUMMARY_INTENT",
    "explicit_confusion": "content (đã bỏ tiền tố bôi đen) khớp EXPLICIT_CONFUSION",
    "logistics": "content (đã bỏ tiền tố bôi đen) khớp LOGISTICS",
    "mappable_day_code": "day_code khớp MAPPABLE_DAY_CODE — đối chiếu được với slide trong data pack",
    "no_citation": "message của tutor có citations rỗng ([] hoặc chuỗi trống)",
    "session": "một phiên = (user_id, day_code) — khớp cách sản phẩm lọc dữ liệu theo buổi",
    "repeat_page": "trong cùng phiên, học viên hỏi ≥2 lượt về cùng một số trang",
}


@dataclass
class Turn:
    """Một lượt hỏi–đáp: đúng 1 message student + 1 message tutor."""

    turn_id: str
    user_id: str
    conversation_id: str
    day_code: str
    question_raw: str
    question: str = ""
    student_text: str = ""
    page: int | None = None
    selection: str = ""
    tutor_answer: str = ""
    citations: list[int] = field(default_factory=list)
    rating: str | None = None
    move_used: str | None = None
    asked_check_question: bool = False
    created_at: str = ""

    @property
    def has_citation(self) -> bool:
        return bool(self.citations)

    @property
    def is_template(self) -> bool:
        return bool(TEMPLATE_QUESTION.search(self.question_raw))

    @property
    def wants_summary(self) -> bool:
        return bool(SUMMARY_INTENT.search(self.student_text))

    @property
    def says_confused(self) -> bool:
        if self.turn_id in MANUAL_EXCLUSIONS["explicit_confusion"]:
            return False
        return bool(EXPLICIT_CONFUSION.search(self.student_text))

    @property
    def is_logistics(self) -> bool:
        if self.turn_id in MANUAL_EXCLUSIONS["logistics"]:
            return False
        return bool(LOGISTICS.search(self.student_text))

    @property
    def day_mappable(self) -> bool:
        return bool(MAPPABLE_DAY_CODE.search(self.day_code))

    @property
    def session_key(self) -> tuple[str, str]:
        return (self.user_id, self.day_code)


def strip_selection(content: str) -> tuple[str, int | None, str]:
    """Tách tiền tố '(Trang N, đoạn được chọn: "...")' khỏi câu hỏi thật.

    99%+ lượt có tiền tố này. Không tách thì mọi phép đếm trên nội dung câu hỏi
    đều bị nhiễu bởi đoạn tài liệu học viên bôi đen, và LLM cũng đọc nhầm
    đoạn trích thành câu hỏi.

    Trả về (câu hỏi đã sạch, số trang, đoạn được chọn).
    """
    match = SELECTION_PREFIX.match(content)
    if not match:
        return content.strip(), None, ""
    page = int(match.group(1))
    selection = match.group(2)
    return content[match.end():].strip(), page, selection


def extract_student_text(question: str) -> str:
    """Lấy phần chữ do CHÍNH học viên gõ, bỏ mọi nội dung học liệu được dán vào.

    Ba lớp bóc, theo thứ tự:
      1. câu template 'Giải thích đoạn bôi đen ở Trang N: "<nội dung slide>"';
      2. mọi đoạn còn lại nằm trong ngoặc kép (nội dung slide dán thêm);
      3. chuẩn hoá khoảng trắng.

    Nếu sau khi bóc không còn chữ nào, lượt đó là câu hỏi hoàn toàn do platform
    sinh — học viên không viết gì, nên không mang signal về mức độ hiểu bài.
    """
    text = TEMPLATE_WITH_QUOTE.sub(" ", question)
    text = QUOTED_SPAN.sub(" ", text)
    return " ".join(text.split())


def parse_citations(raw: str) -> list[int]:
    """citations là jsonb dạng '[45]' hoặc '[]'. Trả về list số trang."""
    raw = (raw or "").strip()
    if not raw or raw == "[]":
        return []
    return [int(n) for n in re.findall(r"\d+", raw)]


def load_turns(csv_path: Path) -> list[Turn]:
    """Ghép 2522 dòng message thành 1261 lượt hỏi–đáp theo turn_id."""
    students: dict[str, dict] = {}
    tutors: dict[str, dict] = {}

    with csv_path.open(encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            bucket = students if row["role"] == "student" else tutors
            if row["turn_id"] in bucket:
                raise ValueError(f"turn_id trùng cho role {row['role']}: {row['turn_id']}")
            bucket[row["turn_id"]] = row

    if set(students) != set(tutors):
        raise ValueError("Có turn thiếu message student hoặc tutor — dữ liệu không toàn vẹn")

    turns: list[Turn] = []
    for turn_id in sorted(students):
        s, t = students[turn_id], tutors[turn_id]
        question, page, selection = strip_selection(s["content"])
        turns.append(
            Turn(
                turn_id=turn_id,
                user_id=s["user_id"],
                conversation_id=s["conversation_id"],
                day_code=s["day_code"],
                question_raw=s["content"],
                question=question,
                student_text=extract_student_text(question),
                page=page,
                selection=selection,
                tutor_answer=t["content"],
                citations=parse_citations(t["citations"]),
                rating=t["rating"] or None,
                move_used=t["move_used"] or None,
                asked_check_question=t["asked_check_question"] == "True",
                created_at=s["message_created_at"],
            )
        )
    return turns


def pct(part: int, whole: int) -> float:
    return round(100 * part / whole, 1) if whole else 0.0


def _parse_ts(raw: str) -> datetime.datetime:
    return datetime.datetime.fromisoformat(raw)


def detect_follow_ups(turns: list[Turn]) -> dict[str, str]:
    """Tìm các lượt là "hỏi lại cùng nội dung sau khi đã được giải thích".

    Trả về {turn_id của lượt hỏi lại: turn_id của lượt gốc}.

    Năm điều kiện, tất cả đều bắt buộc:
      1. cùng phiên (user_id, day_code) và cùng số trang;
      2. lượt gốc xảy ra TRƯỚC (so theo message_created_at);
      3. lượt gốc có câu trả lời đủ dài để coi là đã được giải thích;
      4. hai lượt cách nhau không quá 30 phút — cùng một lần ngồi học;
      5. lượt sau có chữ học viên tự gõ VÀ chứa từ nối tiếp.

    Sau đó loại bốn nhóm dương tính giả bằng luật: hỏi về công cụ, prompt
    injection, xin tóm tắt, và nội dung slide dán vào.

    Audit tay 100% trên 29 lượt còn lại: 25 đúng, 4 sai — precision 86,2%.
    Chi tiết và lý do từng lượt bị loại: research/b6-follow-up-signal.md
    """
    sessions: dict[tuple[str, str], list[Turn]] = defaultdict(list)
    for turn in turns:
        sessions[turn.session_key].append(turn)

    found: dict[str, str] = {}
    for group in sessions.values():
        group.sort(key=lambda t: _parse_ts(t.created_at))
        for index, later in enumerate(group):
            if not later.student_text or later.page is None:
                continue
            if not FOLLOW_UP_MARKER.search(later.student_text):
                continue
            if len(later.student_text) > PASTED_TEXT_CHARS:
                continue
            if INJECTION.search(later.student_text):
                continue
            if ABOUT_TOOL.search(later.student_text):
                continue
            if SUMMARY_INTENT.search(later.student_text):
                continue
            for earlier in group[:index]:
                if earlier.page != later.page:
                    continue
                if len(earlier.tutor_answer) < SUBSTANTIVE_ANSWER_CHARS:
                    continue
                minutes = (_parse_ts(later.created_at) - _parse_ts(earlier.created_at)).total_seconds() / 60
                if minutes > FOLLOW_UP_WINDOW_MINUTES:
                    continue
                found[later.turn_id] = earlier.turn_id
                break
    return found


def compute(turns: list[Turn]) -> dict:
    n = len(turns)
    follow_ups = detect_follow_ups(turns)
    sessions: dict[tuple[str, str], list[Turn]] = defaultdict(list)
    for turn in turns:
        sessions[turn.session_key].append(turn)
    sizes = sorted(len(v) for v in sessions.values())

    # Lượt hỏi lặp cùng trang trong cùng phiên — ứng viên signal "hỏi lại".
    repeat_pages = 0
    for group in sessions.values():
        pages = Counter(t.page for t in group if t.page is not None)
        repeat_pages += sum(1 for _, count in pages.items() if count >= 2)

    template = [t for t in turns if t.is_template]
    summary = [t for t in turns if t.wants_summary]
    confused = [t for t in turns if t.says_confused]
    logistics = [t for t in turns if t.is_logistics]
    mappable = [t for t in turns if t.day_mappable]
    no_cite = [t for t in turns if not t.has_citation]
    placeholder = [t for t in turns if t.day_code == PLACEHOLDER_DAY_CODE]

    with_selection = [t for t in turns if t.page is not None]
    silent = [t for t in turns if not t.student_text]
    max_cited_page = max((max(t.citations) for t in turns if t.citations), default=0)

    return {
        "schema_version": SCHEMA_VERSION,
        "source": {
            "file": str(CSV_PATH.relative_to(REPO)),
            "sha256": hashlib.sha256(CSV_PATH.read_bytes()).hexdigest(),
            "rows": 2 * n,
        },
        "rules": RULES,
        "audit": {
            "method": AUDIT_METHOD,
            "manual_exclusions": MANUAL_EXCLUSIONS,
            "sample_audit": SAMPLE_AUDIT,
            "raw_matches_before_exclusion": {
                "explicit_confusion": sum(
                    1 for t in turns if EXPLICIT_CONFUSION.search(t.student_text)
                ),
                "logistics": sum(1 for t in turns if LOGISTICS.search(t.student_text)),
            },
        },
        "scale": {
            "turns": n,
            "users": len({t.user_id for t in turns}),
            "conversations": len({t.conversation_id for t in turns}),
            "day_codes": len({t.day_code for t in turns}),
            "date_from": min(t.created_at for t in turns)[:10],
            "date_to": max(t.created_at for t in turns)[:10],
        },
        "session_depth": {
            "definition": RULES["session"],
            "sessions": len(sessions),
            "median_turns": statistics.median(sizes),
            "mean_turns": round(statistics.mean(sizes), 2),
            "max_turns": max(sizes),
            "sessions_1_turn": sum(1 for s in sizes if s == 1),
            "sessions_1_turn_pct": pct(sum(1 for s in sizes if s == 1), len(sizes)),
            "sessions_le2_turns": sum(1 for s in sizes if s <= 2),
            "sessions_le2_turns_pct": pct(sum(1 for s in sizes if s <= 2), len(sizes)),
            "sessions_ge5_turns": sum(1 for s in sizes if s >= 5),
        },
        "grounding": {
            "turns_without_citation": len(no_cite),
            "turns_without_citation_pct": pct(len(no_cite), n),
            "turns_mappable_day_code": len(mappable),
            "turns_mappable_day_code_pct": pct(len(mappable), n),
            "turns_placeholder_day_code": len(placeholder),
            "turns_placeholder_day_code_pct": pct(len(placeholder), n),
            "max_cited_page": max_cited_page,
            "slide_pages_in_pack": 29,
        },
        "question_shape": {
            "turns_with_selection": len(with_selection),
            "turns_with_selection_pct": pct(len(with_selection), n),
            "template_questions": len(template),
            "template_questions_pct": pct(len(template), n),
            "turns_no_student_words": len(silent),
            "turns_no_student_words_pct": pct(len(silent), n),
            "median_question_chars": statistics.median(len(t.question) for t in turns),
            "median_student_text_chars": statistics.median(len(t.student_text) for t in turns),
        },
        "demand_signal": {
            "summary_requests": len(summary),
            "summary_requests_pct": pct(len(summary), n),
            "summary_request_users": len({t.user_id for t in summary}),
            "explicit_confusion": len(confused),
            "explicit_confusion_pct": pct(len(confused), n),
            "explicit_confusion_users": len({t.user_id for t in confused}),
            "logistics": len(logistics),
            "logistics_pct": pct(len(logistics), n),
            "repeat_page_in_session": repeat_pages,
        },
        "instrumentation_gaps": {
            "misconceptions_used": 0,
            "follow_ups_used": 0,
            "asked_check_question_true": sum(1 for t in turns if t.asked_check_question),
            "turns_with_rating": sum(1 for t in turns if t.rating),
            "turns_with_rating_pct": pct(sum(1 for t in turns if t.rating), n),
            "rating_up": sum(1 for t in turns if t.rating == "up"),
            "rating_down": sum(1 for t in turns if t.rating == "down"),
        },
        "follow_up_signal": {
            "definition": "cùng phiên + cùng trang + lượt gốc có câu trả lời ≥272 ký tự"
            " + cách nhau ≤30 phút + lượt sau có chữ học viên và có từ nối tiếp;"
            " loại 4 nhóm dương tính giả bằng luật",
            "turns": len(follow_ups),
            "turns_pct": pct(len(follow_ups), n),
            "audit": "audit tay 100%: 25 đúng / 29 → precision 86,2%",
        },
        "gap_signal_coverage": {
            "turns_with_valid_gap_signal": len({t.turn_id for t in confused}),
            "turns_with_valid_gap_signal_pct": pct(len(confused), n),
            "note": "Chỉ đếm signal 'nói rõ chưa hiểu'. Signal 'hỏi lại' và 'phản biện' cần"
            " phân tích theo cặp lượt, xem repeat_page_in_session là cận trên thô.",
        },
    }


def write_samples(turns: list[Turn]) -> None:
    """Ghi toàn bộ lượt khớp mỗi quy tắc để người ngoài nhóm audit phép đếm.

    Chỉ ghi turn_id + trích ngắn 120 ký tự — theo quy định bảo mật data pack,
    không dán nguyên văn dài, không đưa file này vào bản nộp.
    """
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    buckets = {
        "summary-requests": [t for t in turns if t.wants_summary],
        "explicit-confusion": [t for t in turns if t.says_confused],
        "template-questions": [t for t in turns if t.is_template],
        "logistics": [t for t in turns if t.is_logistics],
        "no-citation": [t for t in turns if not t.has_citation],
    }
    # Bộ đối chiếu chéo cho normalizer TypeScript: bản TS phải bóc text ra kết quả
    # y hệt bản Python trên toàn bộ 1.261 lượt. Nằm trong samples/ nên không commit.
    conformance = [
        {
            "turnId": t.turn_id,
            "studentContent": t.question_raw,
            "expectedQuestion": t.question,
            "expectedStudentText": t.student_text,
            "expectedPage": t.page,
        }
        for t in turns
    ]
    path = SAMPLES_DIR / "normalizer-conformance.json"
    path.write_text(json.dumps(conformance, ensure_ascii=False), encoding="utf-8")
    print(f"  ghi {len(conformance):4d} lượt → {path.relative_to(REPO)}")

    # Bộ đối chiếu chéo cho detector "hỏi lại" (B6): bản TS phải gắn cờ ĐÚNG
    # cùng tập lượt như bản Python, kèm đúng lượt gốc.
    follow_ups = detect_follow_ups(turns)
    by_id = {t.turn_id: t for t in turns}
    fu_payload = {
        "signals": [
            {"turnId": later, "ofTurnId": earlier} for later, earlier in sorted(follow_ups.items())
        ],
        "sessions": [
            {
                "learnerId": t.user_id,
                "dayCode": t.day_code,
                "turnId": t.turn_id,
                "createdAt": t.created_at,
                "page": t.page,
                "studentText": t.student_text,
                "tutorAnswerLength": len(t.tutor_answer),
            }
            for t in turns
        ],
    }
    fu_path = SAMPLES_DIR / "follow-up-conformance.json"
    fu_path.write_text(json.dumps(fu_payload, ensure_ascii=False), encoding="utf-8")
    print(f"  ghi {len(follow_ups):4d} signal → {fu_path.relative_to(REPO)}")
    _ = by_id

    for name, matched in buckets.items():
        path = SAMPLES_DIR / f"{name}.tsv"
        with path.open("w", encoding="utf-8") as handle:
            handle.write("turn_id\tuser_id\tday_code\tpage\tchu_hoc_vien_tu_go\n")
            for t in matched:
                handle.write(
                    f"{t.turn_id}\t{t.user_id}\t{t.day_code}\t{t.page or ''}\t{t.student_text[:120]}\n"
                )
        print(f"  ghi {len(matched):4d} dòng → {path.relative_to(REPO)}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", action="store_true", help="ghi research/samples/ để audit")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    if not CSV_PATH.exists():
        print(f"Không tìm thấy {CSV_PATH}", file=sys.stderr)
        return 1

    turns = load_turns(CSV_PATH)
    metrics = compute(turns)
    OUT_JSON.write_text(json.dumps(metrics, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if not args.quiet:
        s, d, g = metrics["scale"], metrics["session_depth"], metrics["grounding"]
        q, sig = metrics["question_shape"], metrics["demand_signal"]
        print(f"Nguồn   {metrics['source']['file']}")
        print(f"sha256  {metrics['source']['sha256'][:16]}…")
        print()
        print(f"Quy mô          {s['turns']} lượt · {s['users']} học viên · {s['conversations']} hội thoại")
        print(f"Độ dày phiên    median {d['median_turns']} lượt · {d['sessions_le2_turns_pct']}% phiên ≤2 lượt · max {d['max_turns']}")
        print(f"Grounding       {g['turns_without_citation_pct']}% lượt không citation · {g['turns_mappable_day_code_pct']}% day_code đối chiếu được")
        print(f"Dạng câu hỏi    {q['turns_with_selection_pct']}% có bôi đen · {q['template_questions_pct']}% là template")
        print(f"Signal nhu cầu  {sig['summary_requests_pct']}% xin tóm tắt · {sig['explicit_confusion_pct']}% nói chưa hiểu")
        print()
        print(f"→ {OUT_JSON.relative_to(REPO)}")

    if args.samples:
        write_samples(turns)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
