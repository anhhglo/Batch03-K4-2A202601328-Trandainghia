#!/usr/bin/env python3
"""Test cho tầng mining evidence.

Chạy:
    python3 research/scripts/test_mine_chatlog.py

Ba nhóm test:
  1. Toàn vẹn dữ liệu — chatlog đúng như mô tả trong DATA_DICTIONARY.
  2. Đúng đắn của hàm — tách tiền tố bôi đen, bóc nội dung slide, parse citation.
  3. Khoá số liệu — mọi con số đang trích dẫn trong research/mining-log.md.

Nhóm 3 là lưới an toàn: sửa regex hay đổi data mà quên cập nhật mining-log.md
thì test đỏ ngay, không để số sai lọt vào bài nộp.

Owner: Phó Hiếu Anh (Data & Evidence).
"""

from __future__ import annotations

import json
import re
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from mine_chatlog import (  # noqa: E402
    CSV_PATH,
    MANUAL_EXCLUSIONS,
    RECALL_AUDIT,
    SUMMARY_INTENT,
    OUT_JSON,
    REPO,
    compute,
    extract_student_text,
    load_turns,
    parse_citations,
    strip_selection,
)

# Ảnh chụp dữ liệu mà mọi con số đang dựa vào. Đổi file CSV thì hash đổi và
# test này đỏ — buộc phải chạy lại mining và cập nhật mining-log.md.
EXPECTED_SHA256 = "400ce4ce5c1c5818"  # 16 ký tự đầu

# Mọi con số đang được trích dẫn trong research/mining-log.md.
EXPECTED_METRICS = {
    ("scale", "turns"): 1261,
    ("scale", "users"): 369,
    ("scale", "conversations"): 585,
    ("session_depth", "sessions"): 563,
    ("session_depth", "median_turns"): 1,
    ("session_depth", "sessions_1_turn"): 292,
    ("session_depth", "sessions_1_turn_pct"): 51.9,
    ("session_depth", "sessions_le2_turns_pct"): 74.4,
    ("session_depth", "max_turns"): 30,
    ("session_depth", "sessions_ge5_turns"): 50,
    ("grounding", "turns_without_citation"): 582,
    ("grounding", "turns_without_citation_pct"): 46.2,
    ("grounding", "turns_mappable_day_code"): 108,
    ("grounding", "turns_mappable_day_code_pct"): 8.6,
    ("grounding", "turns_placeholder_day_code"): 397,
    ("grounding", "turns_placeholder_day_code_pct"): 31.5,
    ("grounding", "max_cited_page"): 96,
    ("question_shape", "turns_with_selection_pct"): 99.3,
    ("question_shape", "template_questions"): 357,
    ("question_shape", "template_questions_pct"): 28.3,
    ("demand_signal", "summary_requests"): 134,
    ("demand_signal", "summary_requests_pct"): 10.6,
    ("demand_signal", "summary_request_users"): 94,
    ("demand_signal", "explicit_confusion"): 8,
    ("demand_signal", "logistics"): 5,
    ("instrumentation_gaps", "misconceptions_used"): 0,
    ("instrumentation_gaps", "follow_ups_used"): 0,
    ("instrumentation_gaps", "asked_check_question_true"): 3,
    ("instrumentation_gaps", "rating_down"): 37,
    ("instrumentation_gaps", "rating_up"): 33,
}

_results: list[tuple[str, bool, str]] = []


def check(name: str):
    def decorator(fn):
        try:
            fn()
            _results.append((name, True, ""))
        except AssertionError as exc:
            _results.append((name, False, str(exc)))
        except Exception:  # noqa: BLE001
            _results.append((name, False, traceback.format_exc(limit=2)))
        return fn

    return decorator


TURNS = load_turns(CSV_PATH)
METRICS = compute(TURNS)


# ----------------------------------------------------------------------------------
# 1. Toàn vẹn dữ liệu
# ----------------------------------------------------------------------------------


@check("data: đúng 1261 lượt, mỗi lượt đúng 2 message")
def _():
    assert len(TURNS) == 1261, f"có {len(TURNS)} lượt"
    assert len({t.turn_id for t in TURNS}) == 1261, "turn_id không duy nhất"


@check("data: sha256 của CSV khớp bản đã dùng để chốt số")
def _():
    got = METRICS["source"]["sha256"][:16]
    assert got == EXPECTED_SHA256, (
        f"CSV đã đổi: {got} != {EXPECTED_SHA256}. "
        "Chạy lại mine_chatlog.py và cập nhật mining-log.md + EXPECTED_METRICS."
    )


@check("data: mọi turn có user_id, day_code, câu hỏi không rỗng")
def _():
    for t in TURNS:
        assert t.user_id and t.user_id.startswith("U"), f"{t.turn_id}: user_id lạ"
        assert t.day_code, f"{t.turn_id}: thiếu day_code"
        assert t.question_raw.strip(), f"{t.turn_id}: câu hỏi rỗng"


@check("data: ID đã ẩn danh đúng định dạng U/C/T")
def _():
    for t in TURNS[:200]:
        assert re.fullmatch(r"U\d{4}", t.user_id), t.user_id
        assert re.fullmatch(r"C\d{4}", t.conversation_id), t.conversation_id
        assert re.fullmatch(r"T\d{4}", t.turn_id), t.turn_id


@check("data: citation không bao giờ âm, trang tối đa vượt 29 trang của pack")
def _():
    for t in TURNS:
        assert all(p >= 0 for p in t.citations), f"{t.turn_id}: trang âm"
    assert METRICS["grounding"]["max_cited_page"] > 29, (
        "Nếu trang tối đa ≤29 thì giả định 'nhiều tài liệu nằm ngoài pack' sai — "
        "phải viết lại phần grounding của mining-log.md"
    )


# ----------------------------------------------------------------------------------
# 2. Đúng đắn của hàm
# ----------------------------------------------------------------------------------


@check("strip_selection: tách đúng số trang và đoạn được chọn")
def _():
    q, page, sel = strip_selection('(Trang 17, đoạn được chọn: "Perception") Giải thích đi')
    assert page == 17, page
    assert sel == "Perception", sel
    assert q == "Giải thích đi", repr(q)


@check("strip_selection: không có tiền tố thì giữ nguyên")
def _():
    q, page, sel = strip_selection("tóm tắt slide này")
    assert (q, page, sel) == ("tóm tắt slide này", None, "")


@check("strip_selection: đoạn chọn nhiều dòng vẫn tách được")
def _():
    q, page, _ = strip_selection('(Trang 3, đoạn được chọn: "dòng 1\ndòng 2") hỏi gì đó')
    assert page == 3 and q == "hỏi gì đó", (page, q)


@check("extract_student_text: bỏ câu template và nội dung slide trong ngoặc kép")
def _():
    assert extract_student_text('Giải thích đoạn bôi đen ở Trang 41: "Othello-GPT"') == ""
    assert extract_student_text("Giải thích đoạn bôi đen ở Trang 17.") == ""


@check("extract_student_text: giữ nguyên chữ học viên tự gõ")
def _():
    assert extract_student_text("tôi chưa hiểu tại sao") == "tôi chưa hiểu tại sao"


@check("extract_student_text: chặn được lỗi khớp nhầm vào chữ trên slide")
def _():
    # Đây chính là lỗi đã bắt ở lượt audit 1: cụm 'đăng ký môn học' nằm trong
    # đề bài trên slide, không phải học viên hỏi về đăng ký môn.
    pasted = 'Giải thích đoạn bôi đen ở Trang 17: "viết prompt cho chatbot đăng ký môn học"'
    assert "đăng ký" not in extract_student_text(pasted)


@check("parse_citations: đọc đúng list rỗng và list nhiều trang")
def _():
    assert parse_citations("[]") == []
    assert parse_citations("") == []
    assert parse_citations("[45]") == [45]
    assert parse_citations("[36, 44]") == [36, 44]


@check("loại trừ tay: mọi turn_id trong MANUAL_EXCLUSIONS đều tồn tại thật")
def _():
    ids = {t.turn_id for t in TURNS}
    for rule, entries in MANUAL_EXCLUSIONS.items():
        for turn_id, reason in entries.items():
            assert turn_id in ids, f"{rule}: {turn_id} không có trong chatlog"
            assert len(reason) > 20, f"{rule}/{turn_id}: lý do loại quá sơ sài"


@check("loại trừ tay: các turn bị loại thực sự khớp regex trước khi loại")
def _():
    from mine_chatlog import EXPLICIT_CONFUSION, LOGISTICS

    by_id = {t.turn_id: t for t in TURNS}
    for turn_id in MANUAL_EXCLUSIONS["explicit_confusion"]:
        assert EXPLICIT_CONFUSION.search(by_id[turn_id].student_text), (
            f"{turn_id} không khớp regex — loại trừ này thừa, phải xoá khỏi MANUAL_EXCLUSIONS"
        )
    for turn_id in MANUAL_EXCLUSIONS["logistics"]:
        assert LOGISTICS.search(by_id[turn_id].student_text), f"{turn_id} loại trừ thừa"


# ----------------------------------------------------------------------------------
# 3. Khoá số liệu đang trích dẫn trong mining-log.md
# ----------------------------------------------------------------------------------


@check("metrics: mọi con số trích dẫn trong mining-log.md vẫn đúng")
def _():
    sai = []
    for (section, key), expected in EXPECTED_METRICS.items():
        got = METRICS[section][key]
        if got != expected:
            sai.append(f"{section}.{key}: mining-log ghi {expected}, tính ra {got}")
    assert not sai, "\n      ".join([""] + sai)


@check("metrics: các phần trăm nhất quán với số đếm")
def _():
    n = METRICS["scale"]["turns"]
    pairs = [
        ("grounding", "turns_without_citation", "turns_without_citation_pct"),
        ("grounding", "turns_mappable_day_code", "turns_mappable_day_code_pct"),
        ("question_shape", "template_questions", "template_questions_pct"),
        ("demand_signal", "summary_requests", "summary_requests_pct"),
    ]
    for section, count_key, pct_key in pairs:
        count = METRICS[section][count_key]
        expected = round(100 * count / n, 1)
        assert METRICS[section][pct_key] == expected, (
            f"{section}.{pct_key} = {METRICS[section][pct_key]} nhưng {count}/{n} = {expected}"
        )


@check("metrics: tổng số phiên không vượt quá số lượt")
def _():
    assert METRICS["session_depth"]["sessions"] <= METRICS["scale"]["turns"]
    assert METRICS["session_depth"]["sessions_1_turn"] <= METRICS["session_depth"]["sessions"]


@check("metrics: signal gap hợp lệ phải hiếm hơn nhiều so với số phiên")
def _():
    # Đây là ràng buộc thiết kế, không phải ràng buộc dữ liệu: nếu số lượt có
    # signal gap hợp lệ mà vượt 20% tổng lượt thì giả định trung tâm của
    # Learning Trace ("signal rất thưa") sai và phải thiết kế lại nhánh mặc định.
    ratio = METRICS["demand_signal"]["explicit_confusion"] / METRICS["scale"]["turns"]
    assert ratio < 0.20, f"signal gap chiếm {ratio:.1%} — xem lại giả định thiết kế"


@check("metrics: metrics.json trên đĩa khớp với kết quả tính lại")
def _():
    assert OUT_JSON.exists(), "chưa chạy mine_chatlog.py"
    on_disk = json.loads(OUT_JSON.read_text(encoding="utf-8"))
    for section in ("scale", "session_depth", "grounding", "demand_signal"):
        assert on_disk[section] == METRICS[section], (
            f"metrics.json cũ ở mục {section} — chạy lại mine_chatlog.py"
        )


@check("mining-log.md: mọi turn_id được trích dẫn đều tồn tại thật")
def _():
    doc = REPO / "research/mining-log.md"
    if not doc.exists():
        return  # chưa viết thì bỏ qua
    ids = {t.turn_id for t in TURNS}
    cited = set(re.findall(r"\b(T\d{4})\b", doc.read_text(encoding="utf-8")))
    missing = sorted(cited - ids)
    assert not missing, f"trích dẫn turn_id không tồn tại: {missing}"


@check("mining-log.md: không dán nguyên văn dài từ data pack")
def _():
    doc = REPO / "research/mining-log.md"
    if not doc.exists():
        return
    # Chỉ soát trong blockquote — nơi đặt trích dẫn nguyên văn. Quét cả file sẽ
    # bắt nhầm các cặp ngoặc kép nằm rải rác ở bảng và đoạn văn.
    for line in doc.read_text(encoding="utf-8").splitlines():
        if not line.lstrip().startswith(">"):
            continue
        for quote in re.findall(r"[“\"]([^”\"]+)[”\"]", line):
            assert len(quote) <= 200, (
                f"Trích dẫn dài {len(quote)} ký tự — quy định data pack yêu cầu trích ngắn: "
                f"{quote[:60]}…"
            )


@check("mining-log.md: mọi trích dẫn nguyên văn khớp đúng chữ học viên đã gõ")
def _():
    doc = REPO / "research/mining-log.md"
    if not doc.exists():
        return
    by_id = {t.turn_id: t for t in TURNS}
    quotes = re.findall(r'>\s*[“"](.+?)[”"]\s*—\s*`(T\d{4})`', doc.read_text(encoding="utf-8"))
    assert len(quotes) >= 5, f"Chuẩn B đòi ≥5 ví dụ nguyên văn, mới có {len(quotes)}"
    for quote, turn_id in quotes:
        # Bỏ dấu … đánh dấu chỗ cắt bớt ở đầu/cuối trích dẫn.
        needle = quote.strip().strip("…").strip()
        haystack = by_id[turn_id].student_text
        assert needle in haystack, (
            f"{turn_id}: trích dẫn trong mining-log không khớp chatlog.\n"
            f"        doc : {needle[:70]}\n"
            f"        thật: {haystack[:70]}"
        )


@check("recall: mọi turn_id trong RECALL_AUDIT đều tồn tại và có lý do rõ")
def _():
    ids = {t.turn_id for t in TURNS}
    audit = RECALL_AUDIT["summary_intent"]
    for turn_id, reason in audit["false_negatives_before_fix"].items():
        assert turn_id in ids, f"{turn_id} không có trong chatlog"
        assert len(reason) > 25, f"{turn_id}: lý do quá sơ sài"
    for turn_id in audit["fixed_by_unaccented_variants"]:
        assert turn_id in ids, f"{turn_id} không có trong chatlog"


@check("recall: các lượt khai là 'đã sửa nhờ bản không dấu' giờ phải khớp thật")
def _():
    by_id = {t.turn_id: t for t in TURNS}
    for turn_id in RECALL_AUDIT["summary_intent"]["fixed_by_unaccented_variants"]:
        assert SUMMARY_INTENT.search(by_id[turn_id].student_text), (
            f"{turn_id} vẫn không khớp — khai đã sửa nhưng chưa sửa được"
        )


@check("recall: bộ đếm bao trọn các lượt đã sửa, không đếm hụt")
def _():
    fixed = RECALL_AUDIT["summary_intent"]["fixed_by_unaccented_variants"]
    matched = {t.turn_id for t in TURNS if t.wants_summary}
    missing = [t for t in fixed if t not in matched]
    assert not missing, f"khai đã bắt được nhưng thực tế vẫn sót: {missing}"


def main() -> int:
    passed = sum(1 for _, ok, _ in _results if ok)
    for name, ok, detail in _results:
        print(f"  {'PASS' if ok else 'FAIL'}  {name}")
        if not ok:
            print(f"      {detail}")
    print()
    print(f"{passed}/{len(_results)} test qua")
    return 0 if passed == len(_results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
